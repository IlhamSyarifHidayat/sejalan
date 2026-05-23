// Generate SEJ-XXXXX invite codes. Omit visually-confusing chars (0/O, 1/I/L).
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const generateInviteCode = () => {
  let code = "SEJ-";
  for (let i = 0; i < 5; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
};

export const normalizeInviteCode = (raw) =>
  String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/—|–|−/g, "-");

export const isValidInviteCodeFormat = (raw) =>
  /^SEJ-[A-Z0-9]{5}$/.test(normalizeInviteCode(raw));
