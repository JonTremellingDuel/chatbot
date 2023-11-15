import * as dotenv from "dotenv";
import { loadDocs, searchDocs, dropDocs } from "./store.js";
import Slack from "@slack/bolt";

dotenv.config();
const DUEL_BOT_NAME = '<@U05FE5NFS4F>';

const app = new Slack.App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.APP_TOKEN,
});

const handleCommand = async (command, say) => {
    if (command === "update") {
        say("Updating...")
        await loadDocs();
        say("Data store updated.")
    }
    else if (command === "clear") {
        say("Deleting all docs...")
        await dropDocs();
        say("Data store cleared.")
    }
    else if (command) {
        say("...")
        const result = await searchDocs(command);

        if (! result) {
            say("Sorry, I don't know the answer to that question")
        }
        else {
            say(result);
        }
    }
}

app.event('message', async ({ event, context, client, say }) => {
    if (! event.hidden && (event.channel_type === 'im' || event.text.includes(DUEL_BOT_NAME))) {
        const command = event.text.replace('<@U05FE5NFS4F> ', '');
        try {
          await handleCommand(command, say);
        }
        catch (error) {
          console.error(error);
        }
    }
});

(async () => {
    await app.start(3000);
    console.log('Bolt app started!!');
})();
