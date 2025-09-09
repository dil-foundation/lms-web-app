// Simple script to apply the math migrations to the remote Supabase database
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://yfaiauooxwvekdimfeuu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // You'll need to get this from your Supabase dashboard

if (!SUPABASE_SERVICE_KEY) {
  console.error('Please set SUPABASE_SERVICE_KEY environment variable');
  console.log('Get it from: https://supabase.com/dashboard/project/yfaiauooxwvekdimfeuu/settings/api');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationSQL = fs.readFileSync('apply_math_migrations.sql', 'utf8');
    
    console.log('Applying migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration failed:', error);
      return;
    }
    
    console.log('Migration applied successfully!');
    console.log('Result:', data);
    
    // Test the migration by querying a quiz question
    console.log('Testing migration...');
    const { data: testData, error: testError } = await supabase
      .from('quiz_questions')
      .select('id, question_type, math_expression, math_tolerance, math_hint, math_allow_drawing')
      .limit(1);
    
    if (testError) {
      console.error('Test query failed:', testError);
    } else {
      console.log('Test query result:', testData);
    }
    
  } catch (error) {
    console.error('Error applying migration:', error);
  }
}

applyMigration();
