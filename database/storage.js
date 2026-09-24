/**
 * PlutoAI - Storage Access Layer & IndexedDB / Chrome Storage ORM
 * Handles persistent transactions, querying, and encryption key access.
 */

import { PlutoDBSchema } from './schema.js';

export class PlutoDB {
  constructor() {
    this.dbName = PlutoDBSchema.name;
    this.version = PlutoDBSchema.version;
    this.db = null;
  }

  /**
   * Initializes the IndexedDB database instance
   */
  async init() {
    if (typeof indexedDB === 'undefined') {
      console.warn('[PlutoDB] IndexedDB not available in current environment; falling back to Chrome Storage.');
      return this;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        Object.entries(PlutoDBSchema.stores).forEach(([storeName, config]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, {
              keyPath: config.keyPath,
              autoIncrement: config.autoIncrement
            });
            config.indexes.forEach(idx => {
              store.createIndex(idx.name, idx.keyPath, { multiEntry: idx.multiEntry || false });
            });
          }
        });
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this);
      };

      request.onerror = (event) => {
        console.error('[PlutoDB] Failed to open IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Insert record into a store
   */
  async insert(storeName, data) {
    if (!this.db) await this.init();
    if (!this.db) {
      // Chrome storage fallback
      const key = `db_${storeName}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [key]: data });
      }
      return key;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.add(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Query records by store and index
   */
  async getAll(storeName) {
    if (!this.db) await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
}

export const plutoDB = new PlutoDB();
