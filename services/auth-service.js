/**
 * Authentication Service
 * Handles user authentication operations and state management
 */

class AuthService {
    constructor() {
        this.auth = firebase.auth();
        this.currentUser = null;
        this.authStateListeners = [];
    }

    /**
     * Initialize the authentication service
     */
    init() {
        // Set up auth state change listener
        this.auth.onAuthStateChanged(user => {
            this.currentUser = user;
            this._notifyListeners(user);
            
            // Update Alpine.js store if available
            if (window.Alpine && Alpine.store('auth')) {
                Alpine.store('auth').user = user;
            }
        });
    }

    /**
     * Sign in with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise} - Authentication promise
     */
    async signInWithEmail(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            return userCredential.user;
        } catch (error) {
            console.error('Error signing in with email:', error);
            throw error;
        }
    }

    /**
     * Sign up with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise} - Authentication promise
     */
    async signUpWithEmail(email, password) {
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            return userCredential.user;
        } catch (error) {
            console.error('Error signing up with email:', error);
            throw error;
        }
    }

    /**
     * Sign in with Google
     * @returns {Promise} - Authentication promise
     */
    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const userCredential = await this.auth.signInWithPopup(provider);
            return userCredential.user;
        } catch (error) {
            console.error('Error signing in with Google:', error);
            throw error;
        }
    }

    /**
     * Sign out the current user
     * @returns {Promise} - Sign out promise
     */
    async signOut() {
        try {
            await this.auth.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    }

    /**
     * Get the current authenticated user
     * @returns {Object|null} - Current user or null if not authenticated
     */
    getCurrentUser() {
        return this.currentUser || this.auth.currentUser;
    }

    /**
     * Check if a user is currently authenticated
     * @returns {boolean} - True if user is authenticated
     */
    isAuthenticated() {
        return !!this.getCurrentUser();
    }

    /**
     * Add an auth state change listener
     * @param {Function} listener - Callback function that receives the user object
     */
    addAuthStateListener(listener) {
        if (typeof listener === 'function') {
            this.authStateListeners.push(listener);
            
            // Immediately call with current state
            if (this.currentUser) {
                listener(this.currentUser);
            }
        }
    }

    /**
     * Remove an auth state change listener
     * @param {Function} listener - The listener function to remove
     */
    removeAuthStateListener(listener) {
        this.authStateListeners = this.authStateListeners.filter(l => l !== listener);
    }

    /**
     * Notify all listeners of auth state change
     * @private
     * @param {Object|null} user - The current user or null
     */
    _notifyListeners(user) {
        this.authStateListeners.forEach(listener => {
            try {
                listener(user);
            } catch (error) {
                console.error('Error in auth state listener:', error);
            }
        });
    }
}

// Create and export a singleton instance
const authService = new AuthService();
export default authService;
