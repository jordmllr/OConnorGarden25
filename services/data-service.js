/**
 * Data Service
 * Provides generic data operations for the application
 * Abstracts the underlying data storage mechanism
 * Implements offline-first approach using IndexedDB
 */

import authService from './auth-service.js';
import indexedDBService from './indexed-db-service.js';

class DataService {
    constructor() {
        this.db = firebase.firestore();
        this.localDb = indexedDBService;
        this.isOnline = navigator.onLine;
        this.collections = {};
        this.offlineIndicatorVisible = false;

        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this._notifyOnlineStatus();
            this._hideOfflineIndicator();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this._notifyOnlineStatus();
            this._showOfflineIndicator();
        });
    }

    /**
     * Initialize the data service
     */
    async init() {
        try {
            // Initialize IndexedDB
            await this.localDb.init();
            console.log('IndexedDB initialized successfully');

            // Enable offline persistence for Firestore
            await this.db.enablePersistence({
                synchronizeTabs: true
            });
            console.log('Firestore persistence enabled');
        } catch (err) {
            if (err.code === 'failed-precondition') {
                console.warn('Firestore persistence failed: Multiple tabs open');
            } else if (err.code === 'unimplemented') {
                console.warn('Firestore persistence not supported by this browser');
            } else {
                console.error('Error initializing data services:', err);
            }
        }

        // Initialize listeners for online status changes
        this._setupOnlineStatusListeners();

        // Show offline indicator if offline
        if (!this.isOnline) {
            this._showOfflineIndicator();
        }
    }

    /**
     * Get a collection reference with user-specific path
     * @param {string} collectionName - Name of the collection
     * @returns {Object} - Firestore collection reference
     */
    collection(collectionName) {
        const user = authService.getCurrentUser();

        if (!user) {
            throw new Error('User must be authenticated to access collections');
        }

        // Cache collection references
        if (!this.collections[collectionName]) {
            this.collections[collectionName] = this.db.collection('users').doc(user.uid).collection(collectionName);
        }

        return this.collections[collectionName];
    }

    /**
     * Get all documents from a collection
     * @param {string} collectionName - Name of the collection
     * @returns {Promise<Array>} - Array of documents
     */
    async getAll(collectionName) {
        try {
            // First try to get data from IndexedDB
            const localData = await this.localDb.getAll(collectionName);

            // If we're online, also fetch from Firestore to ensure we have the latest data
            if (this.isOnline) {
                try {
                    const snapshot = await this.collection(collectionName).get();
                    const remoteData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    // Merge local and remote data, preferring local for pending changes
                    const mergedData = this._mergeData(localData, remoteData);

                    // Update local database with any new remote data
                    await this._updateLocalData(collectionName, mergedData);

                    return mergedData;
                } catch (firestoreError) {
                    console.warn(`Firestore fetch failed, using local data for ${collectionName}:`, firestoreError);
                    return localData;
                }
            }

            return localData;
        } catch (error) {
            console.error(`Error getting all documents from ${collectionName}:`, error);

            // Fallback to Firestore if IndexedDB fails
            if (this.isOnline) {
                const snapshot = await this.collection(collectionName).get();
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }

            throw error;
        }
    }

    /**
     * Get a document by ID
     * @param {string} collectionName - Name of the collection
     * @param {string} id - Document ID
     * @returns {Promise<Object>} - Document data
     */
    async getById(collectionName, id) {
        try {
            // First try to get data from IndexedDB
            const localDoc = await this.localDb.getById(collectionName, id);

            // If we're online and the document doesn't exist locally or has pending status, fetch from Firestore
            if (this.isOnline && (!localDoc || localDoc.syncStatus === 'pending')) {
                try {
                    const doc = await this.collection(collectionName).doc(id).get();

                    if (!doc.exists) {
                        if (localDoc) {
                            // Local document exists but not in Firestore, keep local version
                            return localDoc;
                        }
                        throw new Error(`Document not found: ${collectionName}/${id}`);
                    }

                    const remoteDoc = {
                        id: doc.id,
                        ...doc.data()
                    };

                    // If we have both local and remote, merge them (prefer local for pending changes)
                    if (localDoc) {
                        const mergedDoc = this._mergeDocuments(localDoc, remoteDoc);

                        // Update local database with merged data
                        await this.localDb.update(collectionName, mergedDoc);

                        return mergedDoc;
                    }

                    // If only remote exists, save to local
                    await this.localDb.add(collectionName, {
                        ...remoteDoc,
                        syncStatus: 'synced'
                    });

                    return remoteDoc;
                } catch (firestoreError) {
                    console.warn(`Firestore fetch failed for ${collectionName}/${id}:`, firestoreError);
                    if (localDoc) return localDoc;
                    throw firestoreError;
                }
            }

            // If offline or document exists locally with synced status, return local version
            if (localDoc) return localDoc;

            throw new Error(`Document not found: ${collectionName}/${id}`);
        } catch (error) {
            console.error(`Error getting document ${collectionName}/${id}:`, error);
            throw error;
        }
    }

    /**
     * Add a new document to a collection
     * @param {string} collectionName - Name of the collection
     * @param {Object} data - Document data
     * @returns {Promise<string>} - New document ID
     */
    async add(collectionName, data) {
        try {
            const user = authService.getCurrentUser();

            // Generate a unique ID if not provided
            const id = data.id || this._generateId();

            // Add metadata
            const enhancedData = {
                ...data,
                id,
                userId: user ? user.uid : null,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                syncStatus: 'pending'
            };

            // Always save to IndexedDB first
            await this.localDb.add(collectionName, enhancedData);

            // If online, also save to Firestore
            if (this.isOnline && user) {
                try {
                    await this.collection(collectionName).doc(id).set({
                        ...enhancedData,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        syncStatus: 'synced'
                    });

                    // Update local copy to mark as synced
                    await this.localDb.update(collectionName, {
                        ...enhancedData,
                        syncStatus: 'synced'
                    });
                } catch (firestoreError) {
                    console.warn(`Firestore add failed for ${collectionName}, will sync later:`, firestoreError);
                    // Add to sync queue
                    await this.localDb.addToSyncQueue({
                        collectionName,
                        operation: 'add',
                        id,
                        data: enhancedData
                    });
                }
            } else if (user) {
                // Add to sync queue for later
                await this.localDb.addToSyncQueue({
                    collectionName,
                    operation: 'add',
                    id,
                    data: enhancedData
                });
            }

            return id;
        } catch (error) {
            console.error(`Error adding document to ${collectionName}:`, error);
            throw error;
        }
    }

    /**
     * Update an existing document
     * @param {string} collectionName - Name of the collection
     * @param {string} id - Document ID
     * @param {Object} data - Updated fields
     * @returns {Promise<void>}
     */
    async update(collectionName, id, data) {
        try {
            // Get the current document from IndexedDB
            const currentDoc = await this.localDb.getById(collectionName, id);

            if (!currentDoc) {
                throw new Error(`Document not found for update: ${collectionName}/${id}`);
            }

            // Merge with current data
            const updatedDoc = {
                ...currentDoc,
                ...data,
                id,
                updatedAt: Date.now(),
                syncStatus: 'pending'
            };

            // Always update IndexedDB first
            await this.localDb.update(collectionName, updatedDoc);

            // If online, also update Firestore
            if (this.isOnline && authService.isAuthenticated()) {
                try {
                    // Remove id from data to avoid Firestore errors
                    const { id: docId, ...firestoreData } = updatedDoc;

                    await this.collection(collectionName).doc(id).update({
                        ...firestoreData,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        syncStatus: 'synced'
                    });

                    // Update local copy to mark as synced
                    await this.localDb.update(collectionName, {
                        ...updatedDoc,
                        syncStatus: 'synced'
                    });
                } catch (firestoreError) {
                    console.warn(`Firestore update failed for ${collectionName}/${id}, will sync later:`, firestoreError);
                    // Add to sync queue
                    await this.localDb.addToSyncQueue({
                        collectionName,
                        operation: 'update',
                        id,
                        data: updatedDoc
                    });
                }
            } else if (authService.isAuthenticated()) {
                // Add to sync queue for later
                await this.localDb.addToSyncQueue({
                    collectionName,
                    operation: 'update',
                    id,
                    data: updatedDoc
                });
            }
        } catch (error) {
            console.error(`Error updating document ${collectionName}/${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete a document
     * @param {string} collectionName - Name of the collection
     * @param {string} id - Document ID
     * @returns {Promise<void>}
     */
    async delete(collectionName, id) {
        try {
            // Always delete from IndexedDB first
            await this.localDb.delete(collectionName, id);

            // If online, also delete from Firestore
            if (this.isOnline && authService.isAuthenticated()) {
                try {
                    await this.collection(collectionName).doc(id).delete();
                } catch (firestoreError) {
                    console.warn(`Firestore delete failed for ${collectionName}/${id}, will sync later:`, firestoreError);
                    // Add to sync queue
                    await this.localDb.addToSyncQueue({
                        collectionName,
                        operation: 'delete',
                        id,
                        data: null
                    });
                }
            } else if (authService.isAuthenticated()) {
                // Add to sync queue for later
                await this.localDb.addToSyncQueue({
                    collectionName,
                    operation: 'delete',
                    id,
                    data: null
                });
            }
        } catch (error) {
            console.error(`Error deleting document ${collectionName}/${id}:`, error);
            throw error;
        }
    }

    /**
     * Set up listeners for online status changes
     * @private
     */
    _setupOnlineStatusListeners() {
        this.onlineStatusListeners = [];
    }

    /**
     * Add a listener for online status changes
     * @param {Function} listener - Callback function that receives the online status
     */
    addOnlineStatusListener(listener) {
        if (typeof listener === 'function') {
            this.onlineStatusListeners.push(listener);

            // Immediately call with current state
            listener(this.isOnline);
        }
    }

    /**
     * Remove an online status listener
     * @param {Function} listener - The listener function to remove
     */
    removeOnlineStatusListener(listener) {
        this.onlineStatusListeners = this.onlineStatusListeners.filter(l => l !== listener);
    }

    /**
     * Notify all listeners of online status change
     * @private
     */
    _notifyOnlineStatus() {
        this.onlineStatusListeners.forEach(listener => {
            try {
                listener(this.isOnline);
            } catch (error) {
                console.error('Error in online status listener:', error);
            }
        });
    }

    /**
     * Merge local and remote data arrays, preferring local for pending changes
     * @private
     * @param {Array} localData - Data from IndexedDB
     * @param {Array} remoteData - Data from Firestore
     * @returns {Array} - Merged data array
     */
    _mergeData(localData, remoteData) {
        const mergedMap = new Map();

        // First add all remote data
        remoteData.forEach(item => {
            mergedMap.set(item.id, { ...item });
        });

        // Then overlay local data, preferring local for pending changes
        localData.forEach(item => {
            if (item.syncStatus === 'pending' || !mergedMap.has(item.id)) {
                mergedMap.set(item.id, { ...item });
            } else {
                // Merge the documents
                const remoteItem = mergedMap.get(item.id);
                mergedMap.set(item.id, this._mergeDocuments(item, remoteItem));
            }
        });

        return Array.from(mergedMap.values());
    }

    /**
     * Merge two document objects, preferring local for pending changes
     * @private
     * @param {Object} localDoc - Document from IndexedDB
     * @param {Object} remoteDoc - Document from Firestore
     * @returns {Object} - Merged document
     */
    _mergeDocuments(localDoc, remoteDoc) {
        // If local has pending changes, prefer it
        if (localDoc.syncStatus === 'pending') {
            return { ...localDoc };
        }

        // If remote is newer, prefer it but keep local ID
        if (remoteDoc.updatedAt > localDoc.updatedAt) {
            return {
                ...remoteDoc,
                id: localDoc.id,
                syncStatus: 'synced'
            };
        }

        // Otherwise prefer local
        return { ...localDoc };
    }

    /**
     * Update local database with merged data
     * @private
     * @param {string} collectionName - Name of the collection
     * @param {Array} mergedData - Merged data array
     * @returns {Promise<void>}
     */
    async _updateLocalData(collectionName, mergedData) {
        const updatePromises = mergedData.map(async item => {
            const localItem = await this.localDb.getById(collectionName, item.id);

            if (!localItem) {
                // Item doesn't exist locally, add it
                return this.localDb.add(collectionName, {
                    ...item,
                    syncStatus: 'synced'
                });
            } else if (localItem.syncStatus !== 'pending' && item.updatedAt > localItem.updatedAt) {
                // Remote item is newer and local isn't pending, update it
                return this.localDb.update(collectionName, {
                    ...item,
                    syncStatus: 'synced'
                });
            }

            // Otherwise keep local version
            return Promise.resolve();
        });

        await Promise.all(updatePromises);
    }

    /**
     * Generate a unique ID
     * @private
     * @returns {string} - Unique ID
     */
    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }

    /**
     * Show offline indicator in the UI
     * @private
     */
    _showOfflineIndicator() {
        if (this.offlineIndicatorVisible) return;

        const indicator = document.createElement('div');
        indicator.id = 'offline-indicator';
        indicator.className = 'offline-indicator';
        indicator.textContent = 'You are offline. Changes will be saved locally.';

        document.body.appendChild(indicator);
        this.offlineIndicatorVisible = true;

        // Add styles if they don't exist
        if (!document.getElementById('offline-indicator-styles')) {
            const style = document.createElement('style');
            style.id = 'offline-indicator-styles';
            style.textContent = `
                .offline-indicator {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background-color: #f44336;
                    color: white;
                    text-align: center;
                    padding: 8px;
                    z-index: 1000;
                    font-family: var(--font-family, sans-serif);
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Hide offline indicator from the UI
     * @private
     */
    _hideOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.remove();
            this.offlineIndicatorVisible = false;
        }
    }
}

// Create and export a singleton instance
const dataService = new DataService();
export default dataService;
