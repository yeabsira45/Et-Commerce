export function validatePassword(password: string) {
  const value = password.trim();

  if (value.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  if (/^(.)\1+$/.test(value)) {
    return "Password is too simple. Please use a stronger password.";
  }

  return null;
}
