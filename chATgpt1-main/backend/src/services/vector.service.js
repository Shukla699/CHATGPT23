const { Pinecone } = require('@pinecone-database/pinecone')


const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const chatgptIndex = pc.Index('chat-gpt');

async function createMemory({vectors,messageId,metadata}){

await chatgptIndex.upsert([{
  id: messageId,
  values: vectors,
  metadata,
}])

}


async function queryMemory({queryVector, limit=5,metadata}){
    const data = await chatgptIndex.query({
        vector: queryVector,
        topK: limit,
        filter: metadata ?  metadata  : undefined,
        includeMetadata: true
    })

    return data.matches;

}


module.exports = {
    createMemory,
    queryMemory
}