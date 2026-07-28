import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/authStore';
import { OverviewCards, PageHeader, DataTable, useApiList } from './SharedDash.jsx';

const RESTAURANT_KEYS = ['restaurant_sales', 'customer_satisfaction', 'revenue', 'todays_bookings'];

function ErrorAlert({ error }) {
  if (!error) return null;
  return <div className="alert alert-error">{error}</div>;
}

function Loading({ loading, children }) {
  if (loading) return <p>Loading...</p>;
  return children;
}

export function RestaurantOverview() {
  const { rows: orders } = useApiList('/restaurant/orders');
  const { rows: reservations } = useApiList('/restaurant/reservations');

  return (
    <div>
      <PageHeader title="Restaurant Overview" />
      <OverviewCards filterKeys={RESTAURANT_KEYS} />
      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <div className="card">
          <h3>Today&apos;s orders</h3>
          <p className="value" style={{ fontSize: '1.5rem' }}>{orders.filter((o) => o.status !== 'cancelled').length}</p>
        </div>
        <div className="card">
          <h3>Table reservations</h3>
          <p className="value" style={{ fontSize: '1.5rem' }}>{reservations.length}</p>
        </div>
      </div>
    </div>
  );
}

export function RestaurantMenu() {
  const [menu, setMenu] = useState({ items: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [item, setItem] = useState({ category_id: '', name: '', description: '', price: 0, stock_qty: 50 });
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/restaurant/menu/manage');
      const data = res.data || { items: [], categories: [] };
      setMenu(data);
      if (data.categories?.[0] && !item.category_id) {
        setItem((prev) => ({ ...prev, category_id: data.categories[0].id }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load().catch(() => {}); }, []);

  async function addItem(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/restaurant/menu/items', {
        ...item,
        category_id: Number(item.category_id),
        price: Number(item.price),
      });
      if (item.stock_qty != null) {
        // stock set after create via manage list refresh + patch not needed if default 50
      }
      setMsg('Menu item added.');
      setItem({
        category_id: menu.categories[0]?.id || '',
        name: '',
        description: '',
        price: 0,
        stock_qty: 50,
      });
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function toggleAvailable(row) {
    try {
      await api.patch(`/restaurant/menu/items/${row.id}`, { is_available: !row.is_available });
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function updateStock(row, stock_qty) {
    try {
      await api.patch(`/restaurant/menu/items/${row.id}`, { stock_qty: Number(stock_qty) });
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div>
      <PageHeader title="Menu Management" />
      <div className="grid-2">
        <div className="card">
          <h3>All menu items</h3>
          <ErrorAlert error={error} />
          <Loading loading={loading}>
            <DataTable
              columns={[
                { key: 'name', label: 'Item' },
                { key: 'category_name', label: 'Category' },
                { render: (r) => formatMoney(r.price), label: 'Price' },
                {
                  render: (r) => (r.is_available ? 'Available' : 'Hidden'),
                  label: 'Status',
                },
                {
                  render: (r) => (
                    <input
                      className="input"
                      type="number"
                      min="0"
                      defaultValue={r.stock_qty ?? 50}
                      style={{ maxWidth: 80 }}
                      onBlur={(e) => {
                        if (Number(e.target.value) !== Number(r.stock_qty)) {
                          updateStock(r, e.target.value);
                        }
                      }}
                    />
                  ),
                  label: 'Stock',
                },
                {
                  render: (r) => (
                    <button className="btn btn-outline btn-sm" type="button" onClick={() => toggleAvailable(r)}>
                      {r.is_available ? 'Hide' : 'Show'}
                    </button>
                  ),
                  label: 'Action',
                },
              ]}
              rows={menu.items || []}
            />
          </Loading>
        </div>
        <form className="card" onSubmit={addItem}>
          <h3>Add menu item</h3>
          {msg && <div className="alert alert-success">{msg}</div>}
          <div className="form-group">
            <label className="label">Name</label>
            <input className="input" required value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <input className="input" value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Category</label>
              <select
                className="input"
                required
                value={item.category_id}
                onChange={(e) => setItem({ ...item, category_id: e.target.value })}
              >
                <option value="">Select category</option>
                {(menu.categories || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Price (RWF)</label>
              <input className="input" type="number" required value={item.price} onChange={(e) => setItem({ ...item, price: e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary" type="submit">Add item</button>
        </form>
      </div>
    </div>
  );
}

export function RestaurantReservations() {
  const { rows, loading, error, reload } = useApiList('/restaurant/reservations');

  async function setStatus(id, status) {
    try {
      await api.patch(`/restaurant/reservations/${id}`, { status });
      reload();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div>
      <PageHeader title="Table Reservations" action={<button className="btn btn-outline" onClick={() => reload()}>Refresh</button>} />
      <div className="card">
        <ErrorAlert error={error} />
        <Loading loading={loading}>
          <DataTable
            columns={[
              { key: 'guest_name', label: 'Guest' },
              { key: 'guest_phone', label: 'Phone' },
              { key: 'reservation_date', label: 'Date' },
              { key: 'reservation_time', label: 'Time' },
              { key: 'guests', label: 'Party size' },
              { key: 'status', label: 'Status' },
              {
                label: 'Actions',
                render: (r) => (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {r.status === 'pending' && (
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => setStatus(r.id, 'confirmed')}>Confirm</button>
                    )}
                    {['pending', 'confirmed'].includes(r.status) && (
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => setStatus(r.id, 'seated')}>Seat</button>
                    )}
                    {['pending', 'confirmed', 'seated'].includes(r.status) && (
                      <button className="btn btn-dark btn-sm" type="button" onClick={() => setStatus(r.id, 'completed')}>Complete</button>
                    )}
                    {r.status !== 'cancelled' && r.status !== 'completed' && (
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => setStatus(r.id, 'cancelled')}>Cancel</button>
                    )}
                  </div>
                ),
              },
            ]}
            rows={rows}
          />
        </Loading>
      </div>
    </div>
  );
}

export function RestaurantOrders() {
  const { rows, loading, error, reload } = useApiList('/restaurant/orders');
  const [menuItems, setMenuItems] = useState([]);
  const [orderForm, setOrderForm] = useState({ item_id: '', qty: 1 });
  const [cart, setCart] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/restaurant/menu/manage')
      .then((r) => setMenuItems((r.data?.items || []).filter((i) => i.is_available)))
      .catch(() => {});
  }, []);

  async function updateStatus(id, status) {
    try {
      await api.patch(`/restaurant/orders/${id}`, { status });
      reload();
    } catch (e) {
      alert(e.message);
    }
  }

  function addToCart() {
    const item = menuItems.find((i) => String(i.id) === String(orderForm.item_id));
    if (!item) return;
    const qty = Math.max(1, Number(orderForm.qty) || 1);
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + qty } : c));
      }
      return [...prev, { id: item.id, name: item.name, price: Number(item.price), qty }];
    });
  }

  async function createOrder(e) {
    e.preventDefault();
    if (!cart.length) {
      alert('Add at least one item to the order.');
      return;
    }
    setMsg('');
    const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
    try {
      await api.post('/restaurant/orders', {
        items: cart.map((c) => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
        total_amount: total,
      });
      setMsg(`Order created — ${formatMoney(total)}`);
      setCart([]);
      reload();
    } catch (err) {
      alert(err.message);
    }
  }

  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);

  return (
    <div>
      <PageHeader title="Orders & Kitchen" />
      <div className="grid-2" style={{ marginBottom: '1rem' }}>
        <form className="card" onSubmit={createOrder}>
          <h3>Create order</h3>
          {msg && <div className="alert alert-success">{msg}</div>}
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Menu item</label>
              <select
                className="input"
                value={orderForm.item_id}
                onChange={(e) => setOrderForm({ ...orderForm, item_id: e.target.value })}
              >
                <option value="">Select item</option>
                {menuItems.map((i) => (
                  <option key={i.id} value={i.id}>{i.name} — {formatMoney(i.price)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Qty</label>
              <input
                className="input"
                type="number"
                min="1"
                value={orderForm.qty}
                onChange={(e) => setOrderForm({ ...orderForm, qty: e.target.value })}
              />
            </div>
          </div>
          <button className="btn btn-outline" type="button" onClick={addToCart} style={{ marginBottom: 12 }}>
            Add to order
          </button>
          {cart.length > 0 && (
            <ul style={{ marginBottom: 12 }}>
              {cart.map((c) => (
                <li key={c.id}>
                  {c.name} × {c.qty} — {formatMoney(c.price * c.qty)}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ marginLeft: 8 }}
                    onClick={() => setCart((prev) => prev.filter((x) => x.id !== c.id))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p><strong>Total: {formatMoney(cartTotal)}</strong></p>
          <button className="btn btn-primary" type="submit">Place order</button>
        </form>
        <div className="card">
          <h3>Kitchen board</h3>
          <ErrorAlert error={error} />
          <Loading loading={loading}>
            <DataTable
              columns={[
                { key: 'order_code', label: 'Order' },
                { render: (r) => formatMoney(r.total_amount), label: 'Total' },
                { key: 'status', label: 'Status' },
                {
                  render: (r) => (
                    <select className="input" value={r.status} onChange={(e) => updateStatus(r.id, e.target.value)} style={{ maxWidth: 130 }}>
                      <option value="pending">Pending</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready">Ready</option>
                      <option value="served">Served</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  ),
                  label: 'Update',
                },
              ]}
              rows={rows}
            />
          </Loading>
        </div>
      </div>
    </div>
  );
}

export function RestaurantInventory() {
  const [data, setData] = useState({ items: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/restaurant/inventory');
      setData(res.data || { items: [], summary: {} });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load().catch(() => {}); }, []);

  async function saveStock(id, stock_qty) {
    try {
      await api.patch(`/restaurant/menu/items/${id}`, { stock_qty: Number(stock_qty) });
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  const s = data.summary || {};

  return (
    <div>
      <PageHeader title="Inventory Overview" action={<button className="btn btn-outline" onClick={() => load()}>Refresh</button>} />
      <ErrorAlert error={error} />
      {loading ? <p>Loading...</p> : (
        <>
          <div className="grid-4">
            <div className="stat-card"><div className="value">{s.total_items || 0}</div><p className="label">Menu items</p></div>
            <div className="stat-card"><div className="value">{s.in_stock || 0}</div><p className="label">In stock</p></div>
            <div className="stat-card"><div className="value">{s.low_stock || 0}</div><p className="label">Low stock (≤10)</p></div>
            <div className="stat-card"><div className="value">{s.unavailable || 0}</div><p className="label">Unavailable / out</p></div>
          </div>
          <div className="card" style={{ marginTop: '1rem' }}>
            <DataTable
              columns={[
                { key: 'name', label: 'Item' },
                { key: 'category_name', label: 'Category' },
                { render: (r) => (r.is_available ? 'Yes' : 'No'), label: 'On menu' },
                {
                  render: (r) => (
                    <input
                      className="input"
                      type="number"
                      min="0"
                      defaultValue={r.stock_qty}
                      style={{ maxWidth: 90 }}
                      onBlur={(e) => {
                        if (Number(e.target.value) !== Number(r.stock_qty)) {
                          saveStock(r.id, e.target.value);
                        }
                      }}
                    />
                  ),
                  label: 'Stock qty',
                },
                {
                  render: (r) => {
                    const q = Number(r.stock_qty);
                    if (q <= 0) return 'Out';
                    if (q <= 10) return 'Low';
                    return 'OK';
                  },
                  label: 'Alert',
                },
              ]}
              rows={data.items || []}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function RestaurantSales() {
  const { rows, loading, error } = useApiList('/restaurant/orders');

  const stats = useMemo(() => {
    const active = rows.filter((o) => o.status !== 'cancelled');
    const total = active.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const avg = active.length ? total / active.length : 0;
    return { count: active.length, total, avg };
  }, [rows]);

  return (
    <div>
      <PageHeader title="Sales Totals" />
      <ErrorAlert error={error} />
      {loading ? <p>Loading...</p> : (
        <>
          <div className="grid-3">
            <div className="stat-card"><div className="value">{formatMoney(stats.total)}</div><p className="label">Total sales</p></div>
            <div className="stat-card"><div className="value">{stats.count}</div><p className="label">Orders</p></div>
            <div className="stat-card"><div className="value">{formatMoney(stats.avg)}</div><p className="label">Average order</p></div>
          </div>
          <div className="card" style={{ marginTop: '1rem' }}>
            <DataTable
              columns={[
                { key: 'order_code', label: 'Order' },
                { render: (r) => formatMoney(r.total_amount), label: 'Amount' },
                { key: 'status', label: 'Status' },
                { key: 'created_at', label: 'Date' },
              ]}
              rows={rows.filter((o) => o.status !== 'cancelled').slice(0, 50)}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function RestaurantReports() {
  return (
    <div>
      <PageHeader title="Restaurant Reports" />
      <OverviewCards filterKeys={RESTAURANT_KEYS} />
    </div>
  );
}

export function RestaurantPromotions() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/cms/offers').then((r) => setOffers(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Promotions & Offers" />
      <div className="card">
        {loading ? <p>Loading...</p> : offers.length === 0 ? (
          <div className="dash-empty">
            <p>No active offers. Ask Admin to create promotions under CMS → Offers.</p>
          </div>
        ) : (
          <div className="grid-2">
            {offers.map((o) => (
              <div key={o.id} className="card">
                <h3>{o.title}</h3>
                <p>{o.description}</p>
                {o.discount_percent > 0 && <strong>{o.discount_percent}% off</strong>}
                {o.coupon_code && <p>Code: <code>{o.coupon_code}</code></p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function RestaurantFeedback() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/cms/testimonials')
      .then((r) => setReviews(r.data || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Guest Feedback" />
      <div className="card">
        <ErrorAlert error={error} />
        {loading ? <p>Loading...</p> : reviews.length === 0 ? (
          <div className="dash-empty">
            <p>No guest testimonials yet. Approved reviews from the website appear here.</p>
          </div>
        ) : (
          reviews.map((t) => (
            <div key={t.id} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
              <strong>{t.guest_name || t.author_name}</strong>
              {t.rating && <span> · {'★'.repeat(t.rating)}</span>}
              <p>{t.content || t.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
