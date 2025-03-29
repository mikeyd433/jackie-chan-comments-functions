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

  // Check if it's a POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Invalid request method' })
    };
  }

  console.log('Received comment submission');
  
  // Parse the request body
  let data;
  try {
    data = JSON.parse(event.body);
    console.log('Parsed request body:', JSON.stringify(data));
  } catch (error) {
    console.error('JSON parsing error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: 'Invalid JSON in request body' })
    };
  }

  // Validate required fields
  if (!data.movie_id || !data.name || !data.email || !data.comment) {
    console.error('Missing required fields:', data);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: 'All fields are required' })
    };
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: 'Invalid email address' })
    };
  }

  // Check for links (simple anti-spam measure)
  if (/https?:\/\//i.test(data.comment)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: 'Links are not allowed in comments' })
    };
  }

  try {
    // Connect to MongoDB using our connection function
    const { db } = await connectToDatabase();
    const commentsCollection = db.collection('comments');
    
    console.log('Connected to MongoDB successfully');
    
    // Prepare comment document
    const comment = {
      movie_id: data.movie_id,
      name: data.name,
      email: data.email,
      comment: data.comment,
      date: new Date(),
      approved: true // Auto-approve comments for now, change to false if you want moderation
    };
    
    // Insert comment into database
    await commentsCollection.insertOne(comment);
    console.log('Comment inserted successfully');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Comment submitted successfully' })
    };
  } catch (error) {
    console.error('Detailed error saving comment:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        message: 'Error saving comment',
        error: error.message,
        stack: error.stack
      })
    };
  }
};
