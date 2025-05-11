function plantGuide() {
    const app = {
        // Navigation state
        currentView: 'plants', // Default view

        // Plant guide data
        selectedPlant: null,
        plantContent: '',

        // Todo list properties
        todos: [],
        newTodoText: '',

        // Initialize the app
        init() {
            // Make the app instance available globally for auth.js
            window.todoApp = this;

            // If user is already authenticated, load todos
            const user = Alpine.store('auth').user || firebase.auth().currentUser;
            if (user) {
                console.log('App initialized with user:', user.email);
                this.loadTodos();
            } else {
                console.log('App initialized without user');
            }
        },

        // Todo list methods with Firestore
        async loadTodos() {
            const user = Alpine.store('auth').user || firebase.auth().currentUser;
            if (!user) {
                console.log('Cannot load todos: No user logged in');
                return;
            }

            console.log('Loading todos for user:', user.email, 'with UID:', user.uid);

            try {
                // Get todos for the current user
                const snapshot = await db.collection('users').doc(user.uid).collection('todos').get();
                console.log('Firestore query completed. Found', snapshot.docs.length, 'todos');

                this.todos = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                console.log('Todos loaded successfully:', this.todos);
            } catch (error) {
                console.error('Error loading todos:', error);
            }
        },

        async addTodo() {
            if (this.newTodoText.trim() === '') return;

            const user = Alpine.store('auth').user || firebase.auth().currentUser;
            if (!user) {
                console.log('Cannot add todo: No user logged in');
                return;
            }

            console.log('Adding todo for user:', user.email);

            try {
                // Create todo data
                const todoData = {
                    text: this.newTodoText,
                    completed: false,
                    dueDate: null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                console.log('Todo data to be added:', todoData);

                // Add to Firestore
                const docRef = await db.collection('users').doc(user.uid).collection('todos').add(todoData);
                console.log('Todo added to Firestore with ID:', docRef.id);

                // Add to local state
                this.todos.push({
                    id: docRef.id,
                    ...todoData,
                    createdAt: new Date() // Use local date until server timestamp syncs
                });

                this.newTodoText = '';
                console.log('Todo added successfully');
            } catch (error) {
                console.error('Error adding todo:', error);
            }
        },

        async removeTodo(id) {
            const user = Alpine.store('auth').user || firebase.auth().currentUser;
            if (!user) {
                console.log('Cannot remove todo: No user logged in');
                return;
            }

            console.log('Removing todo with ID:', id);

            try {
                // Remove from Firestore
                await db.collection('users').doc(user.uid).collection('todos').doc(id).delete();
                console.log('Todo removed from Firestore');

                // Remove from local state
                this.todos = this.todos.filter(todo => todo.id !== id);
                console.log('Todo removed from local state');
            } catch (error) {
                console.error('Error removing todo:', error);
            }
        },

        async toggleTodo(id) {
            const user = Alpine.store('auth').user || firebase.auth().currentUser;
            if (!user) {
                console.log('Cannot toggle todo: No user logged in');
                return;
            }

            const todo = this.todos.find(todo => todo.id === id);
            if (!todo) {
                console.log('Todo not found with ID:', id);
                return;
            }

            console.log('Toggling todo with ID:', id);

            try {
                // Update in Firestore
                await db.collection('users').doc(user.uid).collection('todos').doc(id).update({
                    completed: !todo.completed
                });
                console.log('Todo updated in Firestore');

                // Update in local state
                todo.completed = !todo.completed;
                console.log('Todo updated in local state. New completed status:', todo.completed);
            } catch (error) {
                console.error('Error toggling todo:', error);
            }
        },

        async setDueDate(id, date) {
            const user = Alpine.store('auth').user || firebase.auth().currentUser;
            if (!user) {
                console.log('Cannot set due date: No user logged in');
                return;
            }

            const todo = this.todos.find(todo => todo.id === id);
            if (!todo) {
                console.log('Todo not found with ID:', id);
                return;
            }

            console.log('Setting due date for todo with ID:', id, 'to', date);

            try {
                // Update in Firestore
                await db.collection('users').doc(user.uid).collection('todos').doc(id).update({
                    dueDate: date ? new Date(date) : null
                });
                console.log('Due date updated in Firestore');

                // Update in local state
                todo.dueDate = date ? new Date(date) : null;
                console.log('Due date updated in local state');
            } catch (error) {
                console.error('Error setting due date:', error);
            }
        },

        // Switch to a specific view
        navigateTo(view) {
            this.currentView = view;
            this.selectedPlant = null; // Reset plant selection when changing views
        },

        // Plant selection method
        selectPlant(plant) {
            this.selectedPlant = plant;
            this.loadPlantInfo(plant);
        },

        // Load plant information
        loadPlantInfo(plant) {
            // Show loading state
            this.plantContent = '<div class="loading">Loading plant information...</div>';

            // Fetch the markdown file
            fetch(`data/${plant}.md`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Plant information not found');
                    }
                    return response.text();
                })
                .then(markdown => {
                    // Parse markdown to HTML
                    this.plantContent = marked.parse(markdown);
                })
                .catch(error => {
                    this.plantContent = `<div class="error">
                        <p>Sorry, we couldn't load information for ${plant}.</p>
                        <p>${error.message}</p>
                    </div>`;
                });
        },

        // Plot layout data and methods
        plotData: {
            width: 10,
            height: 20,
            // Add more plot-specific data as needed
        }
    };

    return app;
}