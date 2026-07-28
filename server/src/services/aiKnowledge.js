import { config as hotelConfig } from '../config/index.js';

/** Authoritative hotel facts injected into the ChatGPT system prompt */
export const HOTEL_KNOWLEDGE = {
  hotel: {
    name: hotelConfig.hotel.name,
    address: hotelConfig.hotel.address,
    phones: [hotelConfig.hotel.phone, hotelConfig.hotel.phoneAlt],
    email: hotelConfig.hotel.email,
    whatsapp: hotelConfig.hotel.whatsapp,
    website: hotelConfig.hotel.website,
    checkIn: '14:00',
    checkOut: '11:00',
    reception: '24/7',
    restaurantHours: '06:30–22:00',
    currency: 'RWF',
    language: 'English',
    payments: ['MTN MoMo', 'Airtel Money', 'Visa', 'Mastercard', 'Cash at reception'],
    wifi: 'Complimentary Wi‑Fi in rooms and public areas',
    parking: 'On-site guest parking available',
    pets: 'Pets are not allowed unless arranged in advance with reception',
    children: 'Children are welcome; family rooms sleep up to 4 guests',
    cancellation: 'Free cancellation up to 24 hours before check-in for most prepaid rates; confirm on your booking',
  },
  rooms: [
    { name: 'Standard Room', price: 45000, guests: 2, bed: 'Queen Bed', size: '22 sqm', amenities: 'Wi‑Fi, en-suite bath, TV, workspace' },
    { name: 'Deluxe Room', price: 65000, guests: 2, bed: 'King Bed', size: '30 sqm', amenities: 'Wi‑Fi, premium bath, TV, seating area' },
    { name: 'Twin Room', price: 55000, guests: 2, bed: 'Twin Beds', size: '26 sqm', amenities: 'Wi‑Fi, en-suite bath, TV' },
    { name: 'Family Room', price: 85000, guests: 4, bed: 'King + Twin', size: '40 sqm', amenities: 'Wi‑Fi, family layout, TV, larger living space' },
    { name: 'Executive Suite', price: 120000, guests: 3, bed: 'King Bed', size: '55 sqm', amenities: 'Wi‑Fi, lounge area, premium amenities, workspace' },
  ],
  services: [
    'Premium accommodation',
    'Restaurant & coffee station',
    'Conference halls',
    'Wedding & event venues',
    'Outside catering (corporate, wedding, school, NGO, private)',
    'Food & beverage solutions',
    'Airport / intercity transfers on request',
  ],
  faqs: [
    { q: 'What time is check-in and check-out?', a: 'Check-in from 14:00 and check-out until 11:00. Early check-in may be arranged based on availability.' },
    { q: 'Do you offer transfers?', a: 'Yes, airport or intercity transfers can be arranged on request. Contact reception for pricing.' },
    { q: 'Is outside catering available?', a: 'Yes. Corporate, wedding, school, NGO, and private event catering with quotation support.' },
    { q: 'Which payment methods do you accept?', a: 'MTN MoMo, Airtel Money, Visa, Mastercard, and cash at reception.' },
    { q: 'How do I book a conference hall?', a: 'Use the Events page booking form or contact us by phone/WhatsApp for availability.' },
    { q: 'Do you have Wi‑Fi?', a: 'Yes. Complimentary Wi‑Fi is available in rooms and public areas.' },
    { q: 'Is parking available?', a: 'Yes. On-site guest parking is available at the hotel.' },
    { q: 'Can I cancel my booking?', a: 'Most bookings allow free cancellation up to 24 hours before check-in. Check your confirmation or ask reception.' },
  ],
};

const STOP = new Set([
  'a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'been', 'to', 'of', 'in', 'on', 'at', 'for',
  'and', 'or', 'but', 'with', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'i', 'me', 'my',
  'you', 'your', 'we', 'our', 'they', 'them', 'this', 'that', 'it', 'please', 'tell', 'about', 'from',
  'have', 'has', 'had', 'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why', 'any', 'some',
]);

export function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s+\-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** Strong ChatGPT system prompt — hotel scope only, answer the actual question */
export function buildSystemPrompt(liveContext = '') {
  const h = HOTEL_KNOWLEDGE.hotel;
  const roomLines = HOTEL_KNOWLEDGE.rooms
    .map(
      (r) =>
        `- ${r.name}: RWF ${r.price.toLocaleString()}/night | up to ${r.guests} guests | ${r.bed} | ${r.size} | ${r.amenities}`
    )
    .join('\n');
  const faqLines = HOTEL_KNOWLEDGE.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n');

  return `You are the official Guest Concierge AI for ${h.name}, a luxury hotel in Rwanda.

## ROLE & SCOPE
- You only assist with this hotel: rooms, rates, bookings, restaurant, events/weddings/conferences, outside catering, payments, location, policies, and connecting guests to reception.
- Stay within this project scope. Do not discuss unrelated topics; politely redirect to hotel help.
- Always reply in clear, professional English.

## CONVERSATION QUALITY (MANDATORY)
- THINK about the guest's latest message, then answer THAT question directly.
- Never give a generic “I can help with rooms, bookings…” menu unless they greet you or ask what you can do.
- Never paste a fixed script. Write a natural, helpful reply for this turn.
- Match depth to the question: short for simple facts; fuller for comparisons or how-to.
- Tone: warm luxury hospitality (like a five-star front desk) — polished, never robotic, never pushy.
- Keep most replies under 120 words.
- Use RWF for money. Prefer live database rates when provided below.

## GREETINGS
- For hello/hi/good morning: welcome briefly as the virtual concierge and ask how you may help. Do not list every service.

## ACCURACY RULES
- Use ONLY the AUTHORITATIVE DATA and LIVE CONTEXT below for hotel facts (prices, hours, contacts, rooms).
- If live context conflicts with static rates, prefer LIVE CONTEXT.
- If you truly lack the fact, say so honestly and offer to connect them with reception — do not invent.

## BOOKING GUIDANCE
- Guide guests to Book Now on the website for live availability.
- Do not invent confirmation codes or invent room availability.

## ESCALATION
- If they ask for a human, agent, receptionist, manager, or report a complaint/urgent issue, acknowledge calmly and say Reception will be notified (the system creates the ticket).

## AUTHORITATIVE HOTEL DATA
Hotel: ${h.name}
Address: ${h.address}
Phones: ${h.phones.join(' / ')}
Email: ${h.email}
WhatsApp: +${h.whatsapp}
Website: ${h.website}
Check-in: ${h.checkIn} | Check-out: ${h.checkOut}
Reception: ${h.reception} | Restaurant hours: ${h.restaurantHours}
Payments: ${h.payments.join(', ')}
Wi‑Fi: ${h.wifi}
Parking: ${h.parking}
Children: ${h.children}
Pets: ${h.pets}
Cancellation: ${h.cancellation}

### Rooms (static reference)
${roomLines}

### Services
${HOTEL_KNOWLEDGE.services.map((s) => `- ${s}`).join('\n')}

### Reference FAQs
${faqLines}

### LIVE DATABASE CONTEXT (prefer for rates/offers/halls)
${liveContext || 'No live rows loaded.'}

Respond now to the guest's latest message only.`;
}

/** Detect clear human-agent requests */
export function wantsHumanAgent(message = '') {
  return /\b(talk to (an? )?(agent|human|receptionist|staff|manager)|speak (to|with) (an? )?(agent|human|receptionist|staff|manager)|real person|human agent|customer service|help desk|connect me (to|with) (a )?(human|agent|receptionist))\b/i.test(
    message
  ) || /\b(complaint|urgent|emergency|dispute)\b/i.test(message);
}

export function detectIntent(message) {
  const text = (message || '').trim();
  if (wantsHumanAgent(text)) return 'escalate';
  // Pure greeting only (not "hello, what are your rates?")
  if (/^(hi|hello|hey|good (morning|afternoon|evening)|how are you)[!?.\s]*$/i.test(text)) {
    return 'greeting';
  }
  if (/\b(room|suite|rate|price|how much)\b/i.test(text)) return 'rooms';
  if (/\b(book|reserv)/i.test(text)) return 'booking';
  if (/\b(restaurant|menu|breakfast|dining|food)\b/i.test(text)) return 'restaurant';
  if (/\b(wedding|conference|event|hall|meeting)\b/i.test(text)) return 'events';
  if (/\b(catering)\b/i.test(text)) return 'catering';
  if (/\b(where|location|address)\b/i.test(text)) return 'location';
  if (/\b(pay|momo|visa|payment)\b/i.test(text)) return 'payment';
  if (/\b(wifi|parking|transfer|cancel)\b/i.test(text)) return 'services';
  if (/\b(hi|hello|hey)\b/i.test(text)) return 'greeting_plus';
  return 'general';
}

function formatMoney(n) {
  return `RWF ${Number(n).toLocaleString()}`;
}

function findRoomMention(message, rooms) {
  const lower = message.toLowerCase();
  return rooms.find((r) => {
    const name = (r.name || '').toLowerCase();
    const short = name.replace(/\s+room$/, '').replace(/\s+suite$/, '');
    return lower.includes(name) || (short.length > 3 && lower.includes(short));
  });
}

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Compose a natural offline reply from hotel facts for THIS question.
 * Used only when ChatGPT quota/network fails.
 */
export function answerFromKnowledge(message, live = {}) {
  const intent = detectIntent(message);
  const h = HOTEL_KNOWLEDGE.hotel;
  const rooms = live.rooms?.length
    ? live.rooms
    : HOTEL_KNOWLEDGE.rooms.map((r) => ({
        name: r.name,
        base_price: r.price,
        max_guests: r.guests,
        short_description: `${r.bed}, ${r.size}`,
      }));

  if (intent === 'escalate') {
    return { reply: null, intent: 'escalate', confidence: 1, source: 'escalate' };
  }

  if (intent === 'greeting') {
    return {
      reply: `${timeGreeting()}. Welcome to ${h.name} in Nyakarambi. I can help with rooms and rates, reservations, dining, events, catering, or payments — what would you like to know?`,
      intent,
      confidence: 0.9,
      source: 'fallback',
    };
  }

  // "hello, what are the rates?" → answer the real question after a short courtesy
  const courtesy = intent === 'greeting_plus' ? `${timeGreeting()}. ` : '';

  const mentioned = findRoomMention(message, rooms);
  const isBookingAsk = intent === 'booking' || /\b(book|reserv|how (do|can) i (book|reserve))\b/i.test(message);

  if (mentioned && isBookingAsk) {
    const price = mentioned.base_price ?? mentioned.price;
    return {
      reply:
        courtesy +
        `To reserve our ${mentioned.name} (${formatMoney(price)} per night), open Book Now, choose your dates and guests, select ${mentioned.name}, confirm, then pay by MTN MoMo, Airtel Money, Visa, or Mastercard. I can also connect you with reception if you prefer.`,
      intent: 'booking',
      confidence: 0.9,
      source: 'fallback',
    };
  }

  if (mentioned) {
    const price = mentioned.base_price ?? mentioned.price;
    const guests = mentioned.max_guests ?? mentioned.guests;
    const desc = mentioned.short_description || '';
    return {
      reply:
        courtesy +
        `Regarding our ${mentioned.name}: it is ${formatMoney(price)} per night` +
        (guests ? ` for up to ${guests} guests` : '') +
        (desc ? ` (${desc})` : '') +
        `. Check-in from ${h.checkIn}, check-out by ${h.checkOut}. Would you like the booking steps?`,
      intent: 'rooms',
      confidence: 0.85,
      source: 'fallback',
    };
  }

  if (/\b(anniversary|romantic|honeymoon|couple|date night)\b/i.test(message)) {
    const suite = rooms.find((r) => /suite|executive/i.test(r.name));
    const deluxe = rooms.find((r) => /deluxe/i.test(r.name));
    const pick = suite || deluxe || rooms[rooms.length - 1];
    const price = pick.base_price ?? pick.price;
    return {
      reply:
        courtesy +
        `For a couple’s celebration, I recommend the ${pick.name} from ${formatMoney(price)} per night` +
        (pick.short_description ? ` — ${pick.short_description}` : '') +
        `. It is our most refined option for an anniversary stay. Shall I explain how to book it?`,
      intent: 'rooms',
      confidence: 0.9,
      source: 'fallback',
    };
  }

  if (/\b(family|kids|children|with child)\b/i.test(message)) {
    const family = rooms.find((r) => /family/i.test(r.name)) || rooms.find((r) => (r.max_guests || 0) >= 4);
    if (family) {
      const price = family.base_price ?? family.price;
      return {
        reply:
          courtesy +
          `For a family, the ${family.name} at ${formatMoney(price)} per night (up to ${family.max_guests || 4} guests) is the best fit. Children are welcome. I can walk you through booking if you like.`,
        intent: 'rooms',
        confidence: 0.88,
        source: 'fallback',
      };
    }
  }

  if (/\b(business|work trip|corporate travel)\b/i.test(message)) {
    const exec = rooms.find((r) => /executive|suite|deluxe/i.test(r.name));
    if (exec) {
      const price = exec.base_price ?? exec.price;
      return {
        reply:
          courtesy +
          `For a work trip, the ${exec.name} (${formatMoney(price)}/night) is a practical choice, and we also have conference facilities on site. Would you like rates for meetings as well?`,
        intent: 'rooms',
        confidence: 0.85,
        source: 'fallback',
      };
    }
  }

  if (intent === 'rooms' || /\b(price|rate|cost|how much)\b/i.test(message)) {
    const list = rooms.map((r) => `${r.name} ${formatMoney(r.base_price ?? r.price)}`).join(', ');
    return {
      reply:
        courtesy +
        `Here are our current nightly rates: ${list}. Check-in is ${h.checkIn} and check-out is ${h.checkOut}. Ask about any room by name for more detail, or say if you would like to book.`,
      intent: 'rooms',
      confidence: 0.85,
      source: 'fallback',
    };
  }

  if (intent === 'booking') {
    return {
      reply:
        courtesy +
        `You can complete a reservation on Book Now: choose dates and guests, select a room, confirm, then pay with MTN MoMo, Airtel Money, Visa, or Mastercard. Need help choosing a room first?`,
      intent,
      confidence: 0.85,
      source: 'fallback',
    };
  }

  if (intent === 'restaurant') {
    return {
      reply:
        courtesy +
        `Our restaurant serves breakfast, lunch, and dinner (${h.restaurantHours}), plus coffee, drinks, and desserts. You can view the menu and reserve a table on the Restaurant page.`,
      intent,
      confidence: 0.85,
      source: 'fallback',
    };
  }

  if (intent === 'events') {
    if (live.halls?.length) {
      const halls = live.halls
        .map((x) => `${x.name} (${x.type}, ${x.capacity} guests, from ${formatMoney(x.base_price)})`)
        .join('; ');
      return {
        reply:
          courtesy +
          `We host weddings, conferences, and private celebrations. Current venues: ${halls}. You may enquire via Conference, Wedding & Events, or ask me to notify reception.`,
        intent,
        confidence: 0.88,
        source: 'fallback',
      };
    }
    return {
      reply:
        courtesy +
        `We host conferences, weddings, corporate meetings, and private events with dedicated halls and packages. Visit Conference, Wedding & Events to start an enquiry.`,
      intent,
      confidence: 0.8,
      source: 'fallback',
    };
  }

  if (intent === 'catering') {
    return {
      reply:
        courtesy +
        `Outside catering is available for corporate, wedding, school, NGO, and private occasions. Request a quotation on Outside Catering, or I can connect you with reception for a custom quote.`,
      intent,
      confidence: 0.85,
      source: 'fallback',
    };
  }

  if (intent === 'location') {
    return {
      reply: courtesy + `We are at ${h.address}. Reception is available ${h.reception} on ${h.phones[0]}.`,
      intent,
      confidence: 0.92,
      source: 'fallback',
    };
  }

  if (intent === 'payment') {
    return {
      reply:
        courtesy +
        `We accept ${h.payments.join(', ')}. A PDF invoice is issued when your booking is confirmed.`,
      intent,
      confidence: 0.9,
      source: 'fallback',
    };
  }

  if (/\bwifi\b/i.test(message)) {
    return { reply: courtesy + `Yes — ${h.wifi}.`, intent: 'services', confidence: 0.92, source: 'fallback' };
  }
  if (/\bparking\b/i.test(message)) {
    return { reply: courtesy + `Yes — ${h.parking}.`, intent: 'services', confidence: 0.92, source: 'fallback' };
  }
  if (/\btransfer|airport\b/i.test(message)) {
    return {
      reply:
        courtesy +
        `Airport and intercity transfers can be arranged on request. Reception will confirm timing and rates for your trip.`,
      intent: 'services',
      confidence: 0.88,
      source: 'fallback',
    };
  }
  if (/\bcheck[\s-]?in|check[\s-]?out\b/i.test(message)) {
    return {
      reply: courtesy + `Check-in begins at ${h.checkIn} and check-out is by ${h.checkOut}. Early check-in may be arranged subject to availability.`,
      intent: 'services',
      confidence: 0.92,
      source: 'fallback',
    };
  }

  const tokens = new Set(tokenize(message));
  let best = null;
  for (const f of [...HOTEL_KNOWLEDGE.faqs, ...(live.faqs || []).map((x) => ({ q: x.question, a: x.answer }))]) {
    const words = tokenize(`${f.q} ${f.a}`);
    const hits = words.filter((w) => tokens.has(w)).length;
    const score = hits / Math.max(tokens.size, 1);
    if (!best || score > best.score) best = { score, a: f.a, q: f.q };
  }
  if (best && best.score >= 0.3) {
    return {
      reply: courtesy + best.a,
      intent: 'faq',
      confidence: best.score,
      source: 'fallback',
    };
  }

  const topic = [...tokens].slice(0, 5).join(' ');
  return {
    reply:
      courtesy +
      (topic
        ? `I want to answer you accurately about “${topic}”. `
        : '') +
      `Please tell me whether you need rooms and rates, a reservation, restaurant hours, events, catering, payments, or our address — or ask to speak with reception.`,
    intent: 'clarify',
    confidence: 0.35,
    source: 'fallback',
  };
}
