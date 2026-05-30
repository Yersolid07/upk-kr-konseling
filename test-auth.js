const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.trim().match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/['"]/g, '');
});

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_KEY = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

async function testAuth() {
  console.log('Testing Auth with URL:', SUPABASE_URL);
  
  // 1. Sign In
  const signInRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'yermiaturangan07@gmail.com', // Replace if needed, but let's test generic format
      password: 'testPassword123!' // User hasn't provided password, so this might fail with 400. But if it fails, we know the API works.
    })
  });
  
  const signInData = await signInRes.json();
  console.log('Sign In Data:', signInData);
}

testAuth().catch(console.error);
