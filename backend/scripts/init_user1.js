const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const realPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wellwisher'
  });

  try {
    const [cols] = await realPool.query('DESCRIBE users');
    console.log('Columns in users:', cols.map(c => c.Field));
    const [existing] = await realPool.query('SELECT * FROM users WHERE id = 8888');
    console.log('Sample user 8888:', existing);
    await realPool.query(
      'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
      [1, 'Yeshwanth', 'user1@wellwisher.com', 'placeholder']
    );
    console.log('Successfully inserted/verified User 1 in MySQL database.');
  } catch (err) {
    console.error('Failed to insert User 1:', err);
  } finally {
    await realPool.end();
  }
}

main();
