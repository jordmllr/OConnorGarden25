# Adding Firebase Firestore to O'Connor Garden Guide

This tutorial will guide you through the process of integrating Firebase Firestore into your O'Connor Garden Guide PWA. This will allow your todo list data to sync across multiple devices while maintaining offline functionality.

## Table of Contents

1. [Introduction](#introduction)
2. [Setting Up Firebase](#setting-up-firebase)
3. [Installing Firebase in Your Project](#installing-firebase-in-your-project)
4. [Configuring Firebase Authentication](#configuring-firebase-authentication)
5. [Implementing Firestore for Todo List](#implementing-firestore-for-todo-list)
6. [Enabling Offline Persistence](#enabling-offline-persistence)
7. [Testing and Troubleshooting](#testing-and-troubleshooting)
8. [Security Best Practices](#security-best-practices)
9. [Next Steps](#next-steps)

## Introduction

Firebase Firestore is a flexible, scalable NoSQL cloud database that lets you store and sync data across multiple devices. It's perfect for PWAs like your garden guide because it:

- Provides real-time data synchronization
- Works offline with automatic syncing when back online
- Has a generous free tier for small applications
- Integrates well with other Firebase services like Authentication

In this tutorial, we'll focus on implementing Firestore for your todo list feature, allowing users to access their garden tasks across multiple devices.

## Setting Up Firebase

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "O'Connor Garden Guide")
4. Choose whether to enable Google Analytics (recommended)
5. Click "Create project"

### 2. Register Your Web App

1. In the Firebase console, click the web icon (</>) to add a web app
2. Enter a nickname for your app (e.g., "Garden Guide Web")
3. Check the box for "Also set up Firebase Hosting" if you plan to use it
4. Click "Register app"
5. Firebase will provide configuration code - save this for later
  ```javascript
  <script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyC3rUx7OFR7-Clnwlm2Ir8Om133xRzbCg4",
    authDomain: "gardenplot-63938.firebaseapp.com",
    projectId: "gardenplot-63938",
    storageBucket: "gardenplot-63938.firebasestorage.app",
    messagingSenderId: "1085971188380",
    appId: "1:1085971188380:web:e1652c05a11f950fe5fb59"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
</script>
  ```
6. Click "Continue to console"

### 3. Set Up Firestore Database

1. In the Firebase console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in production mode" (we'll set up rules later)
4. Select a location closest to your users
5. Click "Enable"

## Installing Firebase in Your Project

### 1. Add Firebase SDK to Your Project

Add the Firebase SDK to your `index.html` file, just before your closing `</body>` tag:

```html
<!-- Firebase App (the core Firebase SDK) -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js"></script>

<!-- Add Firebase products that you want to use -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js"></script>

<!-- Initialize Firebase -->
<script>
  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyC3rUx7OFR7-Clnwlm2Ir8Om133xRzbCg4",
    authDomain: "gardenplot-63938.firebaseapp.com",
    projectId: "gardenplot-63938",
    storageBucket: "gardenplot-63938.firebasestorage.app",
    messagingSenderId: "1085971188380",
    appId: "1:1085971188380:web:e1652c05a11f950fe5fb59"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  
  // Initialize Firestore
  const db = firebase.firestore();
  
  // Enable offline persistence
  db.enablePersistence()
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time
        console.log('Persistence failed: Multiple tabs open');
      } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the features required for persistence
        console.log('Persistence not supported by this browser');
      }
    });
</script>

<!-- Your existing scripts -->
<script src="app.js"></script>
```

Replace the placeholder values in `firebaseConfig` with the actual values from your Firebase project.

## Configuring Firebase Authentication

To ensure users can access only their own data across devices, we need to implement authentication:

### 1. Enable Authentication Methods

1. In the Firebase console, go to "Authentication"
2. Click "Get started"
3. Enable the "Email/Password" provider
4. Optionally, enable "Google" for easier sign-in

### 2. Add Authentication UI to Your App

Add a simple login form to your app. Create a new file called `auth.js`:

```javascript
function authHandler() {
  return {
    user: null,
    email: '',
    password: '',
    errorMessage: '',
    isLoading: false,
    
    init() {
      // Check if user is already signed in
      firebase.auth().onAuthStateChanged(user => {
        this.user = user;
        if (user) {
          // User is signed in, load their todos
          if (window.todoApp) {
            window.todoApp.loadTodos();
          }
        }
      });
    },
    
    signIn() {
      this.isLoading = true;
      this.errorMessage = '';
      
      firebase.auth().signInWithEmailAndPassword(this.email, this.password)
        .then(() => {
          this.email = '';
          this.password = '';
        })
        .catch(error => {
          this.errorMessage = error.message;
        })
        .finally(() => {
          this.isLoading = false;
        });
    },
    
    signUp() {
      this.isLoading = true;
      this.errorMessage = '';
      
      firebase.auth().createUserWithEmailAndPassword(this.email, this.password)
        .then(() => {
          this.email = '';
          this.password = '';
        })
        .catch(error => {
          this.errorMessage = error.message;
        })
        .finally(() => {
          this.isLoading = false;
        });
    },
    
    signOut() {
      firebase.auth().signOut();
    },
    
    signInWithGoogle() {
      const provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(provider)
        .catch(error => {
          this.errorMessage = error.message;
        });
    }
  };
}
```

### 3. Add Authentication UI to Your HTML

Add this to your `index.html` to create a login/signup form:

```html
<!-- Add this before your main app container -->
<div x-data="authHandler()" x-init="init()" class="auth-container" x-show="!user">
  <div class="auth-form">
    <h2>Sign In to Sync Your Garden Tasks</h2>
    
    <div class="form-group">
      <label for="email">Email</label>
      <input type="email" id="email" x-model="email" placeholder="your@email.com">
    </div>
    
    <div class="form-group">
      <label for="password">Password</label>
      <input type="password" id="password" x-model="password" placeholder="Your password">
    </div>
    
    <div class="error-message" x-show="errorMessage" x-text="errorMessage"></div>
    
    <div class="auth-buttons">
      <button @click="signIn()" :disabled="isLoading">Sign In</button>
      <button @click="signUp()" :disabled="isLoading">Sign Up</button>
    </div>
    
    <div class="google-signin">
      <button @click="signInWithGoogle()">
        <img src="https://developers.google.com/identity/images/btn_google_signin_light_normal_web.png" alt="Sign in with Google">
      </button>
    </div>
  </div>
</div>

<!-- Add this to your header to show the current user and sign out button -->
<div class="user-info" x-data="authHandler()" x-show="user">
  <span x-text="user ? 'Signed in as: ' + user.email : ''"></span>
  <button @click="signOut()" class="sign-out-btn">Sign Out</button>
</div>
```

Add the script tag for `auth.js` in your `index.html`:

```html
<script src="auth.js"></script>
```

## Implementing Firestore for Todo List

Now, let's modify your todo list implementation to use Firestore instead of localStorage:

### 1. Update the Alpine.js Data Model

Modify your `plantGuide()` function in `app.js` to use Firestore:

```javascript
function plantGuide() {
  const app = {
    // Existing properties
    currentView: 'plants',
    selectedPlant: null,
    plantContent: '',
    
    // Todo list properties
    todos: [],
    newTodoText: '',
    
    // Initialize the app
    init() {
      // If user is already authenticated, load todos
      const user = firebase.auth().currentUser;
      if (user) {
        this.loadTodos();
      }
      
      // Make the app instance available globally for auth.js
      window.todoApp = this;
    },
    
    // Todo list methods with Firestore
    async loadTodos() {
      const user = firebase.auth().currentUser;
      if (!user) return;
      
      try {
        // Get todos for the current user
        const snapshot = await db.collection('users').doc(user.uid).collection('todos').get();
        
        this.todos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error('Error loading todos:', error);
      }
    },
    
    async addTodo() {
      if (this.newTodoText.trim() === '') return;
      const user = firebase.auth().currentUser;
      if (!user) return;
      
      try {
        // Create todo data
        const todoData = {
          text: this.newTodoText,
          completed: false,
          dueDate: null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add to Firestore
        const docRef = await db.collection('users').doc(user.uid).collection('todos').add(todoData);
        
        // Add to local state
        this.todos.push({
          id: docRef.id,
          ...todoData,
          createdAt: new Date() // Use local date until server timestamp syncs
        });
        
        this.newTodoText = '';
      } catch (error) {
        console.error('Error adding todo:', error);
      }
    },
    
    async removeTodo(id) {
      const user = firebase.auth().currentUser;
      if (!user) return;
      
      try {
        // Remove from Firestore
        await db.collection('users').doc(user.uid).collection('todos').doc(id).delete();
        
        // Remove from local state
        this.todos = this.todos.filter(todo => todo.id !== id);
      } catch (error) {
        console.error('Error removing todo:', error);
      }
    },
    
    async toggleTodo(id) {
      const user = firebase.auth().currentUser;
      if (!user) return;
      
      const todo = this.todos.find(todo => todo.id === id);
      if (!todo) return;
      
      try {
        // Update in Firestore
        await db.collection('users').doc(user.uid).collection('todos').doc(id).update({
          completed: !todo.completed
        });
        
        // Update in local state
        todo.completed = !todo.completed;
      } catch (error) {
        console.error('Error toggling todo:', error);
      }
    },
    
    async setDueDate(id, date) {
      const user = firebase.auth().currentUser;
      if (!user) return;
      
      const todo = this.todos.find(todo => todo.id === id);
      if (!todo) return;
      
      try {
        // Update in Firestore
        await db.collection('users').doc(user.uid).collection('todos').doc(id).update({
          dueDate: date ? new Date(date) : null
        });
        
        // Update in local state
        todo.dueDate = date ? new Date(date) : null;
      } catch (error) {
        console.error('Error setting due date:', error);
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
  
  return app;
}
```

## Enabling Offline Persistence

Firebase Firestore supports offline persistence out of the box. We've already added the code to enable it in the Firebase initialization section:

```javascript
// Enable offline persistence
db.enablePersistence()
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.log('Persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the features required for persistence
      console.log('Persistence not supported by this browser');
    }
  });
```

This allows your app to:
- Work offline
- Automatically sync changes when back online
- Cache data for faster loading

## Testing and Troubleshooting

### Testing Your Implementation

1. **Test Authentication:**
   - Try signing up with a new account
   - Sign out and sign back in
   - Try signing in with Google (if enabled)

2. **Test Todo List with Firestore:**
   - Add new todos and verify they appear in Firestore console
   - Toggle todo completion status
   - Set due dates
   - Delete todos

3. **Test Offline Functionality:**
   - Turn off your internet connection
   - Add, edit, and delete todos
   - Turn internet back on and verify changes sync to Firestore

### Common Issues and Solutions

1. **Authentication Errors:**
   - Check that you've enabled the authentication methods in Firebase console
   - Verify your Firebase config values are correct

2. **Firestore Permission Errors:**
   - Check your Firestore security rules
   - Ensure users are properly authenticated before accessing Firestore

3. **Offline Sync Issues:**
   - Make sure enablePersistence() is called before any other Firestore operations
   - Check browser console for specific error messages

## Security Best Practices

### 1. Set Up Firestore Security Rules

In the Firebase console, go to Firestore Database > Rules and update them to:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write only their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

These rules ensure that:
- Users can only access their own data
- Authentication is required for all operations
- No one can access another user's data

### 2. Protect Your Firebase API Keys

While it's generally safe to include Firebase config in client-side code, you should:

1. Set up Firebase App Check for additional security
2. Restrict your API key in the Google Cloud Console to only allow requests from your app's domains

## Next Steps

Now that you have Firestore integrated with your Garden Guide app, you can:

1. **Implement Push Notifications** - Use Firebase Cloud Messaging (FCM) to send notifications about upcoming garden tasks
2. **Add More Firestore Collections** - Store user preferences, garden layouts, or custom plant information
3. **Implement User Profiles** - Allow users to customize their experience and share garden information
4. **Add Analytics** - Use Firebase Analytics to understand how users interact with your app

By following this tutorial, you've transformed your Garden Guide app into a cross-device, offline-capable application with cloud synchronization. Users can now access their garden tasks from any device while maintaining the PWA's offline functionality.
