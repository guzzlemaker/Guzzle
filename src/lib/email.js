export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function isEmailSyntaxValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}
