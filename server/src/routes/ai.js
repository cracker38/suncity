import { Router } from 'express';
import { pool } from '../config/db.js';
import { ok, fail, asyncHandler } from '../utils/response.js';
import { optionalAuth, authenticate, requireRoles } from '../middleware/auth.js';
import { config } from '../config/index.js';
import {
  answerFromKnowledge,
  detectIntent,
  wantsHumanAgent,
} from '../services/aiKnowledge.js';
import { generateOnlineReply, getLlmStatus } from '../services/llmOnline.js';

const router = Router();

async function ensureAgentTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS agent_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_code VARCHAR(50) NOT NULL UNIQUE,
      user_id INT NULL,
      session_id VARCHAR(100),
      guest_name VARCHAR(200),
      guest_email VARCHAR(200),
      guest_phone VARCHAR(50),
      topic VARCHAR(200),
      message TEXT NOT NULL,
      conversation_json LONGTEXT,
      status VARCHAR(50) DEFAULT 'open',
      priority VARCHAR(50) DEFAULT 'medium',
      assigned_to INT NULL,
      staff_notes TEXT,
      resolved_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  try { await pool.execute(`CREATE INDEX IF NOT EXISTS idx_agent_status ON agent_requests(status)`); } catch {}
  try { await pool.execute(`CREATE INDEX IF NOT EXISTS idx_agent_created ON agent_requests(created_at)`); } catch {}
}

ensureAgentTable().catch((e) => console.error('agent_requests table:', e.message));

async function loadLiveContext() {
  const [rooms] = await pool.execute(
    `SELECT name, base_price, short_description, max_guests FROM room_types WHERE is_active = 1 ORDER BY base_price`
  );
  const [offers] = await pool.execute(
    `SELECT title, discount_percent, coupon_code FROM offers WHERE is_active = 1 AND (end_date IS NULL OR end_date >= date('now')) LIMIT 8`
  );
  const [faqs] = await pool.execute(`SELECT question, answer FROM faqs WHERE is_active = 1 ORDER BY sort_order LIMIT 12`);
  const [halls] = await pool.execute(
    `SELECT name, type, capacity, base_price FROM event_halls WHERE is_active = 1`
  );
  return { rooms, offers, faqs, halls };
}

function formatLiveContext(live) {
  const roomLine = (live.rooms || [])
    .map((r) => `${r.name}: RWF ${Number(r.base_price).toLocaleString()}/night (max ${r.max_guests})${r.short_description ? ` — ${r.short_description}` : ''}`)
    .join('\n');
  const offerLine = (live.offers || [])
    .map((o) => `${o.title}: ${o.discount_percent}%${o.coupon_code ? ` (code ${o.coupon_code})` : ''}`)
    .join('\n');
  const hallLine = (live.halls || [])
    .map((h) => `${h.name}: ${h.type}, capacity ${h.capacity}, from RWF ${Number(h.base_price).toLocaleString()}`)
    .join('\n');
  const faqLine = (live.faqs || []).map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n');
  return [
    roomLine ? `Live room rates:\n${roomLine}` : '',
    hallLine ? `Live event halls:\n${hallLine}` : '',
    offerLine ? `Live offers:\n${offerLine}` : '',
    faqLine ? `Live FAQs:\n${faqLine}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function callOnlineLlm({ message, history = [], liveContext }) {
  return generateOnlineReply({ message, history, liveContext });
}

function requestCode() {
  return `AG-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

async function createAgentRequest({ user, sessionId, message, topic, history }) {
  const code = requestCode();
  const guestName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
    : 'Website Guest';
  const guestEmail = user?.email || null;
  const guestPhone = user?.phone || null;

  const [result] = await pool.execute(
    `INSERT INTO agent_requests
      (request_code, user_id, session_id, guest_name, guest_email, guest_phone, topic, message, conversation_json, status, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 'high')`,
    [
      code,
      user?.id || null,
      sessionId,
      guestName,
      guestEmail,
      guestPhone,
      topic || 'General assistance',
      message,
      JSON.stringify(history || []),
    ]
  );

  // Notify receptionists and admins with role-specific dashboard links
  const [staff] = await pool.execute(
    `SELECT u.id, r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id
     WHERE r.name IN ('receptionist','admin') AND u.is_active = 1`
  );
  for (const s of staff) {
    const link = s.role_name === 'admin' ? '/admin/agent-requests' : '/reception/agent-requests';
    await pool.execute(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES (?, ?, ?, 'agent_request', ?)`,
      [
        s.id,
        `Agent request ${code}`,
        `${guestName}${guestEmail ? ` (${guestEmail})` : ''}: ${message.slice(0, 180)}`,
        link,
      ]
    );
  }

  return { id: result.insertId, request_code: code, guest_name: guestName, guest_email: guestEmail };
}

router.get(
  '/status',
  authenticate,
  requireRoles('admin', 'receptionist'),
  asyncHandler(async (_req, res) => {
    return ok(res, {
      ...getLlmStatus(),
      knowledge_base: true,
      language: 'en',
      escalation: true,
    });
  })
);

router.get('/chat', (_req, res) => {
  return ok(res, {
    method: 'POST',
    endpoint: '/api/ai/chat',
    usage: 'Send JSON { message, session_id?, history?, request_agent? }',
  }, 'Use POST /api/ai/chat to talk to the concierge');
});

router.post(
  '/chat',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const message = (req.body.message || '').trim();
    const sessionId = req.body.session_id || `sess-${Date.now()}`;
    const history = Array.isArray(req.body.history) ? req.body.history : [];
    const wantAgent = !!req.body.request_agent;

    if (!message) {
      return ok(res, {
        reply: 'Please share your question and I will be glad to help.',
        intent: 'empty',
      });
    }

    try {
      await pool.execute(
        `INSERT INTO ai_conversations (user_id, session_id, role, message) VALUES (?, ?, 'user', ?)`,
        [req.user?.id || null, sessionId, message]
      );
    } catch (e) {
      console.error('ai_conversations insert failed:', e.message);
    }

    let live = { rooms: [], offers: [], faqs: [], halls: [] };
    try {
      live = await loadLiveContext();
    } catch (e) {
      console.error('loadLiveContext failed:', e.message);
    }
    const liveContext = formatLiveContext(live);
    let intent = detectIntent(message);
    let agentRequest = null;

    const escalate = wantAgent || wantsHumanAgent(message) || intent === 'escalate';

    let reply = null;
    let source = 'online';
    let provider = null;
    let openaiError = null;

    try {
      if (escalate) {
        intent = 'escalate';
        try {
          agentRequest = await createAgentRequest({
            user: req.user,
            sessionId,
            message,
            topic: intent,
            history: [...history, { role: 'user', content: message }],
          });
        } catch (e) {
          console.error('createAgentRequest failed:', e.message);
          agentRequest = {
            request_code: `AG-LOCAL-${Date.now()}`,
            guest_name: req.user
              ? `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim()
              : 'Website Guest',
          };
        }
        const aiEscalation = await callOnlineLlm({
          message: `The guest asked to speak with reception/staff. Confirm professionally that Reception has been notified with reference ${agentRequest.request_code}. Keep it under 60 words. Guest message was: ${message}`,
          history,
          liveContext,
        });
        reply =
          aiEscalation.text ||
          `Thank you. I have forwarded your enquiry to our Reception team under reference ${agentRequest.request_code}` +
            (req.user ? ` for ${agentRequest.guest_name}.` : '.') +
            ` A receptionist will attend to you shortly. You may also reach us on WhatsApp while you wait.`;
        provider = aiEscalation.provider;
        source = aiEscalation.text ? `online:${provider}+escalation` : 'escalation';
        openaiError = aiEscalation.error;
      } else {
        const ai = await callOnlineLlm({ message, history, liveContext });
        if (ai.text) {
          reply = ai.text;
          provider = ai.provider;
          source = `online:${provider}`;
        } else {
          openaiError = ai.error;
          const kb = answerFromKnowledge(message, live);
          intent = kb.intent || intent;
          reply = kb.reply;
          source = `fallback:${kb.source || 'knowledge'}`;
        }
      }
    } catch (e) {
      console.error('chat handler error:', e.message);
      const kb = answerFromKnowledge(message, live);
      intent = kb.intent || intent;
      reply = kb.reply;
      source = 'fallback:error';
      openaiError = e.message;
    }

    if (!reply) {
      reply =
        'Thank you for your message. I can help with rooms, reservations, dining, events, and catering. How may I assist you?';
    }

    try {
      await pool.execute(
        `INSERT INTO ai_conversations (user_id, session_id, role, message, intent)
         VALUES (?, ?, 'assistant', ?, ?)`,
        [req.user?.id || null, sessionId, reply, `${intent}:${source}`]
      );
    } catch (e) {
      console.error('ai_conversations assistant insert failed:', e.message);
    }

    return ok(res, {
      reply,
      intent,
      source,
      provider,
      openai_error: openaiError,
      session_id: sessionId,
      agent_request: agentRequest,
      whatsapp: `https://wa.me/${config.hotel.whatsapp}?text=${encodeURIComponent(
        agentRequest
          ? `Hello SUN CITY, regarding agent request ${agentRequest.request_code}`
          : 'Hello SUN CITY NYAKARAMBI, I need assistance.'
      )}`,
      suggested_actions: escalate
        ? ['Wait for receptionist callback', 'Open WhatsApp']
        : ['Current room rates', 'How do I book?', 'Request a receptionist'],
    });
  })
);

router.get(
  '/agent-requests',
  authenticate,
  requireRoles('admin', 'receptionist'),
  asyncHandler(async (req, res) => {
    const status = req.query.status;
    let sql = `SELECT ar.*, u.first_name, u.last_name, u.email AS user_email, u.phone AS user_phone, u.city, u.country,
                      a.first_name AS assignee_first, a.last_name AS assignee_last
               FROM agent_requests ar
               LEFT JOIN users u ON u.id = ar.user_id
               LEFT JOIN users a ON a.id = ar.assigned_to`;
    const params = [];
    if (status) {
      sql += ` WHERE ar.status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY CASE ar.status WHEN 'open' THEN 1 WHEN 'assigned' THEN 2 WHEN 'in_progress' THEN 3 WHEN 'resolved' THEN 4 WHEN 'closed' THEN 5 ELSE 6 END, ar.created_at DESC LIMIT 200`;
    const [rows] = await pool.execute(sql, params);
    return ok(res, rows);
  })
);

router.get(
  '/agent-requests/:id',
  authenticate,
  requireRoles('admin', 'receptionist'),
  asyncHandler(async (req, res) => {
    const [rows] = await pool.execute(
      `SELECT ar.*, u.first_name, u.last_name, u.email AS user_email, u.phone AS user_phone,
              u.address, u.city, u.country, u.created_at AS customer_since
       FROM agent_requests ar
       LEFT JOIN users u ON u.id = ar.user_id
       WHERE ar.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return fail(res, 'Request not found', 404);

    let bookings = [];
    if (rows[0].user_id) {
      const [b] = await pool.execute(
        `SELECT booking_code, check_in, check_out, status, payment_status, total_amount, guest_name
         FROM bookings WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
        [rows[0].user_id]
      );
      bookings = b;
    }

    const [chat] = await pool.execute(
      `SELECT role, message, intent, created_at FROM ai_conversations
       WHERE session_id = ? ORDER BY created_at ASC LIMIT 100`,
      [rows[0].session_id]
    );

    return ok(res, { ...rows[0], bookings, chat_history: chat });
  })
);

router.patch(
  '/agent-requests/:id',
  authenticate,
  requireRoles('admin', 'receptionist'),
  asyncHandler(async (req, res) => {
    const { status, staff_notes, priority, assign_to_me } = req.body;
    const assignedTo = assign_to_me ? req.user.id : req.body.assigned_to || null;
    await pool.execute(
      `UPDATE agent_requests SET
        status = COALESCE(?, status),
        staff_notes = COALESCE(?, staff_notes),
        priority = COALESCE(?, priority),
        assigned_to = COALESCE(?, assigned_to),
        resolved_at = CASE WHEN ? IN ('resolved','closed') THEN NOW() ELSE resolved_at END
       WHERE id = ?`,
      [status || null, staff_notes || null, priority || null, assignedTo, status || null, req.params.id]
    );

    if (status && ['resolved', 'closed', 'in_progress', 'assigned'].includes(status)) {
      const [rows] = await pool.execute(`SELECT user_id, request_code FROM agent_requests WHERE id = ?`, [
        req.params.id,
      ]);
      if (rows[0]?.user_id) {
        await pool.execute(
          `INSERT INTO notifications (user_id, title, message, type, link)
           VALUES (?, ?, ?, 'agent_update', '/dashboard/notifications')`,
          [
            rows[0].user_id,
            `Agent request ${rows[0].request_code} updated`,
            `Status is now: ${status}. Our team is assisting you.`,
          ]
        );
      }
    }

    return ok(res, null, 'Agent request updated');
  })
);

export default router;
