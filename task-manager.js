// Task Manager
function taskManager() {
  return {
    tasks: [],
    plantings: [],
    isLoading: true,
    filterStatus: 'all', // all, pending, completed
    filterCategory: 'all',
    categories: ['planting', 'watering', 'fertilizing', 'harvesting', 'maintenance', 'pest control'],
    
    // Initialize the task manager
    async init() {
      this.isLoading = true;
      
      // Load tasks from Firestore
      await this.loadTasks();
      
      // Load plantings for reference
      await this.loadPlantings();
      
      this.isLoading = false;
    },
    
    // Load tasks from Firestore
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
      } catch (error) {
        console.error('Error loading tasks:', error);
      }
    },
    
    // Load plantings from Firestore
    async loadPlantings() {
      const user = firebase.auth().currentUser;
      if (!user) return;
      
      try {
        // Get plantings for the current user
        const snapshot = await firebase.firestore()
          .collection('users')
          .doc(user.uid)
          .collection('plantings')
          .orderBy('plantedDate', 'desc')
          .get();
        
        this.plantings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Convert Firestore timestamps to JS Date objects
          plantedDate: doc.data().plantedDate?.toDate(),
          expectedHarvestDate: doc.data().expectedHarvestDate?.toDate(),
          actualHarvestDate: doc.data().actualHarvestDate?.toDate(),
          createdAt: doc.data().createdAt?.toDate()
        }));
      } catch (error) {
        console.error('Error loading plantings:', error);
      }
    },
    
    // Add a new task
    async addTask(taskData) {
      const user = firebase.auth().currentUser;
      if (!user) return;
      
      try {
        // Create task data
        const newTask = {
          title: taskData.title,
          description: taskData.description || '',
          dueDate: new Date(taskData.dueDate),
          completed: false,
          priority: taskData.priority || 'medium',
          category: taskData.category || 'maintenance',
          relatedPlantingId: taskData.relatedPlantingId || null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          recurring: taskData.recurring || false,
          recurrencePattern: taskData.recurrencePattern || null
        };
        
        // Add to Firestore
        const docRef = await firebase.firestore()
          .collection('users')
          .doc(user.uid)
          .collection('tasks')
          .add(newTask);
        
        // Add to local state
        this.tasks.push({
          id: docRef.id,
          ...newTask,
          createdAt: new Date() // Use local date until server timestamp syncs
        });
        
        // Sort tasks by due date
        this.sortTasksByDueDate();
      } catch (error) {
        console.error('Error adding task:', error);
      }
    },
    
    // Toggle task completion status
    async toggleTaskCompletion(taskId) {
      const user = firebase.auth().currentUser;
      if (!user) return;
      
      try {
        // Find the task
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        if (taskIndex === -1) return;
        
        const task = this.tasks[taskIndex];
        const newCompletedStatus = !task.completed;
        
        // Update in Firestore
        await firebase.firestore()
          .collection('users')
          .doc(user.uid)
          .collection('tasks')
          .doc(taskId)
          .update({
            completed: newCompletedStatus,
            completedAt: newCompletedStatus ? firebase.firestore.FieldValue.serverTimestamp() : null
          });
        
        // Update in local state
        this.tasks[taskIndex].completed = newCompletedStatus;
        this.tasks[taskIndex].completedAt = newCompletedStatus ? new Date() : null;
        
        // If task is recurring and was just completed, create the next occurrence
        if (newCompletedStatus && task.recurring) {
          await this.createNextRecurringTask(task);
        }
      } catch (error) {
        console.error('Error toggling task completion:', error);
      }
    },
    
    // Create the next occurrence of a recurring task
    async createNextRecurringTask(completedTask) {
      if (!completedTask.recurring || !completedTask.recurrencePattern) return;
      
      try {
        // Parse the recurrence pattern (e.g., "every7days")
        const match = completedTask.recurrencePattern.match(/every(\d+)(days|weeks|months)/);
        if (!match) return;
        
        const [, interval, unit] = match;
        const intervalNum = parseInt(interval);
        
        // Calculate the next due date
        const nextDueDate = new Date(completedTask.dueDate);
        
        if (unit === 'days') {
          nextDueDate.setDate(nextDueDate.getDate() + intervalNum);
        } else if (unit === 'weeks') {
          nextDueDate.setDate(nextDueDate.getDate() + (intervalNum * 7));
        } else if (unit === 'months') {
          nextDueDate.setMonth(nextDueDate.getMonth() + intervalNum);
        }
        
        // Create a new task for the next occurrence
        await this.addTask({
          title: completedTask.title,
          description: completedTask.description,
          dueDate: nextDueDate,
          priority: completedTask.priority,
          category: completedTask.category,
          relatedPlantingId: completedTask.relatedPlantingId,
          recurring: true,
          recurrencePattern: completedTask.recurrencePattern
        });
      } catch (error) {
        console.error('Error creating next recurring task:', error);
      }
    },
    
    // Delete a task
    async deleteTask(taskId) {
      const user = firebase.auth().currentUser;
      if (!user) return;
      
      try {
        // Delete from Firestore
        await firebase.firestore()
          .collection('users')
          .doc(user.uid)
          .collection('tasks')
          .doc(taskId)
          .delete();
        
        // Delete from local state
        this.tasks = this.tasks.filter(task => task.id !== taskId);
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    },
    
    // Update a task
    async updateTask(taskId, updates) {
      const user = firebase.auth().currentUser;
      if (!user) return;
      
      try {
        // Find the task
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        if (taskIndex === -1) return;
        
        // Update in Firestore
        await firebase.firestore()
          .collection('users')
          .doc(user.uid)
          .collection('tasks')
          .doc(taskId)
          .update(updates);
        
        // Update in local state
        this.tasks[taskIndex] = {
          ...this.tasks[taskIndex],
          ...updates
        };
        
        // Sort tasks by due date if the due date was updated
        if (updates.dueDate) {
          this.sortTasksByDueDate();
        }
      } catch (error) {
        console.error('Error updating task:', error);
      }
    },
    
    // Sort tasks by due date
    sortTasksByDueDate() {
      this.tasks.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate - b.dueDate;
      });
    },
    
    // Get filtered tasks
    getFilteredTasks() {
      return this.tasks.filter(task => {
        // Filter by status
        if (this.filterStatus === 'pending' && task.completed) return false;
        if (this.filterStatus === 'completed' && !task.completed) return false;
        
        // Filter by category
        if (this.filterCategory !== 'all' && task.category !== this.filterCategory) return false;
        
        return true;
      });
    },
    
    // Get planting by ID
    getPlanting(plantingId) {
      return this.plantings.find(planting => planting.id === plantingId);
    },
    
    // Format date for display
    formatDate(date) {
      if (!date) return '';
      return new Date(date).toLocaleDateString();
    },
    
    // Get tasks for a specific planting
    getTasksForPlanting(plantingId) {
      return this.tasks.filter(task => task.relatedPlantingId === plantingId);
    },
    
    // Generate automatic tasks for a planting
    async generateTasksForPlanting(plantingId, plantId) {
      // This would typically be called when a new planting is created
      // It would fetch the plant's task templates and create tasks based on them
      // Similar to the implementation in plot-manager.js
    }
  };
}
