const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  console.log('Connecting to MySQL database:', process.env.DB_NAME || 'wellwisher');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'wellwisher',
    multipleStatements: true
  });

  const schemaPath = path.join(__dirname, '../config/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Executing schema.sql...');
  await connection.query(schemaSql);
  console.log('schema.sql executed successfully!');

  // Verify tables
  const [tables] = await connection.query('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);
  console.log('Tables in database (' + tableNames.length + '):', tableNames.join(', '));

  // Verify routine_templates columns
  const [templateCols] = await connection.query('DESCRIBE routine_templates');
  console.log('routine_templates columns:', templateCols.map(c => c.Field).join(', '));

  // Verify routines columns
  const [routineCols] = await connection.query('DESCRIBE routines');
  console.log('routines columns:', routineCols.map(c => c.Field).join(', '));

  await connection.end();
  console.log('Migration complete!');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
