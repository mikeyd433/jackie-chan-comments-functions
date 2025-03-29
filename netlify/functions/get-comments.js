const { MongoClient } = require('mongodb');

// MongoDB connection URI from environment variable
const uri = process.env.MONGODB_URI;
const dbName = 'jackie_chan_club';

// Connection pooling - reuse the client between function invocations
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  // If we already have a connection, use it
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // If no connection, create a new one
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // 5 second timeout
    connectTimeoutMS: 5000 // 5 second timeout
  });

  await client.connect();
  const db = client.db(dbName);
  
  // Cache the client and db connection
  cachedClient = client;
  cachedDb = db;
  
  return { client, db };
}

exports.handler = async function(event, context) {
  // Tell Netlify not to close the connection immediately
  context.callbackWaitsForEmptyEventLoop = false;
  
  // Set CORS headers for browser requests
  const headers = {
    'Access-Control-Allow-Origin': 'https://jackiechanfan.club',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
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

  try {
    // Connect to MongoDB using our connection function
    const { db } = await connectToDatabase();
    const commentsCollection = db.collection('comments');
    
    console.log(`Getting comments for movie: ${movieId}`);
    
    // Query for approved comments for this movie
    const comments = await commentsCollection
      .find({ movie_id: movieId, approved: true })
      .sort({ date: -1 })
      .toArray();
    
    console.log(`Found ${comments.length} comments`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(comments)
    };
  } catch (error) {
    console.error('Detailed error retrieving comments:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error retrieving comments',
        message: error.message,
        stack: error.stack
      })
    };
  }
};
