/**
 * Task Model
 * Defines the data structure and validation for garden tasks
 */

class TaskModel {
    /**
     * Create a new task model
     * @param {Object} data - Task data
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.title = data.title || '';
        this.description = data.description || '';
        this.dueDate = data.dueDate ? new Date(data.dueDate) : null;
        this.completed = data.completed || false;
        this.completedAt = data.completedAt ? new Date(data.completedAt) : null;
        this.priority = data.priority || 'medium'; // 'low', 'medium', 'high'
        this.category = data.category || 'general'; // 'planting', 'watering', 'harvesting', 'maintenance', 'general'
        this.relatedPlantingId = data.relatedPlantingId || null;
        this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
        this.recurring = data.recurring || false;
        this.recurrencePattern = data.recurrencePattern || null;
        this.syncStatus = data.syncStatus || 'synced'; // 'synced', 'pending', 'conflict'
    }

    /**
     * Validate the task model
     * @returns {Object} - Validation result with isValid and errors
     */
    validate() {
        const errors = {};

        // Required fields
        if (!this.title) {
            errors.title = 'Title is required';
        }

        // Validate priority
        if (!['low', 'medium', 'high'].includes(this.priority)) {
            errors.priority = 'Invalid priority';
        }

        // Validate category
        const validCategories = ['planting', 'watering', 'harvesting', 'maintenance', 'general'];
        if (!validCategories.includes(this.category)) {
            errors.category = 'Invalid category';
        }

        // Validate recurrence pattern if recurring
        if (this.recurring && !this.recurrencePattern) {
            errors.recurrencePattern = 'Recurrence pattern is required for recurring tasks';
        }

        // Validate sync status
        if (!['synced', 'pending', 'conflict'].includes(this.syncStatus)) {
            errors.syncStatus = 'Invalid sync status';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Convert the model to a plain object for storage
     * @returns {Object} - Plain object representation
     */
    toObject() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            dueDate: this.dueDate,
            completed: this.completed,
            completedAt: this.completedAt,
            priority: this.priority,
            category: this.category,
            relatedPlantingId: this.relatedPlantingId,
            createdAt: this.createdAt,
            recurring: this.recurring,
            recurrencePattern: this.recurrencePattern,
            syncStatus: this.syncStatus
        };
    }

    /**
     * Create a task model from a plain object
     * @param {Object} data - Task data
     * @returns {TaskModel} - New task model instance
     */
    static fromObject(data) {
        return new TaskModel(data);
    }

    /**
     * Mark the task as completed
     */
    complete() {
        this.completed = true;
        this.completedAt = new Date();
        
        // If this is a recurring task, generate the next occurrence
        if (this.recurring) {
            return this.generateNextOccurrence();
        }
        
        return null;
    }

    /**
     * Mark the task as incomplete
     */
    uncomplete() {
        this.completed = false;
        this.completedAt = null;
    }

    /**
     * Generate the next occurrence of a recurring task
     * @returns {TaskModel} - The next task occurrence
     */
    generateNextOccurrence() {
        if (!this.recurring || !this.recurrencePattern) {
            return null;
        }
        
        // Create a new task based on this one
        const nextTask = new TaskModel({
            ...this.toObject(),
            id: null, // New task will get a new ID
            completed: false,
            completedAt: null,
            createdAt: new Date(),
            syncStatus: 'pending'
        });
        
        // Calculate the next due date based on recurrence pattern
        if (this.dueDate) {
            const nextDueDate = this._calculateNextDueDate();
            if (nextDueDate) {
                nextTask.dueDate = nextDueDate;
            }
        }
        
        return nextTask;
    }

    /**
     * Calculate the next due date based on recurrence pattern
     * @private
     * @returns {Date} - The next due date
     */
    _calculateNextDueDate() {
        if (!this.dueDate || !this.recurrencePattern) {
            return null;
        }
        
        const currentDueDate = new Date(this.dueDate);
        const pattern = this.recurrencePattern;
        
        // Parse the recurrence pattern (e.g., "daily", "weekly", "monthly", "yearly", or "every-n-days:7")
        if (pattern === 'daily') {
            return new Date(currentDueDate.setDate(currentDueDate.getDate() + 1));
        } else if (pattern === 'weekly') {
            return new Date(currentDueDate.setDate(currentDueDate.getDate() + 7));
        } else if (pattern === 'monthly') {
            return new Date(currentDueDate.setMonth(currentDueDate.getMonth() + 1));
        } else if (pattern === 'yearly') {
            return new Date(currentDueDate.setFullYear(currentDueDate.getFullYear() + 1));
        } else if (pattern.startsWith('every-n-days:')) {
            const days = parseInt(pattern.split(':')[1], 10);
            if (!isNaN(days) && days > 0) {
                return new Date(currentDueDate.setDate(currentDueDate.getDate() + days));
            }
        }
        
        return null;
    }
}

/**
 * Task Template Model
 * Defines the data structure for task templates
 */
class TaskTemplateModel {
    /**
     * Create a new task template model
     * @param {Object} data - Task template data
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.title = data.title || '';
        this.description = data.description || '';
        this.timingType = data.timingType || 'daysAfterPlanting'; // 'daysAfterPlanting', 'recurring'
        this.timing = data.timing || 0; // Number of days after planting, or recurrence interval
        this.category = data.category || 'general';
        this.priority = data.priority || 'medium';
    }

    /**
     * Validate the task template model
     * @returns {Object} - Validation result with isValid and errors
     */
    validate() {
        const errors = {};

        // Required fields
        if (!this.title) {
            errors.title = 'Title is required';
        }

        // Validate timing type
        if (!['daysAfterPlanting', 'recurring'].includes(this.timingType)) {
            errors.timingType = 'Invalid timing type';
        }

        // Validate timing value
        if (this.timing < 0) {
            errors.timing = 'Timing must be a positive number';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Convert the model to a plain object for storage
     * @returns {Object} - Plain object representation
     */
    toObject() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            timingType: this.timingType,
            timing: this.timing,
            category: this.category,
            priority: this.priority
        };
    }

    /**
     * Create a task template model from a plain object
     * @param {Object} data - Task template data
     * @returns {TaskTemplateModel} - New task template model instance
     */
    static fromObject(data) {
        return new TaskTemplateModel(data);
    }

    /**
     * Generate a task from this template
     * @param {Date} plantingDate - The date the plant was planted
     * @param {string} relatedPlantingId - ID of the related planting
     * @returns {TaskModel} - The generated task
     */
    generateTask(plantingDate, relatedPlantingId) {
        if (!plantingDate) {
            plantingDate = new Date();
        }
        
        const dueDate = new Date(plantingDate);
        
        if (this.timingType === 'daysAfterPlanting') {
            dueDate.setDate(dueDate.getDate() + this.timing);
        }
        
        return new TaskModel({
            title: this.title,
            description: this.description,
            dueDate: dueDate,
            priority: this.priority,
            category: this.category,
            relatedPlantingId: relatedPlantingId,
            recurring: this.timingType === 'recurring',
            recurrencePattern: this.timingType === 'recurring' ? `every-n-days:${this.timing}` : null
        });
    }
}

export { TaskModel, TaskTemplateModel };
