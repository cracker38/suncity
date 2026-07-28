const STATUS_COLORS = {
  // booking
  pending:      { bg: '#fef3c7', color: '#92400e' },
  confirmed:    { bg: '#d1fae5', color: '#065f46' },
  checked_in:   { bg: '#dbeafe', color: '#1e40af' },
  checked_out:  { bg: '#f3f4f6', color: '#374151' },
  cancelled:    { bg: '#fee2e2', color: '#991b1b' },
  no_show:      { bg: '#fce7f3', color: '#9d174d' },
  // payment
  unpaid:       { bg: '#fee2e2', color: '#991b1b' },
  partial:      { bg: '#fef3c7', color: '#92400e' },
  paid:         { bg: '#d1fae5', color: '#065f46' },
  refunded:     { bg: '#ede9fe', color: '#5b21b6' },
  completed:    { bg: '#d1fae5', color: '#065f46' },
  failed:       { bg: '#fee2e2', color: '#991b1b' },
  // rooms
  available:    { bg: '#d1fae5', color: '#065f46' },
  occupied:     { bg: '#dbeafe', color: '#1e40af' },
  cleaning:     { bg: '#fef3c7', color: '#92400e' },
  maintenance:  { bg: '#fee2e2', color: '#991b1b' },
  reserved:     { bg: '#ede9fe', color: '#5b21b6' },
  // tasks
  open:         { bg: '#fef3c7', color: '#92400e' },
  in_progress:  { bg: '#dbeafe', color: '#1e40af' },
  resolved:     { bg: '#d1fae5', color: '#065f46' },
  closed:       { bg: '#f3f4f6', color: '#374151' },
  // events/catering
  quoted:       { bg: '#fef3c7', color: '#92400e' },
  accepted:     { bg: '#d1fae5', color: '#065f46' },
  rejected:     { bg: '#fee2e2', color: '#991b1b' },
  // general
  active:       { bg: '#d1fae5', color: '#065f46' },
  inactive:     { bg: '#f3f4f6', color: '#374151' },
  draft:        { bg: '#f3f4f6', color: '#374151' },
  published:    { bg: '#d1fae5', color: '#065f46' },
  approved:     { bg: '#d1fae5', color: '#065f46' },
  urgent:       { bg: '#fee2e2', color: '#991b1b' },
  high:         { bg: '#fce7f3', color: '#9d174d' },
  medium:       { bg: '#fef3c7', color: '#92400e' },
  low:          { bg: '#f3f4f6', color: '#374151' },
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const key = String(status).toLowerCase().replace(/ /g, '_');
  const style = STATUS_COLORS[key] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.22rem 0.65rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.03em',
        background: style.bg,
        color: style.color,
        whiteSpace: 'nowrap',
      }}
    >
      {String(status).replace(/_/g, ' ')}
    </span>
  );
}
