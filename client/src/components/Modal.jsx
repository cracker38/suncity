import { useEffect, useRef } from 'react';
import './Modal.css';

/**
 * Generic modal.
 * Props: open, onClose, title, children, size ('sm'|'md'|'lg')
 */
export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    ref.current?.focus();
    return () => prev?.focus();
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div
        ref={ref}
        tabIndex={-1}
        className={`modal-panel modal-${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
