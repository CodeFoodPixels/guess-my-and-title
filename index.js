const { createEventAdapter } = require('@slack/events-api');
const { WebClient } = require('@slack/web-api');

const token = process.env.SLACK_BOT_TOKEN;
const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;

const slackEvents = createEventAdapter(slackSigningSecret);

const web = new WebClient(token);

const port = process.env.PORT || 3000;

const challenges = {};

slackEvents.on('message', async (event) => {
    if (event.bot_id) {
        return;
    }

    const currentUser = event.user;
    
    if (event.text.toLowerCase() === "help") {
        return sendMessage('Messages must be in the format `challenge @name "title" "emojis"` e.g `challenge @luke "photography enthusiast" "📷😁"`', event.channel);
    }

    const match = event.text.match(/^challenge <@(.+?)> "(.+?)" "(.+?)"/);

    if (!match) {
        //assume that they're trying to answer
        const challenge = challenges[currentUser];
        if (!challenge) {
            sendMessage(`You don't currently have a challenge set`, currentUser);
        } else if (challenge.answer.toLowerCase() === event.text.toLowerCase()) {
            sendMessage(`Correct!`, currentUser);
            sendMessage(`<@${currentUser}> guessed your AND title!`, challenge.from);
            challenges[currentUser] = undefined;
        } else {
            sendMessage(`Wrong, please try again`, currentUser);
        }

        return;
    }

    challenges[match[1]] = {
        answer: match[2],
        from: currentUser
    };

    sendMessage(`<@${currentUser}> has challenged you to guess their AND title. Their hint is ${match[3]}`, match[1]);
});

async function sendMessage(text, channel) {
    try {
        // Send a welcome message to the same channel where the new member just joined, and mention the user.
        const reply = await web.chat.postMessage({
            text,
            channel
        });
        console.log('Message sent successfully', reply.ts);
    } catch (error) {
        console.log('An error occurred', error);
    }
}

(async () => {
  // Start the built-in server
  const server = await slackEvents.start(port);

  // Log a message when the server is ready
  console.log(`Listening for events on ${server.address().port}`);
})();
