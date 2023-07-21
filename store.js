import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { loadQARefineChain } from 'langchain/chains';
import { OpenAI } from "langchain/llms/openai";
import * as dotenv from "dotenv";

dotenv.config();
const openAIApiKey = process.env.OPENAI_API_KEY;

// Create the models
const embeddings = new OpenAIEmbeddings({openAIApiKey});

let chain;
let store;

export const loadDocs = async () => {
  const loader = new DirectoryLoader("./documents", {
    ".txt": (path) => new TextLoader(path),
    ".pdf": (path) => new PDFLoader(path),
  });
  const docs = await loader.load();
  store = await MemoryVectorStore.fromDocuments(docs, embeddings);
  
  const model = new OpenAI({openAIApiKey, temperature: 0 });
  
  chain = loadQARefineChain(model);
}

export const searchDocs = async (question) => {
  const relevantDocs = await store.similaritySearch(question);

  // Call the chain
  const res = await chain.call({
    input_documents: relevantDocs,
    question,
  });

  return res.output_text;
}