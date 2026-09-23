import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Command } from 'cmdk';
import type { PaletteItem } from '~/lib/palette';
import './command-palette.css';

const GROUP_ORDER = ['Projects', 'Pages', 'Links', 'Actions'] as const;

export default function CommandPalette({ items }: { items: PaletteItem[] }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const grouped = useMemo(
    () => GROUP_ORDER.map((g) => [g, items.filter((i) => i.group === g)] as const).filter(([, v]) => v.length),
    [items],
  );

  const show = useCallback((next: boolean) => {
    if (next) restoreFocus.current = document.activeElement as HTMLElement | null;
    setOpen(next);
    if (!next) restoreFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        show(!open);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        show(false);
      }
    };
    const onOpenRequest = () => show(true);
    document.addEventListener('keydown', onKey);
    document
      .querySelectorAll('[data-open-palette]')
      .forEach((el) => el.addEventListener('click', onOpenRequest));
    return () => {
      document.removeEventListener('keydown', onKey);
      document
        .querySelectorAll('[data-open-palette]')
        .forEach((el) => el.removeEventListener('click', onOpenRequest));
    };
  }, [open, show]);

  // Re-bind the trigger buttons after a view transition swaps the document body.
  useEffect(() => {
    const rebind = () => setOpen(false);
    document.addEventListener('astro:page-load', rebind);
    return () => document.removeEventListener('astro:page-load', rebind);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const run = (item: PaletteItem) => {
    show(false);
    if (item.action === 'theme') {
      document.getElementById('theme-toggle')?.click();
      return;
    }
    if (item.action === 'copy-email') {
      const email = item.hint ?? '';
      navigator.clipboard
        ?.writeText(email)
        .then(() => setToast(`Copied ${email}`))
        .catch(() => setToast(`Email: ${email}`));
      return;
    }
    if (item.href) {
      if (item.external) window.open(item.href, '_blank', 'noopener');
      else window.location.href = item.href;
    }
  };

  return (
    <>
      {open && (
        <div className="cmdk-overlay" onClick={() => show(false)}>
          <Command
            label="Command palette"
            className="cmdk"
            onClick={(e) => e.stopPropagation()}
            loop
          >
            <div className="cmdk__bar">
              <Command.Input autoFocus placeholder="Jump to a project, page or link…" />
              <kbd className="cmdk__esc">Esc</kbd>
            </div>
            <Command.List>
              <Command.Empty>No match.</Command.Empty>
              {grouped.map(([group, entries]) => (
                <Command.Group key={group} heading={group}>
                  {entries.map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.label} ${item.hint ?? ''}`}
                      onSelect={() => run(item)}
                    >
                      <span>{item.label}</span>
                      {item.hint && <span className="cmdk__hint">{item.hint}</span>}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </div>
      )}
      <div className="cmdk-toast" role="status" aria-live="polite">
        {toast}
      </div>
    </>
  );
}
