import * as dotenv from "dotenv";
import { loadDocs, searchDocs } from "./store.js";
import Slack from "@slack/bolt";

dotenv.config();

const app = new Slack.App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.APP_TOKEN,
});

app.message(async ({ message, say }) => {
    try {
        const command = message.text;

        if (command === "update") {
            say("Updating...")
            await loadDocs();
            say("Data store updated.")
        }
        else {
            say("...")
            const result = await searchDocs(command);

            if (! result) {
                say("Sorry, I don't know the answer to that question")
            }
            else {
                say(result);
            }
        }
    } catch (error) {
        console.error(error);
    }
});

(async () => {
    await app.start(3000);
    console.log('Bolt app started!!');
})();
