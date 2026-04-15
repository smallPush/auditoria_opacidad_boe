/**
 * Escapes characters that have special meaning in XML to prevent injection vulnerabilities.
 * @param unsafe The string to escape.
 * @returns The escaped string.
 */
export const escapeXml = (unsafe: string): string => {
  return unsafe.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
};
