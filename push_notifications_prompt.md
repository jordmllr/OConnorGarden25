# Implementing Push Notifications for Todo List in O'Connor Garden Guide

This document provides a detailed guide for implementing push notifications in the O'Connor Garden Guide PWA. The notifications will alert users when they have pending tasks in their todo list.

## Table of Contents
1. [Overview](#overview)
2. [Todo List Implementation](#todo-list-implementation)
3. [Push Notifications Implementation](#push-notifications-implementation)
4. [Testing and Troubleshooting](#testing-and-troubleshooting)
5. [Resources](#resources)

## Overview

### What are Push Notifications?
Push notifications are messages that can be sent to a user's device even when they're not actively using your web application. For PWAs, push notifications work through service workers and the Web Push API.

### Benefits for Garden Guide App
- Remind users of pending garden tasks
- Increase user engagement and retention
- Provide timely information about garden maintenance

### Technical Requirements
- Web Push API
- Service Worker
- VAPID keys for server authentication
- User permission for notifications

## Todo List Implementation

Before implementing push notifications, we need to add the todo list functionality to the app.

### 1. Update the Alpine.js Data Model (app.js)

Add todo list functionality to the `plantGuide()` function:

```javascript
function plantGuide() {
    return {
        // Existing properties
        currentView: 'plants',
        selectedPlant: null,
        plantContent: '',
        
        // Todo list properties
        todos: [],
        newTodoText: '',
        
        // Initialize the app
        init() {
            // Load todos from localStorage on app initialization
            this.loadTodos();
            
            // Check for notification permission on startup
            this.checkNotificationPermission();
        },
        
        // Todo list methods
        loadTodos() {
            const savedTodos = localStorage.getItem('garden-todos');
            this.todos = savedTodos ? JSON.parse(savedTodos) : [];
        },
        
        saveTodos() {
            localStorage.setItem('garden-todos', JSON.stringify(this.todos));
            
            // After saving, check if we should send a notification
            this.checkForPendingTasks();
        },
        
        addTodo() {
            if (this.newTodoText.trim() === '') return;
            
            this.todos.push({
                id: Date.now(),
                text: this.newTodoText,
                completed: false,
                dueDate: null
            });
            
            this.newTodoText = '';
            this.saveTodos();
        },
        
        removeTodo(id) {
            this.todos = this.todos.filter(todo => todo.id !== id);
            this.saveTodos();
        },
        
        toggleTodo(id) {
            const todo = this.todos.find(todo => todo.id === id);
            if (todo) {
                todo.completed = !todo.completed;
                this.saveTodos();
            }
        },
        
        setDueDate(id, date) {
            const todo = this.todos.find(todo => todo.id === id);
            if (todo) {
                todo.dueDate = date;
                this.saveTodos();
            }
        },
        
        // Existing methods
        navigateTo(view) {
            this.currentView = view;
            this.selectedPlant = null;
        },
        
        selectPlant(plant) {
            this.selectedPlant = plant;
            this.loadPlantInfo(plant);
        },
        
        loadPlantInfo(plant) {
            // Existing implementation
        },
        
        // Plot layout data and methods
        plotData: {
            width: 10,
            height: 20,
        }
    };
}
```

### 2. Add Todo List HTML Template (index.html)

Add a new navigation button and todo list template:

```html
<!-- In the navigation menu -->
<button @click="navigateTo('todos')" :class="{ active: currentView === 'todos' }">
    <span class="emoji">✅</span>
    <span class="name">Todo List</span>
</button>

<!-- Add this new template section in main -->
<div x-show="currentView === 'todos'" class="todo-list">
    <h2>Garden Tasks</h2>
    
    <!-- Add new todo form -->
    <form @submit.prevent="addTodo" class="todo-form">
        <input 
            type="text" 
            x-model="newTodoText" 
            placeholder="Add a new garden task..." 
            class="todo-input"
        >
        <button type="submit" class="add-todo-btn">Add Task</button>
    </form>
    
    <!-- Todo list -->
    <ul class="todos-container">
        <template x-for="todo in todos" :key="todo.id">
            <li class="todo-item" :class="{ 'completed': todo.completed }">
                <div class="todo-content">
                    <input 
                        type="checkbox" 
                        :checked="todo.completed" 
                        @click="toggleTodo(todo.id)"
                    >
                    <span x-text="todo.text"></span>
                    
                    <!-- Due date display (if set) -->
                    <span x-show="todo.dueDate" class="due-date" x-text="'Due: ' + new Date(todo.dueDate).toLocaleDateString()"></span>
                </div>
                
                <div class="todo-actions">
                    <!-- Date picker for due date -->
                    <input 
                        type="date" 
                        :value="todo.dueDate" 
                        @change="setDueDate(todo.id, $event.target.value)"
                        class="date-picker"
                    >
                    
                    <!-- Delete button -->
                    <button @click="removeTodo(todo.id)" class="delete-todo-btn">
                        ❌
                    </button>
                </div>
            </li>
        </template>
        
        <!-- Empty state -->
        <li x-show="todos.length === 0" class="empty-state">
            No garden tasks yet. Add some tasks to get started!
        </li>
    </ul>
</div>
```

### 3. Add CSS Styles (styles.css)

Add styles for the todo list:

```css
/* Todo List Styles */
.todo-list {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
}

.todo-form {
    display: flex;
    margin-bottom: 1.5rem;
}

.todo-input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px 0 0 4px;
    font-size: 1rem;
}

.add-todo-btn {
    padding: 0.75rem 1rem;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 0 4px 4px 0;
    cursor: pointer;
    font-size: 1rem;
}

.todos-container {
    list-style: none;
    padding: 0;
}

.todo-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border: 1px solid #eee;
    margin-bottom: 0.5rem;
    border-radius: 4px;
    background-color: white;
}

.todo-item.completed {
    opacity: 0.7;
    background-color: #f9f9f9;
}

.todo-item.completed .todo-content span {
    text-decoration: line-through;
}

.todo-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.todo-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.date-picker {
    padding: 0.25rem;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.delete-todo-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
}

.due-date {
    font-size: 0.8rem;
    color: #666;
    margin-left: 0.5rem;
}

.empty-state {
    text-align: center;
    padding: 2rem;
    color: #666;
    font-style: italic;
}
```

## Push Notifications Implementation

Now that we have the todo list functionality, let's implement push notifications.

### 1. Update the Service Worker (sw.js)

Add push notification event listeners to the service worker:

```javascript
// Push notification event listener
self.addEventListener('push', event => {
    const data = event.data.json();
    
    const options = {
        body: data.body,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-32.png',
        data: {
            url: data.url || '/'
        }
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event listener
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    // Open the app and navigate to the specified URL
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
```

### 2. Add Notification Methods to Alpine.js (app.js)

Add notification-related methods to the `plantGuide()` function:

```javascript
// Add these methods to the plantGuide() function
checkNotificationPermission() {
    // Check if the browser supports notifications
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return;
    }
    
    // Check if permission is already granted
    if (Notification.permission === 'granted') {
        this.subscribeUserToPush();
    }
},

requestNotificationPermission() {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            this.subscribeUserToPush();
        }
    });
},

async subscribeUserToPush() {
    try {
        const registration = await navigator.serviceWorker.ready;
        
        // Subscribe the user to push notifications
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array(
                // Your VAPID public key goes here
                'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
            )
        });
        
        console.log('User is subscribed to push notifications');
        
        // Here you would typically send the subscription to your server
        // For this example, we'll just store it in localStorage
        localStorage.setItem('push-subscription', JSON.stringify(subscription));
    } catch (error) {
        console.error('Failed to subscribe the user:', error);
    }
},

// Helper function to convert base64 to Uint8Array
urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
},

// Check for pending tasks and send notification if needed
checkForPendingTasks() {
    // Only proceed if notifications are granted
    if (Notification.permission !== 'granted') return;
    
    // Count incomplete tasks
    const pendingTasks = this.todos.filter(todo => !todo.completed).length;
    
    if (pendingTasks > 0) {
        this.sendNotification(
            'Garden Tasks Reminder',
            `You have ${pendingTasks} pending garden task${pendingTasks > 1 ? 's' : ''} to complete.`
        );
    }
},

// Send a notification
async sendNotification(title, body) {
    // For a real app, this would be handled by a server
    // For this example, we'll use the Notification API directly
    
    const registration = await navigator.serviceWorker.ready;
    
    registration.showNotification(title, {
        body: body,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-32.png',
        data: {
            url: window.location.origin + '/#todos'
        }
    });
}
```

### 3. Add Notification Permission UI (index.html)

Add a button to request notification permissions:

```html
<!-- Add this to the todo list template -->
<div class="notification-permission" x-show="Notification.permission !== 'granted'">
    <p>Enable notifications to get reminders about your garden tasks.</p>
    <button @click="requestNotificationPermission" class="enable-notifications-btn">
        Enable Notifications
    </button>
</div>
```

### 4. Generate VAPID Keys

For a production app, you would need to generate VAPID keys. Here's how to do it:

1. Install the web-push library:
   ```
   npm install web-push -g
   ```

2. Generate VAPID keys:
   ```
   web-push generate-vapid-keys
   ```

3. Replace the placeholder VAPID public key in the `subscribeUserToPush` method with your generated public key.

## Testing and Troubleshooting

### Testing Push Notifications

1. **Local Testing**:
   - Use Chrome DevTools > Application > Service Workers to test push notifications
   - Click "Push" to simulate a push event

2. **Permission Testing**:
   - Reset notification permissions in browser settings to test the permission flow

### Common Issues and Solutions

1. **Notifications not showing**:
   - Check if the service worker is registered correctly
   - Verify that notification permission is granted
   - Ensure the VAPID keys are correctly configured

2. **Service worker not updating**:
   - Increment the CACHE_NAME in sw.js to force an update
   - Use DevTools to unregister the service worker and reload

## Resources

- [Web Push Notifications Guide](https://developers.google.com/web/fundamentals/push-notifications)
- [MDN Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker Cookbook](https://serviceworke.rs/)
- [Web Push Libraries](https://github.com/web-push-libs/web-push)
