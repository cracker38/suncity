import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { formatMoney, useAuth } from '../lib/authStore';
import Seo from '../components/Seo';

export default function Book() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selected, setSelected] = useState(params.get('room_type_id') || '');
  const [form, setForm] = useState({
    check_in: params.get('check_in') || '',
    check_out: params.get('check_out') || '',
    adults: params.get('guests') || 2,
    children: 0,
    guest_name: user ? `${user.first_name} ${user.last_name}` : '',
    guest_email: user?.email || '',
    guest_phone: user?.phone || '',
    special_requests: '',
  });
  const [booking, setBooking] = useState(null);
  const [method, setMethod] = useState('mtn_momo');
  const [phone, setPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [coupon, setCoupon] = useState('');
  const [couponInfo, setCouponInfo] = useState(null);
  const [paid, setPaid] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedRoom = useMemo(
    () => rooms.find((r) => String(r.id) === String(selected)),
    [rooms, selected]
  );

  const needsMobile = method === 'mtn_momo' || method === 'airtel_money';
  const needsCard = method === 'visa' || method === 'mastercard';

  async function loadAvailability() {
    if (!form.check_in || !form.check_out) return;
    const today = new Date().toISOString().slice(0, 10);
    if (form.check_in < today) { setError('Check-in date cannot be in the past.'); return; }
    if (form.check_out <= form.check_in) { setError('Check-out must be after check-in.'); return; }
    try {
      const res = await api.get(
        `/rooms/availability?check_in=${form.check_in}&check_out=${form.check_out}&guests=${form.adults}`
      );
      setRooms(res.data || []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (form.guest_phone && !phone) setPhone(form.guest_phone);
  }, [form.guest_phone, phone]);

  async function applyCoupon() {
    setError('');
    setCouponInfo(null);
    if (!coupon.trim()) return;
    try {
      const res = await api.get(`/cms/offers/validate?code=${encodeURIComponent(coupon.trim())}`);
      setCouponInfo(res.data);
      setMsg(`Coupon applied: ${res.data.discount_percent}% off`);
    } catch (err) {
      setCouponInfo(null);
      setError(err.message);
    }
  }

  async function createBooking(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/bookings', {
        room_type_id: Number(selected),
        ...form,
        adults: Number(form.adults),
        children: Number(form.children),
        coupon_code: coupon.trim() || undefined,
      });
      setBooking(res.data);
      setPaid(false);
      setMsg(res.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function pay() {
    setLoading(true);
    setError('');
    try {
      const payload = {
        booking_id: booking.id,
        method,
        guest_email: form.guest_email || booking.guest_email,
        phone: needsMobile ? phone : undefined,
        card_number: needsCard ? cardNumber : undefined,
        card_exp: needsCard ? cardExp : undefined,
        card_cvv: needsCard ? cardCvv : undefined,
      };
      const res = await api.post('/payments/charge', payload);
      if (res.data?.status === 'completed') {
        setPaid(true);
        setMsg(`Payment successful — ${res.data.payment_ref} · ${formatMoney(res.data.amount)}`);
      } else if (res.data?.status === 'pending_at_reception') {
        setMsg(res.data.message || res.message);
      } else {
        setMsg(res.message || `Payment ${res.data?.status}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Seo
        title="Book Your Stay"
        description="Reserve rooms at SUN CITY NYAKARAMBI with real-time availability and secure payment options."
        canonical="https://www.suncity.rw/book"
      />
      <section className="page-hero">
        <div><h1>Book Your Stay</h1><p>Real-time availability, secure reservation, and flexible payment options.</p></div>
      </section>
      <section className="section">
        <div className="container grid-2">
          <form className="card" style={{ padding: '1.25rem' }} onSubmit={(e) => { e.preventDefault(); loadAvailability(); }}>
            <h2>Search Availability</h2>
            <div className="form-group"><label className="label">Check-in</label>
              <input className="input" type="date" required value={form.check_in}
                onChange={(e) => setForm({ ...form, check_in: e.target.value })} /></div>
            <div className="form-group"><label className="label">Check-out</label>
              <input className="input" type="date" required value={form.check_out}
                onChange={(e) => setForm({ ...form, check_out: e.target.value })} /></div>
            <div className="form-group"><label className="label">Adults</label>
              <input className="input" type="number" min="1" value={form.adults}
                onChange={(e) => setForm({ ...form, adults: e.target.value })} /></div>
            <button className="btn btn-outline" type="submit">Check Availability</button>
          </form>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h2>Available Rooms</h2>
            {rooms.length === 0 && <p>Select dates to view availability.</p>}
            {rooms.map((r) => (
              <label key={r.id} style={{ display: 'flex', gap: '0.8rem', padding: '0.8rem 0', borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}>
                <input type="radio" name="room" checked={String(selected) === String(r.id)} onChange={() => setSelected(r.id)} />
                <div style={{ flex: 1 }}>
                  <strong>{r.name}</strong>
                  <p style={{ margin: 0 }}>{r.short_description}</p>
                  <span>{formatMoney(r.base_price)}/night · {r.available_count} available</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {!booking && selectedRoom && (
          <form className="container card" style={{ padding: '1.25rem', marginTop: '1.5rem', maxWidth: 720 }} onSubmit={createBooking}>
            <h2>Guest Details — {selectedRoom.name}</h2>
            {error && <div className="alert alert-error">{error}</div>}
            {['guest_name', 'guest_email', 'guest_phone'].map((f) => (
              <div className="form-group" key={f}>
                <label className="label">{f.replaceAll('_', ' ')}</label>
                <input className="input" required={f !== 'guest_phone'} value={form[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })} />
              </div>
            ))}
            <div className="form-group"><label className="label">Special requests</label>
              <textarea className="textarea" value={form.special_requests}
                onChange={(e) => setForm({ ...form, special_requests: e.target.value })} /></div>
            <div className="form-group">
              <label className="label">Coupon code (optional)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="e.g. WEEKEND15" />
                <button className="btn btn-outline" type="button" onClick={applyCoupon}>Apply</button>
              </div>
              {couponInfo && (
                <small style={{ color: '#114B3A' }}>
                  {couponInfo.title}: {couponInfo.discount_percent}% discount will apply at confirmation.
                </small>
              )}
            </div>
            {msg && !booking && <div className="alert alert-success">{msg}</div>}
            <button className="btn btn-primary" disabled={loading}>{loading ? 'Booking...' : 'Confirm Reservation'}</button>
          </form>
        )}

        {booking && (
          <div className="container card" style={{ padding: '1.25rem', marginTop: '1.5rem', maxWidth: 720 }}>
            <h2>{paid ? 'Payment complete' : 'Complete payment'}</h2>
            {msg && <div className="alert alert-success">{msg}</div>}
            {error && <div className="alert alert-error">{error}</div>}
            <p>Code: <strong>{booking.booking_code}</strong></p>
            {booking.discount_amount > 0 && (
              <p>Discount ({booking.coupon_code}): <strong>-{formatMoney(booking.discount_amount)}</strong></p>
            )}
            <p>Room total: <strong>{formatMoney(booking.total_amount)}</strong></p>
            <p>Invoice: {booking.invoice_number} (incl. 18% VAT on payment)</p>

            {!paid && (
              <>
                <h3>Pay securely</h3>
                <p>MTN MoMo, Airtel Money, Visa, Mastercard, or pay cash at reception.</p>
                <div className="form-group">
                  <label className="label">Method</label>
                  <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
                    <option value="mtn_momo">MTN MoMo</option>
                    <option value="airtel_money">Airtel Money</option>
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="cash">Pay at reception (cash)</option>
                  </select>
                </div>
                {needsMobile && (
                  <div className="form-group">
                    <label className="label">Mobile money number</label>
                    <input
                      className="input"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={method === 'mtn_momo' ? '078xxxxxxx' : '072xxxxxxx'}
                    />
                  </div>
                )}
                {needsCard && (
                  <>
                    <div className="form-group">
                      <label className="label">Card number</label>
                      <input className="input" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="4111 1111 1111 1111" />
                    </div>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="label">Expiry (MM/YY)</label>
                        <input className="input" value={cardExp} onChange={(e) => setCardExp(e.target.value)} placeholder="12/28" />
                      </div>
                      <div className="form-group">
                        <label className="label">CVV</label>
                        <input className="input" value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} placeholder="123" />
                      </div>
                    </div>
                    <small style={{ color: '#6b7280' }}>Sandbox accepts valid Luhn test cards (e.g. Visa 4111…).</small>
                  </>
                )}
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: 12 }}>
                  <button className="btn btn-primary" onClick={pay} disabled={loading} type="button">
                    {loading ? 'Processing…' : method === 'cash' ? 'Reserve cash payment' : 'Pay now'}
                  </button>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: 16 }}>
              {(user || paid) && (
                <button className="btn btn-outline" type="button"
                  onClick={() => api.download(`/bookings/${booking.id}/invoice.pdf`, `invoice-${booking.booking_code}.pdf`)}>
                  Download Invoice PDF
                </button>
              )}
              <Link className="btn btn-dark" to={user ? '/dashboard/bookings' : '/login'}>
                {user ? 'My Bookings' : 'Login for History'}
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
