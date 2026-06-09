require('dotenv').config();

const express = require('express');
const session = require('express-session');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();

const dbConfig = {
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_NAME || 'marmitadb'
};

let pool;

async function connectWithRetry() {
  console.log('[INFRA] Tentando conectar ao MySQL...');
  for (let i = 1; i <= 10; i++) {
    try {
      pool = mysql.createPool(dbConfig);
      await pool.query('SELECT 1');
      console.log('✅ [DATABASE] Conectado ao MySQL com sucesso!');
      return;
    } catch (err) {
      console.log(`⚠️ [DATABASE] Tentativa ${i}/10 falhou. Aguardando...`);
      await new Promise(res => setTimeout(res, 3000));
    }
  }
  process.exit(1);
}

function protegerRota(req, res, next) {
  if (req.session.usuario) {
    return next();
  }

  return res.redirect('/');
}

async function criarUsuario(username, plaintextPassword) {
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(plaintextPassword, saltRounds);
    await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
    console.log(`[DATABASE] Usuário "${username}" criado com sucesso!`);
    return true;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new Error(`O usuário "${username}" já existe.`);
    }
    throw err;
  }
}

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'segredo_padrao',
    resave: false,
    saveUninitialized: false
  })
);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.render('login', { erro: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (rows.length > 0) {
      const user = rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        req.session.usuario = { id: user.id, username: user.username };
        return res.redirect('/dashboard');
      }
    }
    res.render('login', { erro: 'Usuário ou senha inválidos' });
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro no banco.");
  }
});

app.get('/dashboard', protegerRota, async (req, res) => {
  try {
    const [items] = await pool.query('SELECT * FROM items');
    const [orders] = await pool.query('SELECT * FROM orders');
    res.render('dashboard', { items, orders, usuario: req.session.usuario });
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao buscar dados do painel.");
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect('/');
  });
});

app.post('/items', protegerRota, async (req, res) => {
  const { name, category } = req.body;
  try {
    await pool.query('INSERT INTO items (name, category) VALUES (?, ?)', [name, category]);
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao cadastrar item.");
  }
});

app.post('/orders', protegerRota, async (req, res) => {
  const { customer_name, status } = req.body;
  try {
    await pool.query('INSERT INTO orders (customer_name, status) VALUES (?, ?)', [customer_name, status || 'Aberto']);
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao cadastrar pedido.");
  }
});

app.post('/orders/:id/status', protegerRota, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao atualizar status do pedido.");
  }
});

app.get('/register', (req, res) => {
  res.render('register', { erro: null });
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    await criarUsuario(username, password);
    if (req.session.usuario) {
      return res.redirect('/dashboard');
    }
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.render('register', { erro: `Erro ao criar usuário: ${err.message}` });
  }
});

connectWithRetry().then(() => {
  app.listen(3000, () => console.log('MARMITATECH PRO ONLINE NA PORTA 3000'));
});