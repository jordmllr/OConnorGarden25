/**
 * IndexedDB Service
 * Provides low-level access to IndexedDB for offline-first data storage
 */

class IndexedDBService {
    constructor() {
        this.DB_NAME = 'gardenGuideDB';
        this.DB_VERSION = 1;
        this.db = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the IndexedDB database
     * @returns {Promise<IDBDatabase>} - The initialized database
     */
    async init() {
        if (this.isInitialized) {
            return this.db;
        }

        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                console.error('IndexedDB is not supported in this browser');
                reject(new Error('IndexedDB not supported'));
                return;
            }

            const request = window.indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = (event) => {
                console.error('Error opening IndexedDB:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isInitialized = true;
                console.log('IndexedDB initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores for each data type
                if (!db.objectStoreNames.contains('plants')) {
                    const plantStore = db.createObjectStore('plants', { keyPath: 'id' });
                    plantStore.createIndex('name', 'name', { unique: false });
                }

                if (!db.objectStoreNames.contains('plots')) {
                    const plotStore = db.createObjectStore('plots', { keyPath: 'id' });
                    plotStore.createIndex('name', 'name', { unique: false });
                    plotStore.createIndex('userId', 'userId', { unique: false });
                }

                if (!db.objectStoreNames.contains('cells')) {
                    const cellStore = db.createObjectStore('cells', { keyPath: 'id' });
                    cellStore.createIndex('plotId', 'plotId', { unique: false });
                    cellStore.createIndex('position', ['x', 'y'], { unique: false });
                }

                if (!db.objectStoreNames.contains('tasks')) {
                    const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
                    taskStore.createIndex('dueDate', 'dueDate', { unique: false });
                    taskStore.createIndex('completed', 'completed', { unique: false });
                    taskStore.createIndex('userId', 'userId', { unique: false });
                    taskStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                }

                if (!db.objectStoreNames.contains('syncQueue')) {
                    const syncStore = db.createObjectStore('syncQueue', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                    syncStore.createIndex('status', 'status', { unique: false });
                }

                if (!db.objectStoreNames.contains('userSettings')) {
                    db.createObjectStore('userSettings', { keyPath: 'userId' });
                }

                console.log('IndexedDB schema created');
            };
        });
    }

    /**
     * Get all items from a store
     * @param {string} storeName - Name of the object store
     * @param {string} [indexName] - Optional index to query by
     * @param {IDBKeyRange} [query] - Optional query range
     * @returns {Promise<Array>} - Array of items
     */
    async getAll(storeName, indexName = null, query = null) {
        await this._ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            
            let request;
            if (indexName) {
                const index = store.index(indexName);
                request = query ? index.getAll(query) : index.getAll();
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get an item by ID
     * @param {string} storeName - Name of the object store
     * @param {string} id - Item ID
     * @returns {Promise<Object>} - The requested item
     */
    async getById(storeName, id) {
        await this._ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Add an item to a store
     * @param {string} storeName - Name of the object store
     * @param {Object} item - Item to add
     * @returns {Promise<string>} - ID of the added item
     */
    async add(storeName, item) {
        await this._ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Add metadata if not present
            if (!item.createdAt) {
                item.createdAt = Date.now();
            }
            if (!item.updatedAt) {
                item.updatedAt = Date.now();
            }
            if (!item.syncStatus) {
                item.syncStatus = 'pending';
            }
            
            const request = store.add(item);

            request.onsuccess = () => resolve(item.id);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update an item in a store
     * @param {string} storeName - Name of the object store
     * @param {Object} item - Item to update
     * @returns {Promise<void>}
     */
    async update(storeName, item) {
        await this._ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Update metadata
            item.updatedAt = Date.now();
            if (!item.syncStatus) {
                item.syncStatus = 'pending';
            }
            
            const request = store.put(item);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete an item from a store
     * @param {string} storeName - Name of the object store
     * @param {string} id - ID of the item to delete
     * @returns {Promise<void>}
     */
    async delete(storeName, id) {
        await this._ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Add an item to the sync queue
     * @param {Object} syncItem - Sync queue item
     * @returns {Promise<number>} - ID of the added sync item
     */
    async addToSyncQueue(syncItem) {
        return this.add('syncQueue', {
            ...syncItem,
            timestamp: Date.now(),
            status: 'pending',
            retryCount: 0
        });
    }

    /**
     * Ensure the database is initialized
     * @private
     */
    async _ensureInitialized() {
        if (!this.isInitialized) {
            await this.init();
        }
    }
}

// Create and export a singleton instance
const indexedDBService = new IndexedDBService();
export default indexedDBService;
