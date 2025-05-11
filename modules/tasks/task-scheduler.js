/**
 * Task Scheduler
 * Manages recurring tasks and scheduling
 */

import { TaskModel } from './task-model.js';
import taskService from './task-service.js';
import notificationService from '../../services/notification-service.js';

class TaskScheduler {
    constructor() {
        this.checkInterval = null;
    }

    /**
     * Initialize the task scheduler
     */
    init() {
        // Check for due tasks every hour
        this.checkInterval = setInterval(() => {
            this.checkForDueTasks();
        }, 60 * 60 * 1000); // 1 hour
        
        // Do an initial check
        this.checkForDueTasks();
    }

    /**
     * Stop the task scheduler
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * Check for tasks that are due today
     * @returns {Promise<Array<TaskModel>>} - Array of due tasks
     */
    async checkForDueTasks() {
        try {
            // Get all tasks
            const tasks = await taskService.getAllTasks();
            
            // Get today's date (without time)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Get tomorrow's date
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // Filter for tasks due today that aren't completed
            const dueTasks = tasks.filter(task => {
                if (task.completed) return false;
                
                const dueDate = new Date(task.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                
                return dueDate >= today && dueDate < tomorrow;
            });
            
            // Send notifications for due tasks
            this._sendTaskNotifications(dueTasks);
            
            return dueTasks;
        } catch (error) {
            console.error('Error checking for due tasks:', error);
            return [];
        }
    }

    /**
     * Generate recurring tasks
     * @returns {Promise<number>} - Number of tasks generated
     */
    async generateRecurringTasks() {
        try {
            // Get all tasks
            const tasks = await taskService.getAllTasks();
            
            // Filter for recurring tasks
            const recurringTasks = tasks.filter(task => 
                task.recurring && task.recurrencePattern
            );
            
            let generatedCount = 0;
            
            // For each recurring task, check if we need to generate the next occurrence
            for (const task of recurringTasks) {
                try {
                    // Check if this task is completed
                    if (task.completed) {
                        // Parse the recurrence pattern
                        const pattern = this._parseRecurrencePattern(task.recurrencePattern);
                        
                        if (pattern) {
                            // Calculate the next occurrence date
                            const nextDate = this._calculateNextOccurrence(task.completedAt, pattern);
                            
                            // Check if we already have a task for this date
                            const existingTask = tasks.find(t => 
                                t.title === task.title &&
                                !t.completed &&
                                t.dueDate.getTime() === nextDate.getTime()
                            );
                            
                            if (!existingTask) {
                                // Create a new task for the next occurrence
                                const newTask = new TaskModel({
                                    title: task.title,
                                    description: task.description,
                                    dueDate: nextDate,
                                    priority: task.priority,
                                    category: task.category,
                                    relatedPlantingId: task.relatedPlantingId,
                                    recurring: true,
                                    recurrencePattern: task.recurrencePattern
                                });
                                
                                await taskService.addTask(newTask);
                                generatedCount++;
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error generating recurring task for ${task.id}:`, error);
                }
            }
            
            return generatedCount;
        } catch (error) {
            console.error('Error generating recurring tasks:', error);
            return 0;
        }
    }

    /**
     * Parse a recurrence pattern string
     * @private
     * @param {string} pattern - Recurrence pattern string
     * @returns {Object|null} - Parsed pattern or null if invalid
     */
    _parseRecurrencePattern(pattern) {
        if (!pattern) return null;
        
        // Pattern format: "every-n-days:7" or "every-n-weeks:2" or "monthly:15" (day of month)
        try {
            if (pattern.startsWith('every-n-days:')) {
                const days = parseInt(pattern.split(':')[1]);
                return { type: 'days', value: days };
            } else if (pattern.startsWith('every-n-weeks:')) {
                const weeks = parseInt(pattern.split(':')[1]);
                return { type: 'weeks', value: weeks };
            } else if (pattern.startsWith('monthly:')) {
                const day = parseInt(pattern.split(':')[1]);
                return { type: 'monthly', value: day };
            }
        } catch (error) {
            console.error('Error parsing recurrence pattern:', error);
        }
        
        return null;
    }

    /**
     * Calculate the next occurrence date based on a pattern
     * @private
     * @param {Date} fromDate - Date to calculate from
     * @param {Object} pattern - Parsed recurrence pattern
     * @returns {Date} - Next occurrence date
     */
    _calculateNextOccurrence(fromDate, pattern) {
        const nextDate = new Date(fromDate);
        
        if (pattern.type === 'days') {
            nextDate.setDate(nextDate.getDate() + pattern.value);
        } else if (pattern.type === 'weeks') {
            nextDate.setDate(nextDate.getDate() + (pattern.value * 7));
        } else if (pattern.type === 'monthly') {
            // Move to next month
            nextDate.setMonth(nextDate.getMonth() + 1);
            // Set to specific day of month
            nextDate.setDate(Math.min(pattern.value, this._getDaysInMonth(nextDate.getFullYear(), nextDate.getMonth())));
        }
        
        return nextDate;
    }

    /**
     * Get the number of days in a month
     * @private
     * @param {number} year - Year
     * @param {number} month - Month (0-11)
     * @returns {number} - Number of days in the month
     */
    _getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    /**
     * Send notifications for due tasks
     * @private
     * @param {Array<TaskModel>} tasks - Array of due tasks
     */
    _sendTaskNotifications(tasks) {
        if (!tasks || tasks.length === 0) return;
        
        // Group tasks by category
        const tasksByCategory = {};
        
        tasks.forEach(task => {
            const category = task.category || 'general';
            if (!tasksByCategory[category]) {
                tasksByCategory[category] = [];
            }
            tasksByCategory[category].push(task);
        });
        
        // Send a notification for each category
        Object.entries(tasksByCategory).forEach(([category, categoryTasks]) => {
            const title = `${categoryTasks.length} ${category} tasks due today`;
            let body = categoryTasks.map(task => task.title).join('\n');
            
            // Truncate if too long
            if (body.length > 100) {
                body = body.substring(0, 97) + '...';
            }
            
            notificationService.sendNotification(title, body);
        });
        
        // Send a summary notification if there are multiple categories
        if (Object.keys(tasksByCategory).length > 1) {
            const totalTasks = tasks.length;
            const title = `${totalTasks} garden tasks due today`;
            const body = Object.entries(tasksByCategory)
                .map(([category, categoryTasks]) => `${categoryTasks.length} ${category} tasks`)
                .join('\n');
            
            notificationService.sendNotification(title, body);
        }
    }
}

// Create and export a singleton instance
const taskScheduler = new TaskScheduler();
export default taskScheduler;
