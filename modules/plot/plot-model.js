/**
 * Plot Model
 * Defines the data structure and validation for garden plots
 */

class PlotModel {
    /**
     * Create a new plot model
     * @param {Object} data - Plot data
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || 'My Garden Plot';
        this.width = data.width || 10;
        this.height = data.height || 10;
        this.createdAt = data.createdAt || new Date();
        this.lastModified = data.lastModified || new Date();
    }

    /**
     * Validate the plot model
     * @returns {Object} - Validation result with isValid and errors
     */
    validate() {
        const errors = {};

        // Required fields
        if (!this.name) {
            errors.name = 'Name is required';
        }

        // Validate dimensions
        if (this.width <= 0) {
            errors.width = 'Width must be a positive number';
        }

        if (this.height <= 0) {
            errors.height = 'Height must be a positive number';
        }

        if (this.width > 100) {
            errors.width = 'Width cannot exceed 100';
        }

        if (this.height > 100) {
            errors.height = 'Height cannot exceed 100';
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
            name: this.name,
            width: this.width,
            height: this.height,
            createdAt: this.createdAt,
            lastModified: new Date()
        };
    }

    /**
     * Create a plot model from a plain object
     * @param {Object} data - Plot data
     * @returns {PlotModel} - New plot model instance
     */
    static fromObject(data) {
        return new PlotModel(data);
    }
}

/**
 * Cell Model
 * Defines the data structure for individual cells in a plot
 */
class CellModel {
    /**
     * Create a new cell model
     * @param {Object} data - Cell data
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.x = data.x || 0;
        this.y = data.y || 0;
        this.plotId = data.plotId || null;
        this.plantId = data.plantId || null;
        this.plantedDate = data.plantedDate || null;
        this.status = data.status || 'empty'; // 'empty', 'planted', 'harvested'
    }

    /**
     * Validate the cell model
     * @returns {Object} - Validation result with isValid and errors
     */
    validate() {
        const errors = {};

        // Required fields
        if (this.x === undefined || this.x === null) {
            errors.x = 'X coordinate is required';
        }

        if (this.y === undefined || this.y === null) {
            errors.y = 'Y coordinate is required';
        }

        if (!this.plotId) {
            errors.plotId = 'Plot ID is required';
        }

        // Validate status
        if (!['empty', 'planted', 'harvested'].includes(this.status)) {
            errors.status = 'Invalid status';
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
            x: this.x,
            y: this.y,
            plotId: this.plotId,
            plantId: this.plantId,
            plantedDate: this.plantedDate,
            status: this.status
        };
    }

    /**
     * Create a cell model from a plain object
     * @param {Object} data - Cell data
     * @returns {CellModel} - New cell model instance
     */
    static fromObject(data) {
        return new CellModel(data);
    }
}

export { PlotModel, CellModel };
