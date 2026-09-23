import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Command } from 'cmdk';
import type { PaletteItem } from '~/lib/palette';
import './command-palette.css';

interface PagefindResult {
  id: string;
  data: () => Promise<{ url: string; meta: { title?: string }; excerpt: string }>;
}
interface Pagefind {
  search: (q: string) => Promise<{ results: PagefindResult[] }>;
}

/**
 * Pagefind's index is a static bundle written at build time. It is loaded the first
 * time someone types a query, not when the palette opens, so the palette stays instant
 * and the index costs nothing to anyone who only uses it to jump between pages.
 */
let pagefind: Promise<Pagefind> | null = null;
function loadPagefind(): Promise<Pagefind> {
  pagefind ??= (
    import(
      /* @vite-ignore */ `${import.meta.env.BASE_URL}pagefind/pagefind.js`
    ) as Promise<Pagefind>
  ).catch(() => ({ search: async () => ({ results: [] }) }));
  return pagefind;
}

const GROUP_ORDER = ['Projects', 'Pages', 'Links', 'Actions'] as const;

export default function CommandPalette({
  items,
  startOpen = false,
}: {
  items: PaletteItem[];
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<{ url: string; title: string; excerpt: string }[]>([]);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const grouped = useMemo(
    () =>
      GROUP_ORDER.map((g) => [g, items.filter((i) => i.group === g)] as const).filter(
        ([, v]) => v.length,
      ),
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
    document.addEventListener('palette:open', onOpenRequest);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('palette:open', onOpenRequest);
    };
  }, [open, show]);

  // Re-bind the trigger buttons after a view transition swaps the document body.
  useEffect(() => {
    const rebind = () => setOpen(false);
    document.addEventListener('astro:page-load', rebind);
    return () => document.removeEventListener('astro:page-load', rebind);
  }, []);

  // Full-text search over the built site, once the query is worth a lookup.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const pf = await loadPagefind();
      const { results } = await pf.search(q);
      const top = await Promise.all(results.slice(0, 5).map((r) => r.data()));
      if (cancelled) return;
      setHits(
        top.map((d) => ({
          url: d.url.replace(/\.html$/, '').replace(/\/index$/, '') || '/',
          title: d.meta.title ?? d.url,
          excerpt: d.excerpt.replace(/<[^>]+>/g, ''),
        })),
      );
    }, 160);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

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
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Jump to a project, or search the whole site…"
              />
              <kbd className="cmdk__esc">Esc</kbd>
            </div>
            <Command.List>
              <Command.Empty>No match.</Command.Empty>
              {hits.length > 0 && (
                <Command.Group heading="On this site">
                  {hits.map((hit) => (
                    <Command.Item
                      key={hit.url}
                      value={`${hit.title} ${hit.excerpt}`}
                      onSelect={() => {
                        show(false);
                        window.location.href = hit.url;
                      }}
                    >
                      <span>{hit.title}</span>
                      <span className="cmdk__hint">{hit.excerpt.slice(0, 70)}…</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
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
