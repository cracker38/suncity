import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/authStore';
import { OverviewCards, PageHeader, DataTable, useApiList } from './SharedDash.jsx';

const FINANCE_KEYS = ['revenue', 'restaurant_sales', 'event_bookings', 'customer_satisfaction'];

function ErrorAlert({ error }) {
  if (!error) return null;
  return <div className="alert alert-error">{error}</div>;
}

function Loading({ loading, children }) {
  if (loading) return <p>Loading...</p>;
  return children;
}

function useFinance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function reload() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/reports/finance');
      setData(res.data);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload().catch(() => {}); }, []);

  return { data, loading, error, reload };
}

export function FinanceOverview() {
  const { data, loading, error } = useFinance();

  return (
    <div>
      <PageHeader title="Finance Overview" />
      <OverviewCards filterKeys={FINANCE_KEYS} />
      <ErrorAlert error={error} />
      {loading ? <p>Loading breakdown...</p> : data?.revenue_breakdown && (
        <div className="grid-4" style={{ marginTop: '1rem' }}>
          {Object.entries(data.revenue_breakdown).map(([k, v]) => (
            <div className="stat-card" key={k}>
              <div className="value">{formatMoney(v)}</div>
              <p className="label">{k}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FinancePayments() {
  const { data, loading, error, reload } = useFinance();

  async function refund(payment) {
    if (!window.confirm(`Refund ${formatMoney(payment.amount)} for ${payment.payment_ref}?`)) return;
    try {
      await api.post('/payments/refunds', { payment_id: payment.id, amount: payment.amount, reason: 'Staff refund' });
      reload();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div>
      <PageHeader title="Payments" />
      <div className="card">
        <ErrorAlert error={error} />
        <Loading loading={loading}>
          <DataTable
            columns={[
              { key: 'payment_ref', label: 'Reference' },
              { key: 'method', label: 'Method' },
              { render: (p) => formatMoney(p.amount), label: 'Amount' },
              { key: 'status', label: 'Status' },
              { key: 'paid_at', label: 'Paid at' },
              {
                render: (p) => p.status === 'completed' ? (
                  <button className="btn btn-outline btn-sm" onClick={() => refund(p)}>Refund</button>
                ) : null,
                label: 'Action',
              },
            ]}
            rows={data?.payments || []}
          />
        </Loading>
      </div>
    </div>
  );
}

export function FinanceInvoices() {
  const { data, loading, error } = useFinance();

  return (
    <div>
      <PageHeader title="Invoices" />
      <div className="card">
        <ErrorAlert error={error} />
        <Loading loading={loading}>
          <DataTable
            columns={[
              { key: 'invoice_number', label: 'Invoice #' },
              { render: (r) => formatMoney(r.total_amount), label: 'Total' },
              { render: (r) => formatMoney(r.tax_amount), label: 'Tax' },
              { key: 'status', label: 'Status' },
              { key: 'issued_at', label: 'Issued' },
            ]}
            rows={data?.invoices || []}
          />
        </Loading>
      </div>
    </div>
  );
}

export function FinanceRefunds() {
  const { data, loading, error } = useFinance();

  return (
    <div>
      <PageHeader title="Refunds" />
      <div className="card">
        <ErrorAlert error={error} />
        <Loading loading={loading}>
          <DataTable
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'payment_id', label: 'Payment' },
              { render: (r) => formatMoney(r.amount), label: 'Amount' },
              { key: 'reason', label: 'Reason' },
              { key: 'status', label: 'Status' },
              { key: 'created_at', label: 'Date' },
            ]}
            rows={data?.refunds || []}
            empty="No refunds recorded."
          />
        </Loading>
      </div>
    </div>
  );
}

export function FinanceRevenue() {
  const { data, loading, error } = useFinance();
  const breakdown = data?.revenue_breakdown || {};

  const labels = {
    accommodation: 'Accommodation',
    events: 'Events',
    restaurant: 'Restaurant',
    catering: 'Catering',
  };

  return (
    <div>
      <PageHeader title="Revenue Breakdown" />
      <ErrorAlert error={error} />
      {loading ? <p>Loading...</p> : (
        <>
          <div className="grid-4">
            {Object.entries(breakdown).map(([k, v]) => (
              <div className="stat-card" key={k}>
                <div className="value">{formatMoney(v)}</div>
                <p className="label">{labels[k] || k}</p>
              </div>
            ))}
          </div>
          <div className="card" style={{ marginTop: '1rem' }}>
            <h3>Total revenue</h3>
            <p className="value" style={{ fontSize: '1.75rem' }}>
              {formatMoney(Object.values(breakdown).reduce((s, v) => s + Number(v || 0), 0))}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function FinanceExpenses() {
  const { rows, loading, error, reload } = useApiList('/payments/expenses');
  const [entry, setEntry] = useState({ description: '', amount: '', category: 'operations', expense_date: new Date().toISOString().slice(0, 10) });
  const [msg, setMsg] = useState('');

  async function addExpense(e) {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/payments/expenses', {
        ...entry,
        amount: Number(entry.amount),
      });
      setEntry({ description: '', amount: '', category: 'operations', expense_date: new Date().toISOString().slice(0, 10) });
      setMsg('Expense saved');
      reload();
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function removeExpense(id) {
    if (!window.confirm('Delete this expense?')) return;
    await api.delete(`/payments/expenses/${id}`);
    reload();
  }

  const total = rows.reduce((s, n) => s + Number(n.amount || 0), 0);

  return (
    <div>
      <PageHeader title="Expenses & Taxes" />
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="grid-2">
        <form className="card" onSubmit={addExpense}>
          <h3>Record expense</h3>
          <div className="form-group">
            <label className="label">Description</label>
            <input className="input" required value={entry.description} onChange={(e) => setEntry({ ...entry, description: e.target.value })} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Amount (RWF)</label>
              <input className="input" type="number" required value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Date</label>
              <input className="input" type="date" required value={entry.expense_date} onChange={(e) => setEntry({ ...entry, expense_date: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Category</label>
            <select className="input" value={entry.category} onChange={(e) => setEntry({ ...entry, category: e.target.value })}>
              <option value="operations">Operations</option>
              <option value="supplies">Supplies</option>
              <option value="utilities">Utilities</option>
              <option value="marketing">Marketing</option>
              <option value="tax">Tax</option>
              <option value="other">Other</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit">Save expense</button>
        </form>
        <div className="card">
          <h3>Ledger ({formatMoney(total)})</h3>
          <ErrorAlert error={error} />
          {loading ? <p>Loading...</p> : (
            <DataTable
              columns={[
                { key: 'expense_date', label: 'Date' },
                { key: 'category', label: 'Category' },
                { key: 'description', label: 'Description' },
                { render: (n) => formatMoney(n.amount), label: 'Amount' },
                {
                  label: '',
                  render: (n) => (
                    <button className="btn btn-outline btn-sm" type="button" onClick={() => removeExpense(n.id)}>Delete</button>
                  ),
                },
              ]}
              rows={rows}
              empty="No expenses recorded yet."
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function FinanceReports() {
  const { data, loading, error } = useFinance();
  const chartData = data?.revenue_breakdown
    ? Object.entries(data.revenue_breakdown).map(([name, total]) => ({ name, total: Number(total) }))
    : [];

  return (
    <div>
      <PageHeader title="Finance Reports" />
      <ErrorAlert error={error} />
      {loading ? <p>Loading charts...</p> : (
        <>
          <OverviewCards filterKeys={FINANCE_KEYS} />
          <div className="card" style={{ marginTop: '1rem' }}>
            <h3>Revenue by department</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v) => formatMoney(v)} />
                  <Bar dataKey="total" fill="#114B3A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function FinanceExport() {
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function download(path, filename) {
    setError('');
    setMsg('');
    try {
      await api.download(path, filename);
      setMsg(`Downloaded ${filename}`);
    } catch (e) {
      setError(e.message);
    }
  }

  const exports = [
    { label: 'Payments (CSV)', path: '/reports/export/payments?format=csv', file: 'payments.csv' },
    { label: 'Payments (Excel)', path: '/reports/export/payments?format=xlsx', file: 'payments.xlsx' },
    { label: 'Invoices (CSV)', path: '/reports/export/invoices?format=csv', file: 'invoices.csv' },
    { label: 'Bookings (CSV)', path: '/reports/export/bookings?format=csv', file: 'bookings.csv' },
    { label: 'Occupancy (CSV)', path: '/reports/export/occupancy?format=csv', file: 'occupancy.csv' },
  ];

  return (
    <div>
      <PageHeader title="Export Data" />
      <ErrorAlert error={error} />
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="card">
        <p>Download financial and operational reports for accounting and analysis.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          {exports.map((ex) => (
            <button key={ex.file} className="btn btn-outline" onClick={() => download(ex.path, ex.file)}>
              {ex.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
