import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function Home({ token, user }) {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/posts').then(r => r.json()).then(d => setPosts(d.posts || []));
  }, []);

  const submit = async () => {
    if (!token) { alert('login to post'); return; }
    setLoading(true);
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ title, body })
    });
    const j = await res.json();
    setLoading(false);
    if (j.post) { setPosts([j.post, ...posts]); setTitle(''); setBody(''); }
    else alert(j.error || 'error');
  };

  return (
    <div className="grid">
      <div>
        <div className="card animate-fade">
          <h3>New Thread</h3>
          <input className="input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea className="input" placeholder="Write something..." value={body} onChange={e => setBody(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={submit} disabled={loading}>{loading ? 'Posting...' : 'Post'}</button>
          </div>
        </div>

        {posts.map(p => (
          <div className="card" key={p.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="post-title"><Link to={'/posts/' + p.id}>{p.title}</Link></div>
                <div className="post-meta small">by {p.username} • {new Date(p.created_at).toLocaleString()}</div>
              </div>
              <div><div className="small">❤️ {p.like_count || 0}</div></div>
            </div>
          </div>
        ))}
      </div>

      <aside>
        <div className="card">
          <h4>About</h4>
          <p className="small">A modern, server-driven forum demo. Dark mode, responsive, and compact.</p>
        </div>
        <div className="card">
          <h4>Quick Links</h4>
          <ul className="small">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/login">Login / Register</Link></li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
