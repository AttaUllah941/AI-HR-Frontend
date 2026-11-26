const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]!);
}

/** Bold, italic and inline code. Runs on text that is already HTML-escaped. */
function inline(escaped: string): string {
  // Code spans first, so their contents are not touched by the emphasis rules.
  const codes: string[] = [];
  let text = escaped.replace(/`([^`]+)`/g, (_m, code: string) => {
    codes.push(`<code>${code}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  text = text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_([^_\s][^_]*)_(?![_\w])/g, '$1<em>$2</em>');
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => codes[Number(i)] ?? '');
}

/**
 * Renders the small markdown subset that generated policy documents use: headings, bullet and
 * numbered lists (one level), block quotes, rules, fenced code, bold, italic and inline code.
 *
 * Everything is HTML-escaped before any markup is added, and links and raw HTML are never
 * produced, so the result is safe to bind with `[innerHTML]` even though the text is untrusted
 * AI output. Headings start at <h3> because the page already has an <h1> and <h2>.
 */
export function renderMarkdown(source: string): string {
  const lines = escapeHtml((source ?? '').replace(/\r\n?/g, '\n')).split('\n');
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;
  let quote: string[] = [];
  let code: string[] | null = null;

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) {
      html.push(`<${list.tag}>${list.items.map((item) => `<li>${inline(item)}</li>`).join('')}</${list.tag}>`);
    }
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) html.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const line of lines) {
    if (code) {
      if (/^```/.test(line.trim())) {
        html.push(`<pre><code>${code.join('\n')}</code></pre>`);
        code = null;
      } else {
        code.push(line);
      }
      continue;
    }
    if (/^```/.test(line.trim())) {
      flushAll();
      code = [];
      continue;
    }

    const trimmed = line.trim();
    if (trimmed === '') {
      flushAll();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*?)\s*#*$/.exec(trimmed);
    if (heading) {
      flushAll();
      const level = Math.min(heading[1]!.length + 2, 6);
      html.push(`<h${level}>${inline(heading[2]!)}</h${level}>`);
      continue;
    }
    if (/^([-*_])(\s*\1){2,}$/.test(trimmed)) {
      flushAll();
      html.push('<hr>');
      continue;
    }

    const bullet = /^[-*+]\s+(.*)$/.exec(trimmed);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (bullet || numbered) {
      flushParagraph();
      flushQuote();
      const tag = bullet ? 'ul' : 'ol';
      if (list && list.tag !== tag) flushList();
      list ??= { tag, items: [] };
      list.items.push((bullet ?? numbered)![1]!);
      continue;
    }

    const quoted = /^&gt;\s?(.*)$/.exec(trimmed);
    if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1]!);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(trimmed);
  }

  if (code) html.push(`<pre><code>${code.join('\n')}</code></pre>`);
  flushAll();
  return html.join('');
}
