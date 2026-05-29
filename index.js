require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();

const dbConfig = {
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_NAME || 'marmitadb',
  charset: 'utf8mb4'
};

let pool;

async function connectWithRetry() {
  console.log('[INFRA] Tentando conectar ao MySQL...');

  for (let i = 1; i <= 10; i++) {
    try {
      pool = mysql.createPool(dbConfig);
      await pool.query('SELECT 1');

      console.log('[DATABASE] Conectado ao MySQL com sucesso!');
      return;
    } catch (err) {
      console.log(`[DATABASE] Tentativa ${i}/10 falhou. Aguardando...`);
      await new Promise((res) => setTimeout(res, 3000));
    }
  }

  console.log('[DATABASE] Não foi possível conectar ao banco.');
  process.exit(1);
}

function protegerRota(req, res, next) {
  if (req.session.usuario) {
    return next();
  }

  return res.redirect('/');
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

    if (rows.length === 0) {
      return res.render('login', { erro: 'Usuário ou senha inválidos.' });
    }

    const usuario = rows[0];

    let senhaCorreta = false;

    if (usuario.password.startsWith('$2b$')) {
      senhaCorreta = await bcrypt.compare(password, usuario.password);
    } else {
      senhaCorreta = password === usuario.password;
    }

    if (!senhaCorreta) {
      return res.render('login', { erro: 'Usuário ou senha inválidos.' });
    }

    req.session.usuario = {
      id: usuario.id,
      username: usuario.username
    };

    return res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    return res.status(500).send('Erro no banco de dados.');
  }
});

app.get('/dashboard', protegerRota, async (req, res) => {
  try {
    const [items] = await pool.query('SELECT * FROM items ORDER BY id DESC');
    const [orders] = await pool.query('SELECT * FROM orders ORDER BY id DESC');

    res.render('dashboard', {
      usuario: req.session.usuario,
      items,
      orders
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao carregar dashboard.');
  }
});

app.post('/items', protegerRota, async (req, res) => {
  const { name, category } = req.body;

  try {
    await pool.query(
      'INSERT INTO items (name, category) VALUES (?, ?)',
      [name, category]
    );

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao cadastrar item.');
  }
});

app.post('/orders', protegerRota, async (req, res) => {
  const { customer_name, status } = req.body;

  try {
    await pool.query(
      'INSERT INTO orders (customer_name, status) VALUES (?, ?)',
      [customer_name, status || 'Aberto']
    );

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao cadastrar pedido.');
  }
});

app.post('/orders/:id/status', protegerRota, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await pool.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao atualizar pedido.');
  }
});

app.post('/logout', protegerRota, (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

connectWithRetry().then(() => {
  app.listen(3000, () => {
    console.log('MARMITATECH PRO ONLINE NA PORTA 3000');
  });
});