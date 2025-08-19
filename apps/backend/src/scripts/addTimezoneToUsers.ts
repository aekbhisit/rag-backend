import { getPostgresPool } from "../adapters/db/postgresClient";

async function main() {
  const pool = getPostgresPool();
  
  try {
    console.log("Adding timezone column to users table...");
    
    // Add timezone column if it doesn't exist
    await pool.query(`
      ALTER TABLE public.users 
      ADD COLUMN IF NOT EXISTS timezone varchar NOT NULL DEFAULT 'UTC';
    `);
    
    // Update existing users to have UTC timezone if they don't have one
    await pool.query(`
      UPDATE public.users 
      SET timezone = 'UTC' 
      WHERE timezone IS NULL OR timezone = '';
    `);
    
    console.log("✅ Successfully added timezone column to users table");
    
    // Verify the change
    const { rows } = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public' 
      AND column_name = 'timezone';
    `);
    
    if (rows.length > 0) {
      console.log("Timezone column details:", rows[0]);
    }
    
    // Show current users and their timezones
    const { rows: users } = await pool.query(`
      SELECT id, email, timezone, created_at 
      FROM public.users 
      LIMIT 5;
    `);
    
    console.log("Sample users with timezones:");
    users.forEach((user: { email: string; timezone: string; created_at: string }) => {
      console.log(`- ${user.email}: ${user.timezone} (created: ${user.created_at})`);
    });
    
  } catch (error) {
    console.error("❌ Error adding timezone column:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
