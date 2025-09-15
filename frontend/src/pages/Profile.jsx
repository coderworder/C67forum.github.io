import React, { useEffect, useState } from 'react';

export default function Profile() {
  const parts = window.location.pathname.split('/');
  const id = parts[parts.length - 1];
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch('/api/users/' + id).then(r => r.json()).then(d => { setData(d); setBio(d.user.bio || ''); });
  }, [id]);

  const save = async () => {
    const token = localStorage.getItem('token');
    if (!token) return alert('login to edit');
    const res = await fetch('/api/users/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ bio })
    });
    const j = await res.json();
    if (j.user) { setData(d => ({ ...d, user: j.user })); setEditing(false); }
    else alert(j.error || 'error');
  };

  if (!data) return <div className="card">Loading profile...</div>;

  return (
    <div className="card">
      <h3>{data.user.username}</h3>
      <p className="small">{data.user.bio}</p>

      {editing ? (
        <div>
          <textarea className="input" value={bio} onChange={e => setBio(e.target.value)} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn" onClick={save}>Save</button>
          </div>
        </div>
      ) : (
        <button className="btn" onClick={() => setEditing(true)}>Edit Profile</button>
      )}

      <h4>Posts</h4>
      {data.posts.map(p => (
        <div key={p.id} className="small" style={{ marginBottom: 8 }}>
          <a href={'/posts/' + p.id}>{p.title}</a>
          <div className="small">{new Date(p.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
