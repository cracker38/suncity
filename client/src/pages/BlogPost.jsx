import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [comment, setComment] = useState({ author_name: '', content: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get(`/cms/blog/${slug}`).then((r) => setPost(r.data)).catch(() => {});
  }, [slug]);

  async function submit(e) {
    e.preventDefault();
    try {
      const res = await api.post(`/cms/blog/${slug}/comments`, comment);
      setMsg(res.message);
      setComment({ author_name: '', content: '' });
    } catch (err) {
      setMsg(err.message);
    }
  }

  if (!post) return <div className="container section"><p>Loading...</p></div>;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 800 }}>
        <span className="badge">{post.category}</span>
        <h1>{post.title}</h1>
        {post.cover_image && <img src={post.cover_image} alt="" style={{ width: '100%', borderRadius: 16, margin: '1rem 0' }} />}
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
        <h2>Comments</h2>
        {(post.comments || []).map((c) => (
          <div className="card" key={c.id} style={{ padding: '1rem', marginBottom: '0.7rem' }}>
            <strong>{c.author_name}</strong>
            <p style={{ margin: 0 }}>{c.content}</p>
          </div>
        ))}
        {msg && <div className="alert alert-success">{msg}</div>}
        <form className="card" style={{ padding: '1.2rem' }} onSubmit={submit}>
          <div className="form-group"><label className="label">Name</label>
            <input className="input" value={comment.author_name} onChange={(e) => setComment({ ...comment, author_name: e.target.value })} /></div>
          <div className="form-group"><label className="label">Comment</label>
            <textarea className="textarea" required value={comment.content} onChange={(e) => setComment({ ...comment, content: e.target.value })} /></div>
          <button className="btn btn-primary">Post Comment</button>
        </form>
      </div>
    </section>
  );
}
