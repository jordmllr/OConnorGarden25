/**
 * Plot Service
 * Provides operations for managing garden plots and cells
 */

import { PlotModel, CellModel } from './plot-model.js';
import dataService from '../../services/data-service.js';
import authService from '../../services/auth-service.js';

class PlotService {
    constructor() {
        this.plotCollectionName = 'plots';
        this.cellCollectionName = 'cells';
    }

    /**
     * Get all plots for the current user
     * @returns {Promise<Array<PlotModel>>} - Array of plot models
     */
    async getUserPlots() {
        try {
            const user = authService.getCurrentUser();
            if (!user) {
                throw new Error('User must be authenticated to access plots');
            }

            const plots = await dataService.getAll(this.plotCollectionName);
            
            // Filter plots by user ID
            const userPlots = plots.filter(plot => plot.userId === user.uid);
            
            return userPlots.map(plot => PlotModel.fromObject(plot));
        } catch (error) {
            console.error('Error getting user plots:', error);
            throw error;
        }
    }

    /**
     * Get a plot by ID
     * @param {string} id - Plot ID
     * @returns {Promise<PlotModel>} - Plot model
     */
    async getPlotById(id) {
        try {
            const plot = await dataService.getById(this.plotCollectionName, id);
            return PlotModel.fromObject(plot);
        } catch (error) {
            console.error(`Error getting plot ${id}:`, error);
            throw error;
        }
    }

    /**
     * Create a new plot
     * @param {PlotModel} plotModel - Plot model to create
     * @returns {Promise<string>} - ID of the new plot
     */
    async createPlot(plotModel) {
        try {
            const user = authService.getCurrentUser();
            if (!user) {
                throw new Error('User must be authenticated to create a plot');
            }

            // Validate the plot model
            const validation = plotModel.validate();
            if (!validation.isValid) {
                throw new Error(`Invalid plot data: ${JSON.stringify(validation.errors)}`);
            }

            // Convert to plain object for storage
            const plotData = {
                ...plotModel.toObject(),
                userId: user.uid
            };
            
            // Add to data service
            const id = await dataService.add(this.plotCollectionName, plotData);
            
            return id;
        } catch (error) {
            console.error('Error creating plot:', error);
            throw error;
        }
    }

    /**
     * Update an existing plot
     * @param {string} id - Plot ID
     * @param {PlotModel} plotModel - Updated plot model
     * @returns {Promise<void>}
     */
    async updatePlot(id, plotModel) {
        try {
            // Validate the plot model
            const validation = plotModel.validate();
            if (!validation.isValid) {
                throw new Error(`Invalid plot data: ${JSON.stringify(validation.errors)}`);
            }

            // Convert to plain object for storage
            const plotData = plotModel.toObject();
            
            // Update in data service
            await dataService.update(this.plotCollectionName, id, plotData);
        } catch (error) {
            console.error(`Error updating plot ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete a plot and all its cells
     * @param {string} id - Plot ID
     * @returns {Promise<void>}
     */
    async deletePlot(id) {
        try {
            // First, get all cells for this plot
            const cells = await this.getCellsByPlotId(id);
            
            // Delete all cells
            for (const cell of cells) {
                await dataService.delete(this.cellCollectionName, cell.id);
            }
            
            // Delete the plot
            await dataService.delete(this.plotCollectionName, id);
        } catch (error) {
            console.error(`Error deleting plot ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get all cells for a plot
     * @param {string} plotId - Plot ID
     * @returns {Promise<Array<CellModel>>} - Array of cell models
     */
    async getCellsByPlotId(plotId) {
        try {
            const cells = await dataService.getAll(this.cellCollectionName);
            
            // Filter cells by plot ID
            const plotCells = cells.filter(cell => cell.plotId === plotId);
            
            return plotCells.map(cell => CellModel.fromObject(cell));
        } catch (error) {
            console.error(`Error getting cells for plot ${plotId}:`, error);
            throw error;
        }
    }

    /**
     * Get a cell by ID
     * @param {string} id - Cell ID
     * @returns {Promise<CellModel>} - Cell model
     */
    async getCellById(id) {
        try {
            const cell = await dataService.getById(this.cellCollectionName, id);
            return CellModel.fromObject(cell);
        } catch (error) {
            console.error(`Error getting cell ${id}:`, error);
            throw error;
        }
    }

    /**
     * Create a new cell
     * @param {CellModel} cellModel - Cell model to create
     * @returns {Promise<string>} - ID of the new cell
     */
    async createCell(cellModel) {
        try {
            // Validate the cell model
            const validation = cellModel.validate();
            if (!validation.isValid) {
                throw new Error(`Invalid cell data: ${JSON.stringify(validation.errors)}`);
            }

            // Convert to plain object for storage
            const cellData = cellModel.toObject();
            
            // Add to data service
            const id = await dataService.add(this.cellCollectionName, cellData);
            
            return id;
        } catch (error) {
            console.error('Error creating cell:', error);
            throw error;
        }
    }

    /**
     * Update an existing cell
     * @param {string} id - Cell ID
     * @param {CellModel} cellModel - Updated cell model
     * @returns {Promise<void>}
     */
    async updateCell(id, cellModel) {
        try {
            // Validate the cell model
            const validation = cellModel.validate();
            if (!validation.isValid) {
                throw new Error(`Invalid cell data: ${JSON.stringify(validation.errors)}`);
            }

            // Convert to plain object for storage
            const cellData = cellModel.toObject();
            
            // Update in data service
            await dataService.update(this.cellCollectionName, id, cellData);
        } catch (error) {
            console.error(`Error updating cell ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete a cell
     * @param {string} id - Cell ID
     * @returns {Promise<void>}
     */
    async deleteCell(id) {
        try {
            await dataService.delete(this.cellCollectionName, id);
        } catch (error) {
            console.error(`Error deleting cell ${id}:`, error);
            throw error;
        }
    }

    /**
     * Initialize empty cells for a plot
     * @param {string} plotId - Plot ID
     * @param {number} width - Plot width
     * @param {number} height - Plot height
     * @returns {Promise<Array<string>>} - Array of cell IDs
     */
    async initializeEmptyCells(plotId, width, height) {
        try {
            const cellIds = [];
            
            // Create cells for the plot
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const cellModel = new CellModel({
                        x,
                        y,
                        plotId,
                        status: 'empty'
                    });
                    
                    const cellId = await this.createCell(cellModel);
                    cellIds.push(cellId);
                }
            }
            
            return cellIds;
        } catch (error) {
            console.error(`Error initializing cells for plot ${plotId}:`, error);
            throw error;
        }
    }
}

// Create and export a singleton instance
const plotService = new PlotService();
export default plotService;
