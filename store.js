import * as dotenv from "dotenv";
import { createClient } from "redis";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { loadQARefineChain } from 'langchain/chains';
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RedisVectorStore } from "langchain/vectorstores/redis";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { createDocs, deleteDocs } from "./scrape.js";

const INDEX_NAME = "docs";

dotenv.config();
const openAIApiKey = process.env.OPENAI_API_KEY;
const model = new OpenAI({ openAIApiKey, temperature: 0 });
const chain = loadQARefineChain(model);
let redis;

const client = createClient({
  url: process.env.REDIS_URL,
});
await client.connect();

const getDocuments = async () => {
  await deleteDocs('./hubspot-documents');
  await createDocs();
  const loader = new DirectoryLoader("./hubspot-documents", {
    ".txt": (path) => new TextLoader(path),
    ".pdf": (path) => new PDFLoader(path),
  });
  const docs = await loader.load();
  await deleteDocs('./hubspot-documents');
  return docs;
}

const createVectorStore = async (docs) => {
  if (docs) {
    return RedisVectorStore.fromDocuments(
      docs,
      new OpenAIEmbeddings(),
      {
        redisClient: client,
        indexName: INDEX_NAME,
      }
    )
  }

  return new RedisVectorStore(new OpenAIEmbeddings(), {
    redisClient: client,
    indexName: INDEX_NAME,
  });
}

export const loadDocs = async () => {
  const docs = await getDocuments();
  redis = await createVectorStore(docs);
}

export const searchDocs = async (question) => {
  const relevantDocs = question && await redis.similaritySearch(question);
  const mostRelevantDoc = relevantDocs?.[0];

  if (! mostRelevantDoc) {
    return 'Sorry, we have no information around this topic.'
  }

  // Call the chain
  const res = await chain.call({
    input_documents: [mostRelevantDoc],
    question,
  });

  const furtherReadingLink = `https://info.duel.tech/help/${mostRelevantDoc.metadata.source.split("/").pop().split('.')[0]}`;

  res.output_text = res.output_text.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|").filter(it => it.match(/\r|\n|\./)).join();
  return res.output_text.concat(`\n\nFurther reading:\n${furtherReadingLink}`);
}

redis = await createVectorStore();