const { MongoClient } = require('mongodb');

// MongoDB connection URI from environment variable
const uri = process.env.MONGODB_URI;
const dbName = 'jackie_chan_club';

exports.handler = async function(event, context) {
  // Set CORS headers for browser requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Get movie ID from query parameter
  const movieId = event.queryStringParameters?.movie_id;

  if (!movieId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Movie ID is required' })
    };
  }

  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(uri);
    await client.connect();
    
    const database = client.db(dbName);
    const commentsCollection = database.collection('comments');
    
    // Query for approved comments for this movie
    const comments = await commentsCollection
      .find({ movie_id: movieId, approved: true })
      .sort({ date: -1 })
      .toArray();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(comments)
    };
  } catch (error) {
    console.error('Error retrieving comments:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error retrieving comments' })
    };
  } finally {
    // Close the MongoDB connection
    if (client) await client.close();
  }
};