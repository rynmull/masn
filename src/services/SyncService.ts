import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

const db = SQLite.openDatabase('masn.db');

// Sync settings keys
const SYNC_ENABLED_KEY = 'cloud_sync_enabled';
const SYNC_LAST_BACKUP_KEY = 'cloud_sync_last_backup';
const SYNC_DEVICE_ID_KEY = 'cloud_sync_device_id';
const SYNC_ENCRYPTION_KEY_KEY = 'cloud_sync_encryption_key';

export interface BackupData {
  version: number;
  timestamp: string;
  deviceId: string;
  words: Array<{
    id?: number;
    label: string;
    speak: string;
    color: string;
    category: string;
    usage_count: number;
    last_used?: string;
  }>;
  categories: Array<{
    id?: number;
    name: string;
    color: string;
    icon?: string;
  }>;
  settings: Array<{
    key: string;
    value: string;
  }>;
}

export type SyncStatus = 'idle' | 'backing-up' | 'restoring' | 'error';

class SyncService {
  private status: SyncStatus = 'idle';
  private errorMessage: string | null = null;

  async initialize(): Promise<void> {
    // Ensure sync_metadata table exists
    db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS sync_metadata (
          key TEXT PRIMARY KEY,
          value TEXT
        );`
      );
    });

    // Generate or retrieve device ID
    let deviceId = await SecureStore.getItemAsync(SYNC_DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = this.generateUUID();
      await SecureStore.setItemAsync(SYNC_DEVICE_ID_KEY, deviceId);
    }

    // Ensure encryption key exists (256-bit random, stored hex)
    let encryptionKey = await SecureStore.getItemAsync(SYNC_ENCRYPTION_KEY_KEY);
    if (!encryptionKey) {
      encryptionKey = await this.generateEncryptionKey();
      await SecureStore.setItemAsync(SYNC_ENCRYPTION_KEY_KEY, encryptionKey);
    }
  }

  async isEnabled(): Promise<boolean> {
    const val = await this.getSetting(SYNC_ENABLED_KEY);
    return val === 'true';
  }

  async setEnabled(enabled: boolean): Promise<void> {
    await this.setSetting(SYNC_ENABLED_KEY, enabled ? 'true' : 'false');
  }

  async getLastBackupTime(): Promise<string | null> {
    return await this.getSetting(SYNC_LAST_BACKUP_KEY);
  }

  async setLastBackupTime(iso: string): Promise<void> {
    await this.setSetting(SYNC_LAST_BACKUP_KEY, iso);
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  getErrorMessage(): string | null {
    return this.errorMessage;
  }

  async backup(): Promise<{ success: boolean; error?: string; backupFileUri?: string }> {
    this.status = 'backing-up';
    this.errorMessage = null;

    try {
      // Export all data
      const data = await this.exportDatabase();

      // Serialize
      const json = JSON.stringify(data);

      // Encrypt
      const encryptionKey = await SecureStore.getItemAsync(SYNC_ENCRYPTION_KEY_KEY);
      if (!encryptionKey) {
        throw new Error('Encryption key not found');
      }
      const encrypted = await this.encrypt(json, encryptionKey);

      // Write to file
      const fileName = `masn-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.masn-backup`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, encrypted, { encoding: FileSystem.EncodingType.Base64 });

      // Update last backup timestamp
      await this.setLastBackupTime(new Date().toISOString());

      this.status = 'idle';
      return { success: true, backupFileUri: fileUri };
    } catch (err: any) {
      this.status = 'error';
      this.errorMessage = err.message || 'Unknown error during backup';
      return { success: false, error: this.errorMessage };
    }
  }

  async restore(fileUri: string): Promise<{ success: boolean; error?: string }> {
    this.status = 'restoring';
    this.errorMessage = null;

    try {
      // Read file
      const encrypted = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });

      // Decrypt
      const encryptionKey = await SecureStore.getItemAsync(SYNC_ENCRYPTION_KEY_KEY);
      if (!encryptionKey) {
        throw new Error('Encryption key not found. Cannot decrypt backup.');
      }
      const json = await this.decrypt(encrypted, encryptionKey);

      // Parse
      const data: BackupData = JSON.parse(json);

      // Validate
      if (!data.words || !Array.isArray(data.words) || !data.categories || !Array.isArray(data.categories)) {
        throw new Error('Invalid backup format');
      }

      // Restore in transaction
      db.transaction(tx => {
        // Clear existing data (except settings to preserve config like PIN and sync settings)
        tx.executeSql('DELETE FROM words;');
        tx.executeSql('DELETE FROM categories;');

        // Restore categories
        data.categories.forEach(cat => {
          tx.executeSql(
            `INSERT INTO categories (id, name, color, icon) VALUES (?, ?, ?, ?);`,
            [cat.id, cat.name, cat.color, cat.icon || null]
          );
        });

        // Restore words
        data.words.forEach(word => {
          tx.executeSql(
            `INSERT INTO words (id, label, speak, color, category, usage_count, last_used) VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [word.id, word.label, word.speak, word.color, word.category, word.usage_count, word.last_used || null]
          );
        });

        // Restore non-sensitive settings (exclude sync_metadata and PIN)
        data.settings.forEach(setting => {
          if (!setting.key.startsWith('cloud_sync_') && setting.key !== 'caregiver_pin_hash') {
            tx.executeSql(
              `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);`,
              [setting.key, setting.value]
            );
          }
        });
      });

      this.status = 'idle';
      return { success: true };
    } catch (err: any) {
      this.status = 'error';
      this.errorMessage = err.message || 'Unknown error during restore';
      return { success: false, error: this.errorMessage };
    }
  }

  async listBackupFiles(): Promise<Array<{ uri: string; filename: string; size: number; date: Date }>> {
    try {
      const dirContents = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
      const backupFiles = dirContents
        .filter(name => name.endsWith('.masn-backup'))
        .map(name => {
          const uri = FileSystem.documentDirectory + name;
          const info = FileSystem.getInfoSync(uri);
          return {
            uri,
            filename: name,
            size: info.size || 0,
            date: info.modificationTime ? new Date(info.modificationTime) : new Date(),
          };
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      return backupFiles;
    } catch (err: any) {
      console.error('Error listing backup files:', err);
      return [];
    }
  }

  async deleteBackupFile(fileUri: string): Promise<boolean> {
    try {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      return true;
    } catch (err: any) {
      console.error('Error deleting backup file:', err);
      return false;
    }
  }

  // Private helpers
  private async exportDatabase(): Promise<BackupData> {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql('SELECT * FROM categories;', [], (_, catResult) => {
          const categories = catResult._array as BackupData['categories'];

          tx.executeSql('SELECT * FROM words;', [], (_, wordResult) => {
            const words = wordResult._array as BackupData['words'];

            tx.executeSql("SELECT * FROM settings;", [], (_, settingResult) => {
              const settings = settingResult._array as BackupData['settings'];

              resolve({
                version: 1,
                timestamp: new Date().toISOString(),
                deviceId: '', // filled on backup if needed
                words,
                categories,
                settings,
              });
            });
          });
        });
      });
    });
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private async generateEncryptionKey(): Promise<string> {
    // Generate 256-bit random key (32 bytes) and return as hex string
    const key = await Crypto.getRandomBytesAsync(32);
    return Buffer.from(key).toString('hex');
  }

  private async encrypt(plaintext: string, hexKey: string): Promise<string> {
    // Convert hex key to WordArray
    const key = CryptoJS.enc.Hex.parse(hexKey);
    // Generate random IV (12 bytes for AES-CBC)
    const ivBytes = await Crypto.getRandomBytesAsync(16);
    const iv = CryptoJS.enc.Hex.parse(Buffer.from(ivBytes).toString('hex'));

    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Prepend IV to ciphertext (as hex) and return as base64 for storage
    const ivHex = CryptoJS.enc.Hex.stringify(iv);
    const ciphertextHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
    const combinedHex = ivHex + ciphertextHex;
    return CryptoJS.enc.Hex.parse(combinedHex).toString(CryptoJS.enc.Base64);
  }

  private async decrypt(base64Cipher: string, hexKey: string): Promise<string> {
    const key = CryptoJS.enc.Hex.parse(hexKey);
    // Decode base64 to WordArray
    const combined = CryptoJS.enc.Base64.parse(base64Cipher);
    const combinedHex = combined.toString(CryptoJS.enc.Hex);

    // Split IV (first 32 hex chars = 16 bytes) and ciphertext
    const ivHex = combinedHex.slice(0, 32);
    const ciphertextHex = combinedHex.slice(32);

    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const cipherparams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Hex.parse(ciphertextHex),
    });

    const decrypted = CryptoJS.AES.decrypt(cipherparams, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  private async getSetting(key: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT value FROM sync_metadata WHERE key = ?;',
          [key],
          (_, result) => {
            if (result.rows.length > 0) {
              resolve(result.rows.item(0).value);
            } else {
              resolve(null);
            }
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  private async setSetting(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?);`,
          [key, value],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }
}

export default new SyncService();
