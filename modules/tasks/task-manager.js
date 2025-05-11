/**
 * Task Manager Component
 * Provides UI for managing garden tasks
 */

import { TaskModel } from './task-model.js';
import taskService from './task-service.js';
import taskScheduler from './task-scheduler.js';

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
        isEditMode: false,
        editData: {},
        
        /**
         * Initialize the task manager
         */
        async init() {
            this.isLoading = true;
            
            try {
                // Initialize task scheduler
                taskScheduler.init();
                
                // Load tasks
                await this.loadTasks();
                
                // Listen for cell selection events
                window.addEventListener('cell-selected', event => {
                    if (event.detail.cell) {
                        this.loadTasksForPlanting(event.detail.cell.id);
                    }
                });
                
                this.isLoading = false;
            } catch (error) {
                console.error('Error initializing task manager:', error);
                this.error = 'Failed to load tasks. Please try again.';
                this.isLoading = false;
            }
        },
        
        /**
         * Load tasks from the service
         */
        async loadTasks() {
            try {
                this.tasks = await taskService.getAllTasks();
                this.applyFilters();
            } catch (error) {
                console.error('Error loading tasks:', error);
                throw error;
            }
        },
        
        /**
         * Apply filters to tasks
         */
        applyFilters() {
            let filtered = [...this.tasks];
            
            // Filter by status
            if (this.filter.status === 'completed') {
                filtered = filtered.filter(task => task.completed);
            } else if (this.filter.status === 'pending') {
                filtered = filtered.filter(task => !task.completed);
            } else if (this.filter.status === 'overdue') {
                const now = new Date();
                filtered = filtered.filter(task => 
                    !task.completed && task.dueDate < now
                );
            } else if (this.filter.status === 'upcoming') {
                const now = new Date();
                const nextWeek = new Date();
                nextWeek.setDate(now.getDate() + 7);
                
                filtered = filtered.filter(task => 
                    !task.completed && 
                    task.dueDate >= now && 
                    task.dueDate <= nextWeek
                );
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
            } else if (this.filter.sortBy === 'title') {
                filtered.sort((a, b) => a.title.localeCompare(b.title));
            }
            
            this.filteredTasks = filtered;
        },
        
        /**
         * Change the filter
         * @param {string} filterType - Type of filter to change
         * @param {string} value - New filter value
         */
        changeFilter(filterType, value) {
            this.filter[filterType] = value;
            this.applyFilters();
        },
        
        /**
         * Select a task
         * @param {string} taskId - Task ID
         */
        async selectTask(taskId) {
            try {
                this.selectedTask = await taskService.getTaskById(taskId);
                
                // Dispatch event for other components
                window.dispatchEvent(new CustomEvent('task-selected', {
                    detail: { task: this.selectedTask }
                }));
            } catch (error) {
                console.error(`Error selecting task ${taskId}:`, error);
                this.selectedTask = null;
            }
        },
        
        /**
         * Load tasks for a specific planting
         * @param {string} plantingId - Planting ID (cell ID)
         */
        async loadTasksForPlanting(plantingId) {
            try {
                this.tasks = await taskService.getTasksForPlanting(plantingId);
                this.applyFilters();
            } catch (error) {
                console.error(`Error loading tasks for planting ${plantingId}:`, error);
                throw error;
            }
        },
        
        /**
         * Add a new task
         * @param {Object} taskData - Task data
         */
        async addTask(taskData) {
            try {
                const taskModel = new TaskModel(taskData);
                const taskId = await taskService.addTask(taskModel);
                
                // Reload tasks
                await this.loadTasks();
                
                // Select the new task
                await this.selectTask(taskId);
                
                return taskId;
            } catch (error) {
                console.error('Error adding task:', error);
                throw error;
            }
        },
        
        /**
         * Update an existing task
         * @param {string} taskId - Task ID
         * @param {Object} taskData - Updated task data
         */
        async updateTask(taskId, taskData) {
            try {
                await taskService.updateTask(taskId, taskData);
                
                // Reload tasks
                await this.loadTasks();
                
                // Update selection if this was the selected task
                if (this.selectedTask && this.selectedTask.id === taskId) {
                    await this.selectTask(taskId);
                }
            } catch (error) {
                console.error(`Error updating task ${taskId}:`, error);
                throw error;
            }
        },
        
        /**
         * Delete a task
         * @param {string} taskId - Task ID
         */
        async deleteTask(taskId) {
            try {
                await taskService.deleteTask(taskId);
                
                // Reload tasks
                await this.loadTasks();
                
                // Clear selection if this was the selected task
                if (this.selectedTask && this.selectedTask.id === taskId) {
                    this.selectedTask = null;
                }
            } catch (error) {
                console.error(`Error deleting task ${taskId}:`, error);
                throw error;
            }
        },
        
        /**
         * Complete a task
         * @param {string} taskId - Task ID
         */
        async completeTask(taskId) {
            try {
                const nextTaskId = await taskService.completeTask(taskId);
                
                // Reload tasks
                await this.loadTasks();
                
                // If this was the selected task, select the next task if available
                if (this.selectedTask && this.selectedTask.id === taskId) {
                    if (nextTaskId) {
                        await this.selectTask(nextTaskId);
                    } else {
                        this.selectedTask = null;
                    }
                }
            } catch (error) {
                console.error(`Error completing task ${taskId}:`, error);
                throw error;
            }
        },
        
        /**
         * Uncomplete a task
         * @param {string} taskId - Task ID
         */
        async uncompleteTask(taskId) {
            try {
                await taskService.uncompleteTask(taskId);
                
                // Reload tasks
                await this.loadTasks();
                
                // Update selection if this was the selected task
                if (this.selectedTask && this.selectedTask.id === taskId) {
                    await this.selectTask(taskId);
                }
            } catch (error) {
                console.error(`Error uncompleting task ${taskId}:`, error);
                throw error;
            }
        },
        
        /**
         * Enter edit mode
         */
        enterEditMode() {
            this.isEditMode = true;
            
            // Clone the task data for editing
            this.editData = {
                title: this.selectedTask.title,
                description: this.selectedTask.description,
                dueDate: this.selectedTask.dueDate,
                priority: this.selectedTask.priority,
                category: this.selectedTask.category,
                recurring: this.selectedTask.recurring,
                recurrencePattern: this.selectedTask.recurrencePattern
            };
        },
        
        /**
         * Cancel edit mode
         */
        cancelEdit() {
            this.isEditMode = false;
            this.editData = {};
        },
        
        /**
         * Save task changes
         */
        async saveTask() {
            if (!this.selectedTask) return;
            
            try {
                await this.updateTask(this.selectedTask.id, this.editData);
                
                // Exit edit mode
                this.isEditMode = false;
                this.editData = {};
            } catch (error) {
                console.error('Error saving task:', error);
                this.error = 'Failed to save task changes. Please try again.';
            }
        }
    };
}

export default taskManager;
