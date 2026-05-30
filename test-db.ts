import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testDb() {
  console.log('Testing Supabase Connection & Tables...')
  
  const tables = ['profiles', 'thread_categories', 'threads', 'comments']
  let allSafe = true

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.error(`\x1b[31m❌ Error accessing table '${table}':\x1b[0m`, error.message)
      allSafe = false
    } else {
      console.log(`\x1b[32m✅ Table '${table}' is accessible.\x1b[0m`)
    }
  }

  console.log('\nChecking Profiles Table Schema...')
  const { data: profileRows, error: profileErr } = await supabase.from('profiles').select('*').limit(1)
  if (profileErr) {
    console.error('Error fetching profiles:', profileErr)
  } else if (profileRows && profileRows.length > 0) {
    console.log('Columns in profiles table:', Object.keys(profileRows[0]).join(', '))
  } else {
    console.log('Profiles table is empty, cannot infer columns from REST response.')
  }
}
testDb()
