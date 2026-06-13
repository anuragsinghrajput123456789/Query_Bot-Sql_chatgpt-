import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

const HASH_ITERATIONS = 120000;
const HASH_KEY_LENGTH = 64;
const HASH_DIGEST = 'sha512';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_DIGEST).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;

  const candidateHash = pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEY_LENGTH, HASH_DIGEST);
  const originalBuffer = Buffer.from(originalHash, 'hex');

  if (candidateHash.length !== originalBuffer.length) {
    return false;
  }

  return timingSafeEqual(candidateHash, originalBuffer);
}
