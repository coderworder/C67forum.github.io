import React, { useEffect, useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import PostPage from './pages/PostPage';
import Profile from './pages/Profile';
import Login from './pages/Login';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="logo">
          ModernForum
        </Link>
        <nav>
          <Link to="/">Home</Link>
          {user ? <Link to={'/users/' + user.id}>Profile</Link> : <Link to="/login">Login</Link>}
          <button
            className="icon-btn"
            onClick={() => {
              const t = document.documentElement.classList.toggle('dark');
              localStorage.setItem('theme', t ? 'dark' : 'light');
            }}
          >
            🌓
          </button>
          {user && <button className="btn" onClick={logout}>Logout</button>}
        </nav>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<Home token={token} user={user} />} />
          <Route path="/posts/:id" element={<PostPage token={token} user={user} />} />
          <Route path="/users/:id" element={<Profile />} />
          <Route path="/login" element={<Login setToken={setToken} setUser={setUser} />} />
        </Routes>
      </main>

      <footer className="footer">© Modern Forum • demo</footer>
    </div>
  );
}

export default App;
