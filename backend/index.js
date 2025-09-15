const express = require('express');
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const app = express();
app.use(bodyParser.json({ limit: '2mb' }));
app.use(cors());

// helper functions for sqlite
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing token' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'bad token' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// --- AUTH ---
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const r = await run('INSERT INTO users (username,email,password_hash) VALUES (?,?,?)', [username, email || null, hash]);
    const id = r.lastID;
    const token = jwt.sign({ id, username }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, username, email } });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  try {
    const user = await get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
    if (!user) return res.status(400).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: 'server error' });
  }
});

// --- PROFILE edit (bio/avatar) ---
app.put('/api/users/me', authMiddleware, async (req, res) => {
  const { bio, avatar } = req.body;
  try {
    await run('UPDATE users SET bio = ?, avatar = ? WHERE id = ?', [bio || '', avatar || '', req.user.id]);
    const user = await get('SELECT id,username,bio,avatar FROM users WHERE id = ?', [req.user.id]);
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- POSTS ---
app.post('/api/posts', authMiddleware, async (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title and body required' });
  try {
    const r = await run('INSERT INTO posts (user_id,title,body) VALUES (?,?,?)', [req.user.id, title, body]);
    const post = await get('SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?', [r.lastID]);
    res.json({ post });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/posts/:id', authMiddleware, async (req, res) => {
  const { title, body } = req.body;
  const id = req.params.id;
  const post = await get('SELECT * FROM posts WHERE id = ?', [id]);
  if (!post) return res.status(404).json({ error: 'not found' });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  await run('UPDATE posts SET title = ?, body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [title, body, id]);
  const updated = await get('SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?', [id]);
  res.json({ post: updated });
});

app.delete('/api/posts/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const post = await get('SELECT * FROM posts WHERE id = ?', [id]);
  if (!post) return res.status(404).json({ error: 'not found' });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: 'forbidden' });
  await run('DELETE FROM posts WHERE id = ?', [id]);
  res.json({ deleted: true });
});

app.get('/api/posts', async (req, res) => {
  const page = parseInt(req.query.page || '1');
  const per = 10;
  const offset = (page - 1) * per;
  const rows = await all(
    `SELECT p.*, u.username,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) as like_count
     FROM posts p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [per, offset]
  );
  res.json({ posts: rows, page });
});

app.get('/api/posts/:id', async (req, res) => {
  const id = req.params.id;
  const post = await get('SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?', [id]);
  if (!post) return res.status(404).json({ error: 'not found' });
  const comments = await all('SELECT c.*, u.username FROM comments c JOIN users u ON u.id = c.user_id WHERE c.post_id = ? ORDER BY c.created_at', [id]);
  const like_count = (await get('SELECT COUNT(*) as c FROM likes WHERE post_id = ?', [id])).c;
  res.json({ post, comments, like_count });
});

// --- COMMENTS ---
app.post('/api/posts/:id/comments', authMiddleware, async (req, res) => {
  const postId = req.params.id;
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'body required' });
  try {
    const r = await run('INSERT INTO comments (post_id,user_id,body) VALUES (?,?,?)', [postId, req.user.id, body]);
    const comment = await get('SELECT c.*, u.username FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?', [r.lastID]);
    res.json({ comment });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- LIKE toggle ---
app.post('/api/posts/:id/like', authMiddleware, async (req, res) => {
  const postId = req.params.id;
  try {
    const existing = await get('SELECT * FROM likes WHERE user_id = ? AND post_id = ?', [req.user.id, postId]);
    if (existing) {
      await run('DELETE FROM likes WHERE id = ?', [existing.id]);
      return res.json({ liked: false });
    } else {
      await run('INSERT INTO likes (user_id,post_id) VALUES (?,?)', [req.user.id, postId]);
      return res.json({ liked: true });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- USER profile read ---
app.get('/api/users/:id', async (req, res) => {
  const id = req.params.id;
  const user = await get('SELECT id,username,bio,avatar FROM users WHERE id = ?', [id]);
  if (!user) return res.status(404).json({ error: 'not found' });
  const posts = await all('SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC', [id]);
  res.json({ user, posts });
});

// serve frontend build (if present)
const buildPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(buildPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'), (err) => {
    if (err) res.status(404).json({ error: 'not found' });
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('API listening on', PORT));
