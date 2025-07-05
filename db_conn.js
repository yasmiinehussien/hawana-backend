const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',         // your DB username
  host: 'localhost',        // host
  database: 'hawana3',       // your DB name
  password: '123',          // your DB password
  port: 5432                // default PostgreSQL port
});

module.exports = pool;
