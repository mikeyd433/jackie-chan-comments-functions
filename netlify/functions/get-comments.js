const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async function(event, context) {
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
    console.log(`Getting comments for movie: ${movieId}`);
    
    // Query Supabase for comments for this movie ID
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('movie_id', movieId)
      .eq('approved', true)
      .order('date', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    console.log(`Found ${comments ? comments.length : 0} comments`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(comments || [])
    };
  } catch (error) {
    console.error('Error retrieving comments:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error retrieving comments',
        message: error.message
      })
    };
  }
};
