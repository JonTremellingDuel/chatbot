import * as dotenv from "dotenv";
import { createClient } from "redis";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { loadQARefineChain } from 'langchain/chains';
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RedisVectorStore } from "langchain/vectorstores/redis";
import { TextLoader } from "langchain/document_loaders/fs/text";

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
  const loader = new DirectoryLoader("./documents", {
    ".txt": (path) => new TextLoader(path),
    ".pdf": (path) => new PDFLoader(path),
  });
  return loader.load();
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
  const relevantDocs = await redis.similaritySearch(question);

  // Call the chain
  const res = await chain.call({
    input_documents: relevantDocs,
    question,
  });

  return res.output_text;
}

redis = await createVectorStore();