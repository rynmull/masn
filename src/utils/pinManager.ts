/**
 * PIN Security Manager
 * Uses SHA-256 hashing to store and verify caregiver PINs securely.
 */

import { getFirstSql, runSql } from '../lib/db';

const PIN_SALT = 'masn-caregiver-pin-2026';

/**
 * Hash a PIN using SHA-256
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + PIN_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a PIN against a stored hash
 */
export async function verifyPin(inputPin: string, storedHash: string): Promise<boolean> {
  const inputHash = await hashPin(inputPin);
  return inputHash === storedHash;
}

/**
 * Get the stored PIN hash from database
 * Returns null if no PIN is set (first-time setup)
 */
export async function getSavedPinHash(): Promise<string | null> {
  try {
    const result = await getFirstSql<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      'caregiver_pin_hash'
    );
    return result?.value || null;
  } catch (error) {
    console.warn('Could not retrieve PIN hash:', error);
    return null;
  }
}

/**
 * Save a hashed PIN to the database
 */
export async function savePinHash(hash: string): Promise<void> {
  try {
    await runSql(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      'caregiver_pin_hash',
      hash
    );
  } catch (error) {
    console.error('Error saving PIN hash:', error);
    throw error;
  }
}
