import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "langchain/llms/openai";
import { loadQAStuffChain } from "langchain/chains";
import { Document } from "langchain/document";

export const queryPineconeVectorStoreAndQueryLLM = async (
    client,
    indexName,
    question
) => {
    console.log("Querying Pinecone vector store...");

    const index = client.Index(indexName);
    const queryEmbedding = await new OpenAIEmbeddings().embedQuery(question);

    let queryResponse = await index.query({
        queryRequest: {
            topK: 10,
            vector: queryEmbedding,
            includeMetadata: true,
            includeValues: true,
        },
    });

    console.log(`Found ${queryResponse.matches.length} matches...`);
    console.log(`Asking question: ${question}...`);

    if (queryResponse.matches.length) {
        const llm = new OpenAI({});
        const chain = loadQAStuffChain(llm);

        const concatenatedPageContent = queryResponse.matches
            .map((match) => match.metadata.pageContent)
            .join(" ");

        const result = await chain.call({
            input_documents: [new Document({ pageContent: concatenatedPageContent })],
            question: question,
        });

        return result.text;
    } else {
        console.log("Since there are no matches, GPT will not be queried.");
    }
};
