import { describe, it, expect } from 'bun:test';
import { escapeXml } from '../xmlUtils';

describe('escapeXml', () => {
  it('should escape special characters', () => {
    const input = '<script>alert("XSS & injection")</script> \u0027test\u0027';
    const expected = '&lt;script&gt;alert(&quot;XSS &amp; injection&quot;)&lt;/script&gt; &apos;test&apos;';
    expect(escapeXml(input)).toBe(expected);
  });

  it('should not change normal text', () => {
    const input = 'Normal text without special characters';
    expect(escapeXml(input)).toBe(input);
  });

  it('should handle empty string', () => {
    expect(escapeXml('')).toBe('');
  });

  it('should escape all occurrences', () => {
    const input = '<<<<';
    const expected = '&lt;&lt;&lt;&lt;';
    expect(escapeXml(input)).toBe(expected);
  });
});
