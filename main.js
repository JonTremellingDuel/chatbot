import { PineconeClient } from "@pinecone-database/pinecone";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import * as dotenv from "dotenv";
import { createPineconeIndex } from "./createPineconeIndex.js";
import { updatePinecone } from "./updatePinecone.js";
import { queryPineconeVectorStoreAndQueryLLM } from "./queryPineconeAndQueryGPT.js";
import * as readline from "readline";

import Slack from "@slack/bolt";

dotenv.config();

const loader = new DirectoryLoader("./documents", {
    ".txt": (path) => new TextLoader(path),
    ".pdf": (path) => new PDFLoader(path),
});
const docs = await loader.load();
const indexName = "your-pinecone-index-name";
const vectorDimension = 1536;
const client = new PineconeClient();

await client.init({
  apiKey: process.env.PINECONE_API_KEY,
  environment: process.env.PINECONE_ENVIRONMENT,
});

await createPineconeIndex(client, indexName, vectorDimension);

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

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
            await updatePinecone(client, indexName, docs);
            say("Data store updated.")
        }
        else {
            say("...")
            const result = await queryPineconeVectorStoreAndQueryLLM(client, indexName, command);

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
