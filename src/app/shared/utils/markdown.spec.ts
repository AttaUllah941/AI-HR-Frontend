import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders headings one level lower than written, capped at h6', () => {
    expect(renderMarkdown('# Purpose')).toBe('<h3>Purpose</h3>');
    expect(renderMarkdown('## Scope')).toBe('<h4>Scope</h4>');
    expect(renderMarkdown('###### Deep')).toBe('<h6>Deep</h6>');
  });

  it('joins wrapped lines into one paragraph and splits on blank lines', () => {
    expect(renderMarkdown('first line\nsecond line\n\nnext')).toBe('<p>first line second line</p><p>next</p>');
  });

  it('renders bullet and numbered lists', () => {
    expect(renderMarkdown('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>');
    expect(renderMarkdown('1. one\n2) two')).toBe('<ol><li>one</li><li>two</li></ol>');
    expect(renderMarkdown('- a\n1. b')).toBe('<ul><li>a</li></ul><ol><li>b</li></ol>');
  });

  it('renders emphasis and inline code without touching code contents', () => {
    expect(renderMarkdown('**bold** and *italic* and `a*b*c`')).toBe(
      '<p><strong>bold</strong> and <em>italic</em> and <code>a*b*c</code></p>',
    );
  });

  it('renders quotes, rules and fenced code', () => {
    expect(renderMarkdown('> note')).toBe('<blockquote><p>note</p></blockquote>');
    expect(renderMarkdown('---')).toBe('<hr>');
    expect(renderMarkdown('```\nlet a = 1 < 2;\n```')).toBe('<pre><code>let a = 1 &lt; 2;</code></pre>');
  });

  it('escapes HTML instead of passing it through', () => {
    const out = renderMarkdown('<script>alert(1)</script>\n\n[x](javascript:alert(1)) <img src=x onerror=alert(1)>');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('<a ');
    expect(out).toContain('&lt;script&gt;');
  });

  it('escapes markup that appears inside headings, lists and quotes', () => {
    expect(renderMarkdown('# <b>x</b>')).toBe('<h3>&lt;b&gt;x&lt;/b&gt;</h3>');
    expect(renderMarkdown('- <i>y</i>')).toBe('<ul><li>&lt;i&gt;y&lt;/i&gt;</li></ul>');
    expect(renderMarkdown('> <u>z</u>')).toBe('<blockquote><p>&lt;u&gt;z&lt;/u&gt;</p></blockquote>');
  });

  it('copes with empty input and unterminated code fences', () => {
    expect(renderMarkdown('')).toBe('');
    expect(renderMarkdown('```\nopen')).toBe('<pre><code>open</code></pre>');
  });
});
