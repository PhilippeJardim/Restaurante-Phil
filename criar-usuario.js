require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_NAME || 'marmitadb'
};

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Uso: node criar-usuario.js <usuario> <senha>');
  process.exit(1);
}

const [username, password] = args;

async function run() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    await connection.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
    console.log(`✅ Usuário "${username}" criado com sucesso!`);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.error(`❌ Erro: O usuário "${username}" já existe.`);
    } else {
      console.error('❌ Erro ao criar usuário:', err.message);
    }
  } finally {
    if (connection) await connection.end();
  }
}

run();
