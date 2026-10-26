import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { cn } from '../../lib/classNames.js';
import { Button } from './Button.jsx';

export function Modal({ children, className, description, isOpen, onClose, title }) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = dialogRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/30 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className={cn(
          'max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white bg-white p-6 shadow-lift sm:rounded-3xl sm:p-8',
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 id={titleId} className="text-xl font-bold text-ink-900">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-2 text-sm leading-6 text-ink-500">
                {description}
              </p>
            ) : null}
          </div>
          <Button
            ref={closeButtonRef}
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="size-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="mt-6">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
