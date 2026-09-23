const { Pool, types } = require('pg');

types.setTypeParser(1082, (valor) => valor);
types.setTypeParser(1083, (valor) => valor.slice(0, 5));

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 5000,
  query_timeout: 5000,
});

pool.on('error', () => {
  console.error('Se perdió una conexión inactiva con PostgreSQL.');
});

module.exports = { pool };
