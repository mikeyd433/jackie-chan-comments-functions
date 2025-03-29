const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async function(event, context) {
  // Set CORS headers for browser requests
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    // Insert comment into Supabase
    const { data: comment, error } = await supabase
      .from('comments')
      .insert([
        {
          movie_id: data.movie_id,
          name: data.name,
          email: data.email,
          comment: data.comment,
          approved: true
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log('Comment inserted successfully:', comment);
    
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
      body: JSON.stringify({ 
        success: false, 
        message: 'Error saving comment',
        error: error.message
      })
    };
  }
};
