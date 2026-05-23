export function sanitizeUsername(value = "") {
  return String(value)
    .trim()
    .replace(/[^\p{L}\p{N}_ -]/gu, "")
    .slice(0, 20);
}

export function validateInviteCode(code = "") {
  return /^[A-Z0-9_-]{4,20}$/i.test(String(code).trim());
}