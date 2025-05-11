/**
 * Garden Guide App - Non-modular Version
 * This file defines all Alpine.js components globally
 */

// Global state and utility functions
let isLoading = true;
let error = null;
let currentView = 'dashboard';
let filteredTasks = [];
let plots = [];

// Utility functions
function isViewActive(view) {
    return currentView === view;
}

function navigateTo(view) {
    currentView = view;

    // Update URL hash
    window.location.hash = view;

    // Dispatch navigation event
    window.dispatchEvent(new CustomEvent('app-navigation', {
        detail: { view }
    }));
}

// Auth Service (simplified global version)
const authService = {
    currentUser: null,
    authStateListeners: [],

    init() {
        // Set up auth state change listener
        firebase.auth().onAuthStateChanged(user => {
            this.currentUser = user;
            this._notifyListeners(user);
        });
    },

    async signInWithEmail(email, password) {
        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            return userCredential.user;
        } catch (error) {
            console.error('Error signing in with email:', error);
            throw error;
        }
    },

    async signUpWithEmail(email, password) {
        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            return userCredential.user;
        } catch (error) {
            console.error('Error signing up with email:', error);
            throw error;
        }
    },

    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const userCredential = await firebase.auth().signInWithPopup(provider);
            return userCredential.user;
        } catch (error) {
            console.error('Error signing in with Google:', error);
            throw error;
        }
    },

    async signOut() {
        try {
            await firebase.auth().signOut();
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    },

    getCurrentUser() {
        return this.currentUser || firebase.auth().currentUser;
    },

    isAuthenticated() {
        return !!this.getCurrentUser();
    },

    addAuthStateListener(listener) {
        if (typeof listener === 'function') {
            this.authStateListeners.push(listener);

            // Immediately call with current state
            if (this.currentUser) {
                listener(this.currentUser);
            }
        }
    },

    removeAuthStateListener(listener) {
        this.authStateListeners = this.authStateListeners.filter(l => l !== listener);
    },

    _notifyListeners(user) {
        this.authStateListeners.forEach(listener => {
            try {
                listener(user);
            } catch (error) {
                console.error('Error in auth state listener:', error);
            }
        });
    }
};

// Task Manager Component
function taskManager() {
    return {
        tasks: [],
        filteredTasks: [],
        selectedTask: null,
        isLoading: true,
        error: null,
        filter: {
            status: 'pending',
            category: 'all',
            sortBy: 'dueDate'
        },

        async init() {
            this.isLoading = true;

            try {
                // Load tasks
                await this.loadTasks();
                this.isLoading = false;
            } catch (error) {
                console.error('Error initializing task manager:', error);
                this.error = 'Failed to load tasks. Please try again.';
                this.isLoading = false;
            }
        },

        async loadTasks() {
            const user = firebase.auth().currentUser;
            if (!user) return;

            try {
                // Get tasks for the current user
                const snapshot = await firebase.firestore()
                    .collection('users')
                    .doc(user.uid)
                    .collection('tasks')
                    .orderBy('dueDate')
                    .get();

                this.tasks = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    // Convert Firestore timestamps to JS Date objects
                    dueDate: doc.data().dueDate?.toDate(),
                    createdAt: doc.data().createdAt?.toDate(),
                    completedAt: doc.data().completedAt?.toDate()
                }));

                this.applyFilters();
            } catch (error) {
                console.error('Error loading tasks:', error);
                throw error;
            }
        },

        applyFilters() {
            let filtered = [...this.tasks];

            // Filter by status
            if (this.filter.status === 'completed') {
                filtered = filtered.filter(task => task.completed);
            } else if (this.filter.status === 'pending') {
                filtered = filtered.filter(task => !task.completed);
            }

            // Filter by category
            if (this.filter.category !== 'all') {
                filtered = filtered.filter(task => task.category === this.filter.category);
            }

            // Sort tasks
            if (this.filter.sortBy === 'dueDate') {
                filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            } else if (this.filter.sortBy === 'priority') {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
            }

            this.filteredTasks = filtered;
            // Update global filteredTasks for dashboard
            window.filteredTasks = filtered;
        }
    };
}

// Plot Manager Component
function plotManager() {
    return {
        plots: [],
        selectedPlot: null,
        cells: [],
        isLoading: true,
        error: null,

        async init() {
            this.isLoading = true;

            try {
                await this.loadPlots();
                this.isLoading = false;
            } catch (error) {
                console.error('Error initializing plot manager:', error);
                this.error = 'Failed to load plots. Please try again.';
                this.isLoading = false;
            }
        },

        async loadPlots() {
            const user = firebase.auth().currentUser;
            if (!user) return;

            try {
                // Get plots for the current user
                const snapshot = await firebase.firestore()
                    .collection('users')
                    .doc(user.uid)
                    .collection('plots')
                    .get();

                this.plots = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Update global plots for dashboard
                window.plots = this.plots;

                // If we have plots and none is selected, select the first one
                if (this.plots.length > 0 && !this.selectedPlot) {
                    await this.selectPlot(this.plots[0].id);
                }
            } catch (error) {
                console.error('Error loading plots:', error);
                throw error;
            }
        },

        async selectPlot(plotId) {
            const plot = this.plots.find(p => p.id === plotId);
            if (plot) {
                this.selectedPlot = plot;
                await this.loadCells();
            }
        },

        async loadCells() {
            if (!this.selectedPlot) return;

            const user = firebase.auth().currentUser;
            if (!user) return;

            try {
                // Get cells for the selected plot
                const snapshot = await firebase.firestore()
                    .collection('users')
                    .doc(user.uid)
                    .collection('plots')
                    .doc(this.selectedPlot.id)
                    .collection('cells')
                    .get();

                this.cells = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('Error loading cells:', error);
                throw error;
            }
        }
    };
}

// Plant List Component
function plantList() {
    return {
        plants: [],
        filteredPlants: [],
        selectedPlant: null,
        searchTerm: '',
        isLoading: true,
        error: null,

        async init() {
            this.isLoading = true;

            try {
                await this.loadPlants();
                this.isLoading = false;
            } catch (error) {
                console.error('Error initializing plant list:', error);
                this.error = 'Failed to load plants. Please try again.';
                this.isLoading = false;
            }
        },

        async loadPlants() {
            try {
                // Get plants from Firestore
                const snapshot = await firebase.firestore()
                    .collection('plants')
                    .get();

                this.plants = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                this.filterPlants();
            } catch (error) {
                console.error('Error loading plants:', error);
                throw error;
            }
        },

        filterPlants() {
            if (!this.searchTerm) {
                this.filteredPlants = [...this.plants];
                return;
            }

            const searchTerm = this.searchTerm.toLowerCase();

            this.filteredPlants = this.plants.filter(plant =>
                plant.name.toLowerCase().includes(searchTerm) ||
                (plant.scientificName && plant.scientificName.toLowerCase().includes(searchTerm))
            );
        },

        handleSearch() {
            this.filterPlants();
        },

        selectPlant(plantId) {
            this.selectedPlant = this.plants.find(plant => plant.id === plantId) || null;
        }
    };
}

// Main App Component
function gardenApp() {
    return {
        currentView: 'dashboard',
        isInitialized: false,
        isLoading: true,
        error: null,

        async init() {
            console.log('Initializing Garden Guide App...');
            this.isLoading = true;

            try {
                // Initialize auth service
                authService.init();

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

        navigateTo(view) {
            this.currentView = view;
            currentView = view; // Update global state

            // Update URL hash
            window.location.hash = view;
        },

        async signOut() {
            try {
                await authService.signOut();
            } catch (error) {
                console.error('Error signing out:', error);
                this.error = 'Failed to sign out. Please try again.';
            }
        },

        isViewActive(view) {
            return this.currentView === view;
        }
    };
}

// Make functions available globally
window.isViewActive = isViewActive;
window.navigateTo = navigateTo;
window.authService = authService;
window.isLoading = isLoading;
window.error = error;
window.filteredTasks = filteredTasks;
window.plots = plots;
window.init = function() {
    console.log('Global init function called');
    // This is a placeholder that will be overridden by component methods
};

// Register Alpine components
document.addEventListener('alpine:init', () => {
    // Register main app
    Alpine.data('gardenApp', gardenApp);

    // Register module components
    Alpine.data('plantList', plantList);
    Alpine.data('plantDetail', () => ({})); // Empty placeholder
    Alpine.data('plotManager', plotManager);
    Alpine.data('taskManager', taskManager);
});
