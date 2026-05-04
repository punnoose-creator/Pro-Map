export function validateIdentifier(value: string): string | null {
  const t = value.trim();
  if (!t) return 'Email or username is required';
  if (t.includes('@')) {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
    return ok ? null : 'Enter a valid email address';
  }
  if (t.length < 2) return 'Username must be at least 2 characters';
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Password is required';
  if (value.length < 6) return 'Password must be at least 6 characters';
  return null;
}
