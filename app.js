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