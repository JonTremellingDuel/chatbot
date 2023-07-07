import { PineconeClient } from "@pinecone-database/pinecone";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import * as dotenv from "dotenv";
import { createPineconeIndex } from "./createPineconeIndex.js";
import { updatePinecone } from "./updatePinecone.js";
import { queryPineconeVectorStoreAndQueryLLM } from "./queryPineconeAndQueryGPT.js";

import * as readline from "readline";


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

(async () => {
    await createPineconeIndex(client, indexName, vectorDimension);

    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    var waitForUserInput = function() {
        rl.question("Command: ", async function(command) {
          if (command == "exit"){
              rl.close();
          } else {
                if (command === "update") {
                    await updatePinecone(client, indexName, docs);
                    await waitForUserInput();
                }
                else {
                    await queryPineconeVectorStoreAndQueryLLM(client, indexName, command);
                    await waitForUserInput();
                }
          }
        });
    }

    await waitForUserInput();
})();
