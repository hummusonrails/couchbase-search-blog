const express = require('express');
const couchbase = require('couchbase');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

let cluster;
async function init() {
  const env = process.env;
  if (!cluster) {
    cluster = await couchbase.connect(env.COUCHBASE_URL, {
      username: env.COUCHBASE_USERNAME,
      password: env.COUCHBASE_PASSWORD,
      configProfile: "wanDevelopment",
    });
  }
  return cluster;
}

const searchBlogPosts = async (searchTerm) => {
  const cluster = await init();
  const query = `
    SELECT META().id, * FROM \`blogBucket\` 
    WHERE type = "blogPost" AND (
      LOWER(title) LIKE LOWER('%${searchTerm}%') OR
      LOWER(summary) LIKE LOWER('%${searchTerm}%') OR
      ANY tag IN tags SATISFIES LOWER(tag) LIKE LOWER('%${searchTerm}%') END
    )
  `;
  
  const result = await cluster.query(query);
  return result.rows.map((row) => {
    const post = row.blogBucket;
    return {
      id: row.id,
      title: post.title || 'Untitled',
      date: post.date ? new Date(post.date) : new Date('2024-01-01'),
      summary: post.summary || '',
      tags: post.tags || [],
    };
  });
};

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
