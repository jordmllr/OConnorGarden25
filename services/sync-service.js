/**
 * Sync Service
 * Handles synchronization between IndexedDB and Firestore
 * Manages offline data changes and conflict resolution
 */

import dataService from './data-service.js';
import authService from './auth-service.js';
import indexedDBService from './indexed-db-service.js';

class SyncService {
    constructor() {
        this.isSyncing = false;
        this.syncInterval = null;
        this.syncListeners = [];
        this.lastSyncTimestamp = 0;
        this.maxRetries = 5;
        this.retryDelay = 60000; // 1 minute
    }

    /**
     * Initialize the sync service
     */
    async init() {
        // Ensure IndexedDB is initialized
        await indexedDBService.init();

        // Listen for online status changes
        dataService.addOnlineStatusListener(isOnline => {
            if (isOnline) {
                this.syncPendingChanges();
            }
        });

        // Set up periodic sync (every 5 minutes)
        this.syncInterval = setInterval(() => {
            if (dataService.isOnline && authService.isAuthenticated()) {
                this.syncPendingChanges();
            }
        }, 5 * 60 * 1000);

        // Listen for auth state changes
        authService.addAuthStateListener(user => {
            if (user) {
                this.loadUserSettings(user.uid);
                if (dataService.isOnline) {
                    this.syncPendingChanges();
                }
            } else {
                // Reset sync timestamp when user logs out
                this.lastSyncTimestamp = 0;
                this.saveUserSettings(null);
            }
        });

        // Register for sync events if available
        this._registerForBackgroundSync();
    }

    /**
     * Load user settings from IndexedDB
     * @param {string} userId - User ID
     * @private
     */
    async loadUserSettings(userId) {
        if (!userId) return;

        try {
            const settings = await indexedDBService.getById('userSettings', userId);
            if (settings && settings.lastSyncTimestamp) {
                this.lastSyncTimestamp = settings.lastSyncTimestamp;
            }
        } catch (error) {
            console.error('Error loading user settings:', error);
        }
    }

    /**
     * Save user settings to IndexedDB
     * @param {string} userId - User ID (null if logged out)
     * @private
     */
    async saveUserSettings(userId) {
        if (!userId) return;

        try {
            const settings = {
                userId,
                lastSyncTimestamp: this.lastSyncTimestamp
            };

            const existingSettings = await indexedDBService.getById('userSettings', userId);

            if (existingSettings) {
                await indexedDBService.update('userSettings', settings);
            } else {
                await indexedDBService.add('userSettings', settings);
            }
        } catch (error) {
            console.error('Error saving user settings:', error);
        }
    }

    /**
     * Register for background sync if supported
     * @private
     */
    async _registerForBackgroundSync() {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;

                // Register for background sync
                await registration.sync.register('sync-data');
                console.log('Background sync registered');
            } catch (error) {
                console.warn('Background sync registration failed:', error);
            }
        }
    }

    /**
     * Add a change to the sync queue
     * @param {string} collectionName - Name of the collection
     * @param {string} operation - Type of operation ('add', 'update', 'delete')
     * @param {string} id - Document ID
     * @param {Object} data - Document data (null for 'delete' operations)
     */
    async addToSyncQueue(collectionName, operation, id, data) {
        await indexedDBService.addToSyncQueue({
            collectionName,
            operation,
            id,
            data,
            timestamp: Date.now(),
            status: 'pending',
            retryCount: 0
        });

        // Try to sync immediately if online
        if (dataService.isOnline && authService.isAuthenticated()) {
            this.syncPendingChanges();
        }
    }

    /**
     * Synchronize pending changes with the cloud
     * @returns {Promise<void>}
     */
    async syncPendingChanges() {
        if (this.isSyncing || !dataService.isOnline || !authService.isAuthenticated()) {
            return;
        }

        this.isSyncing = true;
        this._notifySyncStatus('syncing');

        try {
            // Get pending changes from IndexedDB
            const pendingChanges = await indexedDBService.getAll('syncQueue', 'status', IDBKeyRange.only('pending'));

            if (pendingChanges.length === 0) {
                this._notifySyncStatus('synced');
                this.isSyncing = false;
                return;
            }

            console.log(`Processing ${pendingChanges.length} pending changes`);

            // Process each pending change
            const successfulChanges = [];

            for (const change of pendingChanges) {
                try {
                    // Mark as in progress
                    await indexedDBService.update('syncQueue', {
                        ...change,
                        status: 'in_progress'
                    });

                    await this._processChange(change);

                    // Mark as completed
                    await indexedDBService.update('syncQueue', {
                        ...change,
                        status: 'completed',
                        completedAt: Date.now()
                    });

                    successfulChanges.push(change);
                } catch (error) {
                    console.error('Error processing change:', error, change);

                    // Increment retry count and mark for retry if under max retries
                    const retryCount = (change.retryCount || 0) + 1;
                    const status = retryCount < this.maxRetries ? 'pending' : 'failed';

                    await indexedDBService.update('syncQueue', {
                        ...change,
                        status,
                        retryCount,
                        lastError: error.message,
                        nextRetry: status === 'pending' ? Date.now() + this.retryDelay : null
                    });
                }
            }

            this.lastSyncTimestamp = Date.now();

            // Save the last sync timestamp to user settings
            const user = authService.getCurrentUser();
            if (user) {
                await this.saveUserSettings(user.uid);

                // Update user's last sync timestamp in Firestore
                await firebase.firestore().collection('users').doc(user.uid).update({
                    lastSyncTimestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // Clean up completed sync items older than 24 hours
            this._cleanupCompletedSyncItems();

            this._notifySyncStatus(successfulChanges.length > 0 ? 'synced' : 'idle');
        } catch (error) {
            console.error('Error during sync:', error);
            this._notifySyncStatus('error');
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Process a single change
     * @private
     * @param {Object} change - The change to process
     * @returns {Promise<void>}
     */
    async _processChange(change) {
        const { collectionName, operation, id, data } = change;

        switch (operation) {
            case 'add':
                // For add operations, we need to use the temporary ID from the change
                if (id) {
                    // Remove any fields that would cause Firestore errors
                    const { id: docId, syncStatus, ...firestoreData } = data;

                    await dataService.collection(collectionName).doc(id).set({
                        ...firestoreData,
                        syncStatus: 'synced',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // Update local copy to mark as synced
                    await indexedDBService.update(collectionName, {
                        ...data,
                        id,
                        syncStatus: 'synced'
                    });
                } else {
                    throw new Error('Add operation requires an ID');
                }
                break;

            case 'update':
                // Remove any fields that would cause Firestore errors
                const { id: docId, ...updateData } = data;

                await dataService.collection(collectionName).doc(id).update({
                    ...updateData,
                    syncStatus: 'synced',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Update local copy to mark as synced
                await indexedDBService.update(collectionName, {
                    ...data,
                    syncStatus: 'synced'
                });
                break;

            case 'delete':
                await dataService.collection(collectionName).doc(id).delete();
                break;

            default:
                throw new Error(`Unknown operation: ${operation}`);
        }
    }

    /**
     * Clean up completed sync items older than 24 hours
     * @private
     */
    async _cleanupCompletedSyncItems() {
        try {
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            const completedItems = await indexedDBService.getAll('syncQueue', 'status', IDBKeyRange.only('completed'));

            const oldItems = completedItems.filter(item =>
                item.completedAt && item.completedAt < oneDayAgo
            );

            for (const item of oldItems) {
                await indexedDBService.delete('syncQueue', item.id);
            }

            if (oldItems.length > 0) {
                console.log(`Cleaned up ${oldItems.length} old sync items`);
            }
        } catch (error) {
            console.error('Error cleaning up sync items:', error);
        }
    }

    /**
     * Add a sync status listener
     * @param {Function} listener - Callback function that receives the sync status
     */
    addSyncListener(listener) {
        if (typeof listener === 'function') {
            this.syncListeners.push(listener);
        }
    }

    /**
     * Remove a sync status listener
     * @param {Function} listener - The listener function to remove
     */
    removeSyncListener(listener) {
        this.syncListeners = this.syncListeners.filter(l => l !== listener);
    }

    /**
     * Notify all listeners of sync status change
     * @private
     * @param {string} status - The current sync status
     */
    _notifySyncStatus(status) {
        this.syncListeners.forEach(listener => {
            try {
                listener(status);
            } catch (error) {
                console.error('Error in sync status listener:', error);
            }
        });
    }

    /**
     * Clean up resources when service is no longer needed
     */
    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        dataService.removeOnlineStatusListener(this._handleOnlineStatus);
    }
}

// Create and export a singleton instance
const syncService = new SyncService();
export default syncService;
