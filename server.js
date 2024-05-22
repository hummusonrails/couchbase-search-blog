const express = require('express');
const couchbase = require('couchbase');
const cors = require('cors');
const openai = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());

const openaiclient = new openai({apiKey: process.env.OPENAI_API_KEY});

let cluster;
async function init() {
  if (!cluster) {
    cluster = await couchbase.connect(process.env.COUCHBASE_URL, {
      username: process.env.COUCHBASE_USERNAME,
      password: process.env.COUCHBASE_PASSWORD,
      configProfile: "wanDevelopment",
    });
  }
  return cluster;
}

/**
 * Generates an embedding for the given query using the OpenAI client.
 * 
 * @param {string} query - The query for which the embedding needs to be generated.
 * @returns {string} The embedding generated for the query.
 */
async function generateQueryEmbedding(query) {
  const response = await openaiclient.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
  });
  return response.data[0].embedding;
}

/**
 * Retrieves stored embeddings from the specified bucket in Couchbase.
 * 
 * @returns {Array} An array of objects containing the id and embeddings of stored data.
 * @throws {Error} If there is an error querying the database.
 */
async function getStoredEmbeddings() {
  const cluster = await init();
  const query = 'SELECT META().id, embeddings FROM `blogBucket` WHERE type = "embedding"';
  const result = await cluster.query(query);
  return result.rows;
}
/**
 * Calculate the cosine similarity between two vectors.
 *
 * @param {number[]} vectorA - The first vector.
 * @param {number[]} vectorB - The second vector.
 * @returns {number} The cosine similarity between the two vectors.
 */
function cosineSimilarity(vectorA, vectorB) {
  const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
  const normA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (normA * normB);
}
/**
 * Asynchronously searches for relevant blog posts based on the provided query.
 *
 * @param {string} query - The search query to find relevant blog posts.
 * @returns {Promise<Array>} - A promise that resolves with an array of top 10 blog post content objects.
 */
async function searchBlogPosts(query) {
  const queryEmbedding = await generateQueryEmbedding(query);
  const storedEmbeddings = await getStoredEmbeddings();
  const similarities = storedEmbeddings.map(({ id, embeddings }) => ({
    id,
    similarity: cosineSimilarity(queryEmbedding, embeddings),
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);

  const topResults = similarities.slice(0, 10); // Return top 10 results

  const cluster = await init();
  const bucket = cluster.bucket('blogBucket');
  const collection = bucket.defaultCollection();
  const results = await Promise.all(
    topResults.map(async ({ id }) => {
      const docId = id.replace('embedding::', '');
      const result = await collection.get(docId);
      return result.content;
    })
  );

  return results;
}

app.get('/search', async (req, res) => {
  const searchTerm = req.query.q || '';
  if (!searchTerm) {
    return res.status(400).json({ error: 'No search term provided' });
  }

  try {
    const searchResults = await searchBlogPosts(searchTerm);
    res.json(searchResults);
  } catch (err) {
    console.error('Error searching blog posts:', err);
    res.status(500).json({ error: 'Error searching blog posts' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
