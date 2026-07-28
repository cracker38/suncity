import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import './AIAssistant.css';

const QUICK = [
  { label: 'Room rates', message: 'What are your current room rates?' },
  { label: 'Reservations', message: 'How do I make a reservation?' },
  { label: 'Dining hours', message: 'What are the restaurant hours?' },
  { label: 'Speak to reception', message: 'I would like to speak with reception, please.', agent: true },
];

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `web-${Date.now()}`);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Good day. Welcome to SUN CITY NYAKARAMBI. I am your virtual concierge — how may I assist you today?',
    },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function sendMessage(text, { requestAgent = false } = {}) {
    const content = (text || '').trim();
    if (!content || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: content }]);
    setLoading(true);
    try {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.text }));
      const res = await api.post('/ai/chat', {
        message: content,
        session_id: sessionId,
        history,
        request_agent: requestAgent,
      });
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: res.data.reply,
          whatsapp: res.data.whatsapp,
          agent: res.data.agent_request,
          source: res.data.source,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: 'I apologise — I am temporarily unable to respond. Please try again shortly, or contact us on WhatsApp.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function send(e) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="ai-root">
      {open && (
        <div className="ai-panel" role="dialog" aria-label="SUN CITY Concierge">
          <div className="ai-head">
            <div className="ai-head-brand">
              <span className="ai-avatar" aria-hidden="true">SC</span>
              <div>
                <strong>Guest Concierge</strong>
                <small>
                  <span className="ai-online" /> Online concierge · English
                </small>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" type="button">
              ×
            </button>
          </div>
          <div className="ai-body">
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role}`}>
                <p>{m.text}</p>
                {m.agent?.request_code && (
                  <small className="ai-ticket">Reference {m.agent.request_code} — Reception notified</small>
                )}
                {m.whatsapp && m.agent && (
                  <a className="btn btn-primary" href={m.whatsapp} target="_blank" rel="noreferrer">
                    Continue on WhatsApp
                  </a>
                )}
              </div>
            ))}
            {loading && (
              <div className="ai-msg assistant">
                <p className="ai-typing">One moment, please…</p>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="ai-quick">
            {QUICK.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => sendMessage(q.message, { requestAgent: !!q.agent })}
              >
                {q.label}
              </button>
            ))}
          </div>
          <form className="ai-form" onSubmit={send}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your enquiry…"
              aria-label="Message"
              disabled={loading}
            />
            <button className="btn btn-primary" disabled={loading} type="submit">
              {loading ? '…' : 'Send'}
            </button>
          </form>
          <button
            className="ai-agent-btn"
            type="button"
            disabled={loading}
            onClick={() =>
              sendMessage('I would like to speak with a receptionist, please.', { requestAgent: true })
            }
          >
            Request a receptionist
          </button>
        </div>
      )}
      <button className="ai-fab" onClick={() => setOpen((v) => !v)} aria-label="Open Guest Concierge" type="button">
        <span className="ai-fab-label">Concierge</span>
      </button>
    </div>
  );
}
