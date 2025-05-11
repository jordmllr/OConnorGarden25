/**
 * App Shell
 * Provides the core UI framework and navigation
 */

import authService from './services/auth-service.js';
import dataService from './services/data-service.js';
import syncService from './services/sync-service.js';
import notificationService from './services/notification-service.js';

function appShell() {
    return {
        // Navigation state
        currentView: 'plants', // Default view
        isLoading: true,
        offlineMode: !navigator.onLine,
        syncStatus: 'idle',

        /**
         * Initialize the app shell
         */
        async init() {
            // Make the app shell instance available globally
            window.appShell = this;

            // Initialize services
            await this._initServices();

            // Set up event listeners
            this._setupEventListeners();

            // Load initial view based on URL hash
            this._handleRouteChange();

            // Mark as loaded
            this.isLoading = false;
        },

        /**
         * Initialize all services
         * @private
         */
        async _initServices() {
            try {
                // Initialize auth service
                authService.init();

                // Initialize data service
                await dataService.init();

                // Initialize sync service
                syncService.init();

                // Initialize notification service
                await notificationService.init();

                console.log('All services initialized successfully');
            } catch (error) {
                console.error('Error initializing services:', error);
            }
        },

        /**
         * Set up event listeners
         * @private
         */
        _setupEventListeners() {
            // Listen for route changes
            window.addEventListener('hashchange', () => this._handleRouteChange());

            // Listen for online/offline events
            window.addEventListener('online', () => {
                this.offlineMode = false;
                this._showConnectivityToast('You are back online');

                // Trigger sync when coming back online
                if (authService.isAuthenticated()) {
                    syncService.syncPendingChanges();
                }
            });

            window.addEventListener('offline', () => {
                this.offlineMode = true;
                this._showConnectivityToast('You are offline. Changes will be saved locally');
            });

            // Listen for sync status changes
            syncService.addSyncListener(status => {
                this.syncStatus = status;

                if (status === 'synced') {
                    this._showConnectivityToast('All changes synced');
                } else if (status === 'error') {
                    this._showConnectivityToast('Sync error. Will retry later', 'error');
                }
            });

            // Listen for messages from service worker
            if (navigator.serviceWorker) {
                navigator.serviceWorker.addEventListener('message', event => {
                    const message = event.data;

                    if (message && message.type === 'sync-trigger') {
                        console.log('Received sync trigger from service worker');

                        if (dataService.isOnline && authService.isAuthenticated()) {
                            syncService.syncPendingChanges();
                        }
                    }
                });
            }
        },

        /**
         * Handle route changes
         * @private
         */
        _handleRouteChange() {
            // Get the current hash
            const hash = window.location.hash.substring(1) || 'plants';

            // Check if the view exists
            const validViews = ['plants', 'plot', 'schedule', 'todos', 'settings'];

            if (validViews.includes(hash)) {
                this.navigateTo(hash);
            } else {
                // Redirect to default view if invalid
                this.navigateTo('plants');
            }
        },

        /**
         * Navigate to a specific view
         * @param {string} view - The view to navigate to
         * @param {Object} params - Optional parameters for the view
         */
        navigateTo(view, params = {}) {
            // Update the current view
            this.currentView = view;

            // Update the URL hash
            window.location.hash = view;

            // Dispatch a custom event for the view change
            window.dispatchEvent(new CustomEvent('viewchange', {
                detail: { view, params }
            }));
        },

        /**
         * Show a toast message for connectivity status
         * @private
         * @param {string} message - The message to show
         * @param {string} type - The type of toast ('info', 'success', 'error')
         */
        _showConnectivityToast(message, type = 'info') {
            // Create toast element
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;

            // Add to document
            document.body.appendChild(toast);

            // Trigger animation
            setTimeout(() => {
                toast.classList.add('show');
            }, 10);

            // Remove after delay
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 300);
            }, 3000);
        },

        /**
         * Sign out the current user
         */
        async signOut() {
            try {
                await authService.signOut();
                this.navigateTo('plants');
            } catch (error) {
                console.error('Error signing out:', error);
            }
        }
    };
}

// Initialize Alpine.js store for authentication
document.addEventListener('alpine:init', () => {
    Alpine.store('auth', {
        user: null
    });

    Alpine.store('app', {
        offlineMode: !navigator.onLine,
        syncStatus: 'idle'
    });
});

export default appShell;
