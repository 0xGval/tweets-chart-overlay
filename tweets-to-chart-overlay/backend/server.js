const express = require('express');
const cors = require('cors');
const twitterService = require('./twitterService');
const axios = require('axios');

const app = express();
const port = 3001;

// Enable CORS for all routes
app.use(cors());
// Parse JSON request bodies
app.use(express.json());

// Attempt to login to Twitter when the server starts
twitterService.login().catch(error => {
  console.error('Failed to login to Twitter:', error);
  process.exit(1); // Exit the process if login fails
});

// Define the POST route for tweet searches
app.post('/api/tweets', async (req, res) => {
  const { query } = req.body;
  console.log(`Received tweet request for query: ${query}`);
  try {
    // Search Twitter using the provided query
    const tweets = await twitterService.searchTwitter(query, 1, 5000);
    console.log(`Found ${tweets.length} tweets`);
    res.json(tweets);
  } catch (error) {
    console.error('Error searching tweets:', error);
    res.status(500).json({ error: 'An error occurred while fetching tweets' });
  }
});

// Define the proxy endpoint
app.post('/api/proxy', async (req, res) => {
  try {
    const { url, method, data, headers } = req.body;
    const response = await axios({
      url,
      method,
      data,
      headers: {
        ...headers,
        'Authorization': process.env.DEFINED_API_KEY
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});