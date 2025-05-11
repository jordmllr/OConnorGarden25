/**
 * Notification Service
 * Handles push notification registration, permissions, and display
 */

import authService from './auth-service.js';

class NotificationService {
    constructor() {
        this.hasPermission = false;
        this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
        this.swRegistration = null;
    }

    /**
     * Initialize the notification service
     */
    async init() {
        if (!this.isSupported) {
            console.warn('Push notifications are not supported in this browser');
            return;
        }

        // Check if permission is already granted
        this.hasPermission = Notification.permission === 'granted';

        // Get the service worker registration
        try {
            this.swRegistration = await navigator.serviceWorker.getRegistration();
        } catch (error) {
            console.error('Error getting service worker registration:', error);
        }

        // Listen for auth state changes
        authService.addAuthStateListener(user => {
            if (user && this.hasPermission) {
                this.subscribeUserToPush(user.uid);
            }
        });
    }

    /**
     * Request notification permission from the user
     * @returns {Promise<boolean>} - Whether permission was granted
     */
    async requestPermission() {
        if (!this.isSupported) {
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            this.hasPermission = permission === 'granted';
            
            if (this.hasPermission) {
                const user = authService.getCurrentUser();
                if (user) {
                    await this.subscribeUserToPush(user.uid);
                }
            }
            
            return this.hasPermission;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }

    /**
     * Subscribe the user to push notifications
     * @param {string} userId - The user ID
     * @returns {Promise<boolean>} - Whether subscription was successful
     */
    async subscribeUserToPush(userId) {
        if (!this.isSupported || !this.hasPermission || !this.swRegistration) {
            return false;
        }

        try {
            // Get the push subscription
            let subscription = await this.swRegistration.pushManager.getSubscription();
            
            // Create a new subscription if one doesn't exist
            if (!subscription) {
                // Get the server's public key
                // In a real app, this would come from your server
                const publicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
                const applicationServerKey = this.urlB64ToUint8Array(publicKey);
                
                subscription = await this.swRegistration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey
                });
            }
            
            // Send the subscription to your server
            await this.saveSubscription(userId, subscription);
            
            return true;
        } catch (error) {
            console.error('Error subscribing to push notifications:', error);
            return false;
        }
    }

    /**
     * Save the push subscription to the server
     * @param {string} userId - The user ID
     * @param {PushSubscription} subscription - The push subscription
     * @returns {Promise<void>}
     */
    async saveSubscription(userId, subscription) {
        try {
            // Save the subscription to Firestore
            const db = firebase.firestore();
            await db.collection('users').doc(userId).collection('pushSubscriptions').add({
                subscription: JSON.parse(JSON.stringify(subscription)),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error saving push subscription:', error);
            throw error;
        }
    }

    /**
     * Display a notification
     * @param {string} title - Notification title
     * @param {Object} options - Notification options
     * @returns {Promise<boolean>} - Whether notification was displayed
     */
    async showNotification(title, options = {}) {
        if (!this.isSupported || !this.hasPermission) {
            return false;
        }

        try {
            if (this.swRegistration) {
                // Use the service worker to show the notification
                await this.swRegistration.showNotification(title, options);
            } else {
                // Fall back to regular notification
                new Notification(title, options);
            }
            return true;
        } catch (error) {
            console.error('Error showing notification:', error);
            return false;
        }
    }

    /**
     * Schedule a notification for a future time
     * @param {string} title - Notification title
     * @param {Object} options - Notification options
     * @param {Date|number} scheduledTime - When to show the notification
     * @returns {Promise<string>} - ID of the scheduled notification
     */
    async scheduleNotification(title, options = {}, scheduledTime) {
        if (!this.isSupported || !this.hasPermission || !this.swRegistration) {
            throw new Error('Notifications not supported or permission not granted');
        }

        try {
            // Generate a unique ID for this notification
            const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Calculate delay in milliseconds
            const now = Date.now();
            const timestamp = scheduledTime instanceof Date ? scheduledTime.getTime() : scheduledTime;
            const delay = Math.max(0, timestamp - now);
            
            if (delay === 0) {
                // Show immediately if the time has already passed
                await this.showNotification(title, options);
                return notificationId;
            }
            
            // Store the scheduled notification
            const user = authService.getCurrentUser();
            if (user) {
                const db = firebase.firestore();
                await db.collection('users').doc(user.uid).collection('scheduledNotifications').doc(notificationId).set({
                    title,
                    options,
                    scheduledTime: timestamp,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            return notificationId;
        } catch (error) {
            console.error('Error scheduling notification:', error);
            throw error;
        }
    }

    /**
     * Cancel a scheduled notification
     * @param {string} notificationId - ID of the notification to cancel
     * @returns {Promise<boolean>} - Whether cancellation was successful
     */
    async cancelScheduledNotification(notificationId) {
        const user = authService.getCurrentUser();
        if (!user) {
            return false;
        }

        try {
            const db = firebase.firestore();
            await db.collection('users').doc(user.uid).collection('scheduledNotifications').doc(notificationId).delete();
            return true;
        } catch (error) {
            console.error('Error canceling scheduled notification:', error);
            return false;
        }
    }

    /**
     * Convert a base64 string to a Uint8Array for the applicationServerKey
     * @private
     * @param {string} base64String - Base64 encoded string
     * @returns {Uint8Array} - Converted array
     */
    urlB64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        
        return outputArray;
    }
}

// Create and export a singleton instance
const notificationService = new NotificationService();
export default notificationService;
