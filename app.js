/**
 * Garden Guide App - Modular Version
 * Main application entry point
 */

// Import services
import authService from './services/auth-service.js';
import dataService from './services/data-service.js';
import syncService from './services/sync-service.js';
import notificationService from './services/notification-service.js';

// Import modules
import plantList from './modules/plants/plant-list.js';
import plantDetail from './modules/plants/plant-detail.js';
import plotManager from './modules/plot/plot-manager.js';
import taskManager from './modules/tasks/task-manager.js';

// Main app component
function gardenApp() {
    return {
        // App state
        currentView: 'dashboard', // Default view
        isInitialized: false,
        isLoading: true,
        error: null,
        
        // Initialize the app
        async init() {
            console.log('Initializing Garden Guide App...');
            this.isLoading = true;
            
            try {
                // Initialize services
                await this._initializeServices();
                
                // Set up event listeners
                this._setupEventListeners();
                
                // Check authentication state
                const user = authService.getCurrentUser();
                if (user) {
                    console.log('User is authenticated:', user.email);
                } else {
                    console.log('No authenticated user');
                    this.currentView = 'login';
                }
                
                this.isInitialized = true;
                this.isLoading = false;
                console.log('App initialization complete');
            } catch (error) {
                console.error('Error initializing app:', error);
                this.error = 'Failed to initialize the application. Please refresh the page.';
                this.isLoading = false;
            }
        },
        
        /**
         * Initialize all services
         * @private
         */
        async _initializeServices() {
            try {
                // Initialize auth service
                await authService.init();
                console.log('Auth service initialized');
                
                // Initialize data service
                await dataService.init();
                console.log('Data service initialized');
                
                // Initialize sync service
                await syncService.init();
                console.log('Sync service initialized');
                
                // Initialize notification service
                await notificationService.init();
                console.log('Notification service initialized');
            } catch (error) {
                console.error('Error initializing services:', error);
                throw error;
            }
        },
        
        /**
         * Set up event listeners
         * @private
         */
        _setupEventListeners() {
            // Listen for auth state changes
            authService.addAuthStateListener(user => {
                if (user) {
                    console.log('User signed in:', user.email);
                    if (this.currentView === 'login') {
                        this.navigateTo('dashboard');
                    }
                } else {
                    console.log('User signed out');
                    this.navigateTo('login');
                }
            });
        },
        
        /**
         * Navigate to a specific view
         * @param {string} view - View name
         */
        navigateTo(view) {
            this.currentView = view;
            
            // Update URL hash
            window.location.hash = view;
            
            // Dispatch navigation event
            window.dispatchEvent(new CustomEvent('app-navigation', {
                detail: { view }
            }));
        },
        
        /**
         * Sign out the current user
         */
        async signOut() {
            try {
                await authService.signOut();
            } catch (error) {
                console.error('Error signing out:', error);
                this.error = 'Failed to sign out. Please try again.';
            }
        },
        
        /**
         * Check if a view is active
         * @param {string} view - View name
         * @returns {boolean} - Whether the view is active
         */
        isViewActive(view) {
            return this.currentView === view;
        }
    };
}

// Register Alpine components
document.addEventListener('alpine:init', () => {
    // Register main app
    Alpine.data('gardenApp', gardenApp);
    
    // Register module components
    Alpine.data('plantList', plantList);
    Alpine.data('plantDetail', plantDetail);
    Alpine.data('plotManager', plotManager);
    Alpine.data('taskManager', taskManager);
});

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, waiting for Alpine to initialize components');
});
