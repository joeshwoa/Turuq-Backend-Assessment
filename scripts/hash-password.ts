import bcrypt from "bcryptjs";

/**
 * One-off CLI: `npm run hash-password -- 'some-plaintext-password'`
 * Prints a bcrypt hash to paste into ADMIN_PASSWORD_HASH in .env — the
 * plaintext password is never itself stored anywhere, only its hash.
 */
const plaintext = process.argv[2];

if (!plaintext) {
  console.error("Usage: npm run hash-password -- '<password>'");
  process.exit(1);
}

const hash = bcrypt.hashSync(plaintext, 12);
console.log(hash);
