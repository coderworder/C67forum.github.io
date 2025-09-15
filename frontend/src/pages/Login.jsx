import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ setToken, setUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const j = await res.json();
    if (j.token) {
      localStorage.setItem('token', j.token);
      localStorage.setItem('user', JSON.stringify(j.user));
      setToken(j.token);
      setUser(j.user);
      navigate('/');
    } else alert(j.error || 'login failed');
  };

  const register = async () => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const j = await res.json();
    if (j.token) {
      localStorage.setItem('token', j.token);
      localStorage.setItem('user', JSON.stringify(j.user));
      setToken(j.token);
      setUser(j.user);
      navigate('/');
    } else alert(j.error || 'register failed');
  };

  return (
    <div className="card" style={{ maxWidth: 400, margin: '0 auto' }}>
      <h3>Login / Register</h3>
      <form onSubmit={login}>
        <input className="input" placeholder="username or email" value={username} onChange={e => setUsername(e.target.value)} />
        <input className="input" placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn" type="submit">Login</button>
          <button type="button" className="icon-btn" onClick={register}>Register</button>
        </div>
      </form>
    </div>
  );
}
