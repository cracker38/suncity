import { config } from '../config/index.js';
import { buildSystemPrompt } from './aiKnowledge.js';

/** Skip OpenAI for a while after quota/billing errors */
let openaiCooldownUntil = 0;
let lastOpenAiError = null;

function inCooldown() {
  return Date.now() < openaiCooldownUntil;
}

function markOpenAiQuota(error) {
  lastOpenAiError = error;
  if (/quota|billing|insufficient|exceeded|402|429/i.test(error || '')) {
    openaiCooldownUntil = Date.now() + 15 * 60 * 1000;
  }
}

async function fetchJson(url, options, timeoutMs = 28000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...options, signal: controller.signal });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function buildMessages(message, history, liveContext) {
  return [
    { role: 'system', content: buildSystemPrompt(liveContext) },
    ...history
      .slice(-8)
      .filter((h) => h?.content && (h.role === 'user' || h.role === 'assistant'))
      .map((h) => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: String(h.content).slice(0, 1200),
      })),
    { role: 'user', content: message },
  ];
}

async function callOpenAI(messages) {
  if (!config.openaiKey) return { text: null, error: 'missing_key', provider: 'openai' };
  if (inCooldown()) {
    return { text: null, error: lastOpenAiError || 'quota_cooldown', provider: 'openai' };
  }

  const { ok, status, data } = await fetchJson(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.45,
        max_tokens: 420,
        presence_penalty: 0.2,
        frequency_penalty: 0.25,
        messages,
      }),
    },
    25000
  );

  if (!ok) {
    const err = data?.error?.message || `HTTP ${status}`;
    markOpenAiQuota(err);
    console.error('OpenAI error:', err);
    return { text: null, error: err, provider: 'openai' };
  }

  const text = data?.choices?.[0]?.message?.content?.trim() || null;
  return { text, error: text ? null : 'empty_response', provider: 'openai' };
}

/** Groq — free online Llama (optional GROQ_API_KEY) */
async function callGroq(messages) {
  const key = process.env.GROQ_API_KEY || config.groqKey || '';
  if (!key) return { text: null, error: 'missing_key', provider: 'groq' };

  const { ok, status, data } = await fetchJson(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.4,
        max_tokens: 420,
        messages,
      }),
    },
    25000
  );

  if (!ok) {
    const err = data?.error?.message || `HTTP ${status}`;
    console.error('Groq error:', err);
    return { text: null, error: err, provider: 'groq' };
  }
  const text = data?.choices?.[0]?.message?.content?.trim() || null;
  return { text, error: text ? null : 'empty_response', provider: 'groq' };
}

/** Google Gemini — optional GEMINI_API_KEY */
async function callGemini(messages) {
  const key = process.env.GEMINI_API_KEY || config.geminiKey || '';
  if (!key) return { text: null, error: 'missing_key', provider: 'gemini' };

  const system = messages.find((m) => m.role === 'system')?.content || '';
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const { ok, status, data } = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: 0.45, maxOutputTokens: 420 },
      }),
    },
    25000
  );

  if (!ok) {
    const err = data?.error?.message || `HTTP ${status}`;
    console.error('Gemini error:', err);
    return { text: null, error: err, provider: 'gemini' };
  }
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim() || null;
  return { text, error: text ? null : 'empty_response', provider: 'gemini' };
}

/**
 * Pollinations anonymous text API (online, no key required for GET).
 * Used so the hotel still gets natural LLM replies when OpenAI quota fails.
 */
async function callPollinations(messages) {
  const system = messages.find((m) => m.role === 'system')?.content || '';
  const recent = messages
    .filter((m) => m.role !== 'system')
    .slice(-6)
    .map((m) => `${m.role === 'assistant' ? 'Concierge' : 'Guest'}: ${m.content}`)
    .join('\n');

  const prompt = `${system}

---
Conversation:
${recent}

Concierge (reply in English only, answer the guest's latest message directly, under 100 words):`;

  const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&temperature=0.4`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);
  try {
    const r = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'text/plain' },
      signal: controller.signal,
    });
    const text = (await r.text()).trim();
    if (!r.ok) {
      console.error('Pollinations error:', r.status, text.slice(0, 200));
      return { text: null, error: `HTTP ${r.status}`, provider: 'pollinations' };
    }
    if (!text || /payment required|api key/i.test(text)) {
      return { text: null, error: text.slice(0, 120) || 'empty', provider: 'pollinations' };
    }
    // Strip accidental role prefixes
    const cleaned = text.replace(/^(Concierge|Assistant|AI)\s*:\s*/i, '').trim();
    return { text: cleaned, error: null, provider: 'pollinations' };
  } catch (err) {
    console.error('Pollinations fetch failed:', err.message);
    return { text: null, error: err.message, provider: 'pollinations' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Online cascade: OpenAI → Groq → Gemini → Pollinations
 * Always uses the same hotel system prompt for accuracy.
 */
export async function generateOnlineReply({ message, history = [], liveContext = '' }) {
  const messages = buildMessages(message, history, liveContext);
  const errors = [];

  const providers = [callOpenAI, callGroq, callGemini, callPollinations];
  for (const fn of providers) {
    try {
      const result = await fn(messages);
      if (result.text) {
        return {
          text: result.text,
          provider: result.provider,
          error: null,
          tried: errors,
        };
      }
      if (result.error && result.error !== 'missing_key') {
        errors.push(`${result.provider}: ${result.error}`);
      }
    } catch (e) {
      errors.push(`${fn.name}: ${e.message}`);
    }
  }

  return {
    text: null,
    provider: null,
    error: errors[0] || 'all_providers_failed',
    tried: errors,
  };
}

export function getLlmStatus() {
  return {
    openai_configured: Boolean(config.openaiKey),
    openai_cooldown: inCooldown(),
    openai_last_error: lastOpenAiError,
    groq_configured: Boolean(process.env.GROQ_API_KEY || config.groqKey),
    gemini_configured: Boolean(process.env.GEMINI_API_KEY || config.geminiKey),
    pollinations: true,
    mode: 'online_cascade',
  };
}
