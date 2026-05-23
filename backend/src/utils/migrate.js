require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const executeSqlFile = async (filePath) => {
  console.log(`Executing SQL file: ${path.basename(filePath)}`);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  // Split statements by semicolon, being careful with functions/triggers if any exist
  // For basic schemas, splitting by semicolon is fine.
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
    
  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (err) {
      // Ignore "already exists" errors to allow re-running
      if (err.code === '42P07' || err.code === '42710') {
        // Table or index already exists, skip
      } else {
        console.warn(`Warning executing statement: ${err.message}`);
      }
    }
  }
};

const runMigration = async () => {
  try {
    const modelsDir = path.join(__dirname, '..', 'models');
    
    // Execute SQL files in order
    await executeSqlFile(path.join(modelsDir, 'schema.sql'));
    await executeSqlFile(path.join(modelsDir, 'step2_schema.sql'));
    await executeSqlFile(path.join(modelsDir, 'step3_schema.sql'));
    
    // Seed default admin account
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    await pool.query(`
      INSERT INTO admins (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['Super Admin', 'admin@labourbook.com', hashedPassword, 'superadmin']);

    console.log('Database migrated and seeded successfully on Supabase!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
