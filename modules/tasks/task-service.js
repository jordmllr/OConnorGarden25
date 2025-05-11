/**
 * Task Service
 * Provides operations for managing garden tasks
 */

import { TaskModel } from './task-model.js';
import dataService from '../../services/data-service.js';
import authService from '../../services/auth-service.js';

class TaskService {
    constructor() {
        this.collectionName = 'tasks';
    }

    /**
     * Get all tasks for the current user
     * @returns {Promise<Array<TaskModel>>} - Array of task models
     */
    async getAllTasks() {
        try {
            const user = authService.getCurrentUser();
            if (!user) {
                throw new Error('User must be authenticated to access tasks');
            }

            const tasks = await dataService.getAll(this.collectionName);
            
            // Filter tasks by user ID
            const userTasks = tasks.filter(task => task.userId === user.uid);
            
            return userTasks.map(task => TaskModel.fromObject(task));
        } catch (error) {
            console.error('Error getting all tasks:', error);
            throw error;
        }
    }

    /**
     * Get a task by ID
     * @param {string} id - Task ID
     * @returns {Promise<TaskModel>} - Task model
     */
    async getTaskById(id) {
        try {
            const task = await dataService.getById(this.collectionName, id);
            return TaskModel.fromObject(task);
        } catch (error) {
            console.error(`Error getting task ${id}:`, error);
            throw error;
        }
    }

    /**
     * Add a new task
     * @param {TaskModel} taskModel - Task model to add
     * @returns {Promise<string>} - ID of the new task
     */
    async addTask(taskModel) {
        try {
            const user = authService.getCurrentUser();
            if (!user) {
                throw new Error('User must be authenticated to add a task');
            }

            // Validate the task model
            const validation = taskModel.validate();
            if (!validation.isValid) {
                throw new Error(`Invalid task data: ${JSON.stringify(validation.errors)}`);
            }

            // Convert to plain object for storage
            const taskData = {
                ...taskModel.toObject(),
                userId: user.uid
            };
            
            // Add to data service
            const id = await dataService.add(this.collectionName, taskData);
            
            return id;
        } catch (error) {
            console.error('Error adding task:', error);
            throw error;
        }
    }

    /**
     * Update an existing task
     * @param {string} id - Task ID
     * @param {TaskModel|Object} taskData - Updated task model or partial task data
     * @returns {Promise<void>}
     */
    async updateTask(id, taskData) {
        try {
            // Get the current task
            const currentTask = await this.getTaskById(id);
            
            // If taskData is not a TaskModel, create a merged model
            const taskModel = taskData instanceof TaskModel
                ? taskData
                : TaskModel.fromObject({
                    ...currentTask.toObject(),
                    ...taskData
                });
            
            // Validate the task model
            const validation = taskModel.validate();
            if (!validation.isValid) {
                throw new Error(`Invalid task data: ${JSON.stringify(validation.errors)}`);
            }

            // Convert to plain object for storage
            const updatedTaskData = taskModel.toObject();
            
            // Update in data service
            await dataService.update(this.collectionName, id, updatedTaskData);
        } catch (error) {
            console.error(`Error updating task ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete a task
     * @param {string} id - Task ID
     * @returns {Promise<void>}
     */
    async deleteTask(id) {
        try {
            await dataService.delete(this.collectionName, id);
        } catch (error) {
            console.error(`Error deleting task ${id}:`, error);
            throw error;
        }
    }

    /**
     * Mark a task as completed
     * @param {string} id - Task ID
     * @returns {Promise<string|null>} - ID of the next recurring task if created, null otherwise
     */
    async completeTask(id) {
        try {
            // Get the task
            const task = await this.getTaskById(id);
            
            // Mark as completed
            const nextTask = task.complete();
            
            // Update the task
            await this.updateTask(id, task);
            
            // If this is a recurring task, create the next occurrence
            if (nextTask) {
                const nextTaskId = await this.addTask(nextTask);
                return nextTaskId;
            }
            
            return null;
        } catch (error) {
            console.error(`Error completing task ${id}:`, error);
            throw error;
        }
    }

    /**
     * Mark a task as incomplete
     * @param {string} id - Task ID
     * @returns {Promise<void>}
     */
    async uncompleteTask(id) {
        try {
            // Get the task
            const task = await this.getTaskById(id);
            
            // Mark as incomplete
            task.uncomplete();
            
            // Update the task
            await this.updateTask(id, task);
        } catch (error) {
            console.error(`Error uncompleting task ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get tasks by status
     * @param {string} status - Task status ('completed' or 'pending')
     * @returns {Promise<Array<TaskModel>>} - Array of task models
     */
    async getTasksByStatus(status) {
        try {
            const tasks = await this.getAllTasks();
            
            if (status === 'completed') {
                return tasks.filter(task => task.completed);
            } else if (status === 'pending') {
                return tasks.filter(task => !task.completed);
            }
            
            return tasks;
        } catch (error) {
            console.error(`Error getting tasks by status ${status}:`, error);
            throw error;
        }
    }

    /**
     * Get tasks by category
     * @param {string} category - Task category
     * @returns {Promise<Array<TaskModel>>} - Array of task models
     */
    async getTasksByCategory(category) {
        try {
            const tasks = await this.getAllTasks();
            
            if (category === 'all') {
                return tasks;
            }
            
            return tasks.filter(task => task.category === category);
        } catch (error) {
            console.error(`Error getting tasks by category ${category}:`, error);
            throw error;
        }
    }

    /**
     * Get tasks for a specific planting
     * @param {string} plantingId - Planting ID (cell ID)
     * @returns {Promise<Array<TaskModel>>} - Array of task models
     */
    async getTasksForPlanting(plantingId) {
        try {
            const tasks = await this.getAllTasks();
            return tasks.filter(task => task.relatedPlantingId === plantingId);
        } catch (error) {
            console.error(`Error getting tasks for planting ${plantingId}:`, error);
            throw error;
        }
    }

    /**
     * Get upcoming tasks (due in the next N days)
     * @param {number} days - Number of days to look ahead
     * @returns {Promise<Array<TaskModel>>} - Array of task models
     */
    async getUpcomingTasks(days = 7) {
        try {
            const tasks = await this.getAllTasks();
            
            const now = new Date();
            const futureDate = new Date();
            futureDate.setDate(now.getDate() + days);
            
            return tasks.filter(task => 
                !task.completed && 
                task.dueDate >= now && 
                task.dueDate <= futureDate
            );
        } catch (error) {
            console.error(`Error getting upcoming tasks for next ${days} days:`, error);
            throw error;
        }
    }

    /**
     * Get overdue tasks
     * @returns {Promise<Array<TaskModel>>} - Array of task models
     */
    async getOverdueTasks() {
        try {
            const tasks = await this.getAllTasks();
            
            const now = new Date();
            
            return tasks.filter(task => 
                !task.completed && 
                task.dueDate < now
            );
        } catch (error) {
            console.error('Error getting overdue tasks:', error);
            throw error;
        }
    }
}

// Create and export a singleton instance
const taskService = new TaskService();
export default taskService;
