/** Basic shape check for guest invite tokens before hitting the database. */
export function isValidInviteToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(token)
}
