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

  // Check if it's a POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Invalid request method' })
    };
  }

  // Parse the request body
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, message: 'Invalid JSON in request body' })
    };
  }

  // Validate required fields
  if (!data.movie_id || !data.name || !data.email || !data.comment) {
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

  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(uri);
    await client.connect();
    
    const database = client.db(dbName);
    const commentsCollection = database.collection('comments');
    
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
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Comment submitted successfully' })
    };
  } catch (error) {
    console.error('Error saving comment:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: 'Error saving comment' })
    };
  } finally {
    // Close the MongoDB connection
    if (client) await client.close();
  }
};