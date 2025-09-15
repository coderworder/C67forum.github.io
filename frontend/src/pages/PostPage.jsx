import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';

export default function PostPage({ token, user }) {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/posts/' + id).then(r => r.json()).then(d => setPost(d));
  }, [id]);

  const submit = async () => {
    if (!token) return alert('login to comment');
    const res = await fetch('/api/posts/' + id + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ body: comment })
    });
    const j = await res.json();
    if (j.comment) { setPost(s => ({ ...s, comments: [...s.comments, j.comment] })); setComment(''); }
    else alert(j.error || 'error');
  };

  const toggleLike = async () => {
    if (!token) return alert('login to like');
    await fetch('/api/posts/' + id + '/like', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } });
    const p = await (await fetch('/api/posts/' + id)).json();
    setPost(p);
  };

  const startEdit = () => {
    setEditing(true);
    setTitle(post.post.title);
    setBody(post.post.body);
  };

  const saveEdit = async () => {
    const res = await fetch('/api/posts/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ title, body })
    });
    const j = await res.json();
    if (j.post) { setPost(prev => ({ ...prev, post: j.post })); setEditing(false); }
    else alert(j.error || 'error');
  };

  const del = async () => {
    if (!confirm('Delete post?')) return;
    await fetch('/api/posts/' + id, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
    navigate('/');
  };

  if (!post) return <div className="card">Loading...</div>;

  return (
    <div>
      <div className="card">
        <div className="post-title">{post.post.title}</div>
        <div className="post-meta small">by {post.post.username} • {new Date(post.post.created_at).toLocaleString()}</div>

        <div style={{ marginTop: 12 }} dangerouslySetInnerHTML={{ __html: marked.parse(post.post.body || '') }} />

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {user && user.id === post.post.user_id && (
            <>
              <button className="btn" onClick={startEdit}>Edit</button>
              <button className="icon-btn" onClick={del}>Delete</button>
            </>
          )}
          <button className="btn" onClick={toggleLike}>Like ({post.like_count || 0})</button>
        </div>

        {editing && (
          <div style={{ marginTop: 12 }} className="card">
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
            <textarea className="input" value={body} onChange={e => setBody(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn" onClick={saveEdit}>Save</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h4>Comments</h4>
        {post.comments.map(c => (
          <div key={c.id} style={{ marginBottom: 8 }}>
            <div className="small">{c.username} • {new Date(c.created_at).toLocaleString()}</div>
            <div>{c.body}</div>
          </div>
        ))}

        <div style={{ marginTop: 8 }}>
          <textarea className="input" value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment..." />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn" onClick={submit}>Comment</button>
          </div>
        </div>
      </div>
    </div>
  );
}
