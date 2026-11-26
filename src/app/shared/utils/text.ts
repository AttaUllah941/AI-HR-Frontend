/**
 * "HR_ADMIN" -> "HR Admin", "SUPER_ADMIN" -> "Super Admin", "PENDING_VERIFICATION" -> "Pending verification".
 * Short words (up to two letters, like HR or IT) stay upper case; only the first word is capitalised
 * when `sentence` is true.
 */
export function humanizeCode(code: string | null | undefined, sentence = false): string {
  const words = (code ?? '')
    .trim()
    .split(/[_\s-]+/)
    .filter(Boolean);
  if (words.length === 0) {
    return '';
  }
  return words
    .map((word, i) => {
      if (word.length <= 2) {
        return word.toUpperCase();
      }
      const lower = word.toLowerCase();
      return sentence && i > 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/** Up to two capital letters for an avatar placeholder: "Ada Lovelace" -> "AL". Falls back to the email. */
export function initials(firstName?: string | null, lastName?: string | null, fallback = ''): string {
  const letters = [firstName, lastName]
    .map((part) => (part ?? '').trim().charAt(0))
    .filter(Boolean)
    .join('');
  return (letters || fallback.trim().charAt(0)).toUpperCase();
}
