/**
 * Plot Manager Component
 * Provides UI for managing garden plots
 */

import { PlotModel } from './plot-model.js';
import plotService from './plot-service.js';
import plantingService from './planting-service.js';

function plotManager() {
    return {
        plots: [],
        selectedPlot: null,
        cells: [],
        isLoading: true,
        error: null,
        isEditMode: false,
        editData: {},
        selectedCell: null,
        selectedPlant: null,
        
        /**
         * Initialize the plot manager
         */
        async init() {
            this.isLoading = true;
            
            try {
                await this.loadPlots();
                
                // Listen for plant selection events
                window.addEventListener('plant-selected', event => {
                    this.selectedPlant = event.detail.plant;
                });
                
                this.isLoading = false;
            } catch (error) {
                console.error('Error initializing plot manager:', error);
                this.error = 'Failed to load plots. Please try again.';
                this.isLoading = false;
            }
        },
        
        /**
         * Load plots from the service
         */
        async loadPlots() {
            try {
                this.plots = await plotService.getUserPlots();
                
                // If we have plots and none is selected, select the first one
                if (this.plots.length > 0 && !this.selectedPlot) {
                    await this.selectPlot(this.plots[0].id);
                }
            } catch (error) {
                console.error('Error loading plots:', error);
                throw error;
            }
        },
        
        /**
         * Select a plot
         * @param {string} plotId - Plot ID
         */
        async selectPlot(plotId) {
            this.isLoading = true;
            
            try {
                this.selectedPlot = await plotService.getPlotById(plotId);
                await this.loadCells();
                this.isLoading = false;
            } catch (error) {
                console.error(`Error selecting plot ${plotId}:`, error);
                this.error = 'Failed to load plot details. Please try again.';
                this.isLoading = false;
            }
        },
        
        /**
         * Load cells for the selected plot
         */
        async loadCells() {
            if (!this.selectedPlot) return;
            
            try {
                this.cells = await plotService.getCellsByPlotId(this.selectedPlot.id);
                
                // Sort cells by position
                this.cells.sort((a, b) => {
                    if (a.y !== b.y) return a.y - b.y;
                    return a.x - b.x;
                });
            } catch (error) {
                console.error(`Error loading cells for plot ${this.selectedPlot.id}:`, error);
                throw error;
            }
        },
        
        /**
         * Create a new plot
         * @param {Object} plotData - Plot data
         */
        async createPlot(plotData) {
            try {
                const plotModel = new PlotModel(plotData);
                const plotId = await plotService.createPlot(plotModel);
                
                // Initialize cells for the new plot
                await plotService.initializeEmptyCells(plotId, plotModel.width, plotModel.height);
                
                // Reload plots
                await this.loadPlots();
                
                // Select the new plot
                await this.selectPlot(plotId);
                
                return plotId;
            } catch (error) {
                console.error('Error creating plot:', error);
                throw error;
            }
        },
        
        /**
         * Update an existing plot
         * @param {string} plotId - Plot ID
         * @param {Object} plotData - Updated plot data
         */
        async updatePlot(plotId, plotData) {
            try {
                // Get the current plot
                const currentPlot = await plotService.getPlotById(plotId);
                
                // Create a merged plot model
                const plotModel = new PlotModel({
                    ...currentPlot,
                    ...plotData
                });
                
                // Update the plot
                await plotService.updatePlot(plotId, plotModel);
                
                // Reload plots
                await this.loadPlots();
                
                // Update selection if this was the selected plot
                if (this.selectedPlot && this.selectedPlot.id === plotId) {
                    await this.selectPlot(plotId);
                }
            } catch (error) {
                console.error(`Error updating plot ${plotId}:`, error);
                throw error;
            }
        },
        
        /**
         * Delete a plot
         * @param {string} plotId - Plot ID
         */
        async deletePlot(plotId) {
            try {
                await plotService.deletePlot(plotId);
                
                // Reload plots
                await this.loadPlots();
                
                // Clear selection if this was the selected plot
                if (this.selectedPlot && this.selectedPlot.id === plotId) {
                    this.selectedPlot = null;
                    this.cells = [];
                    
                    // Select another plot if available
                    if (this.plots.length > 0) {
                        await this.selectPlot(this.plots[0].id);
                    }
                }
            } catch (error) {
                console.error(`Error deleting plot ${plotId}:`, error);
                throw error;
            }
        },
        
        /**
         * Select a cell
         * @param {string} cellId - Cell ID
         */
        async selectCell(cellId) {
            try {
                this.selectedCell = this.cells.find(cell => cell.id === cellId) || null;
                
                // Dispatch event for other components
                if (this.selectedCell) {
                    window.dispatchEvent(new CustomEvent('cell-selected', {
                        detail: { cell: this.selectedCell }
                    }));
                }
            } catch (error) {
                console.error(`Error selecting cell ${cellId}:`, error);
                this.selectedCell = null;
            }
        },
        
        /**
         * Plant in a cell
         * @param {string} cellId - Cell ID
         * @param {string} plantId - Plant ID
         */
        async plantInCell(cellId, plantId) {
            try {
                await plantingService.plantInCell(cellId, plantId);
                
                // Reload cells
                await this.loadCells();
                
                // Update selected cell if this was the selected cell
                if (this.selectedCell && this.selectedCell.id === cellId) {
                    await this.selectCell(cellId);
                }
            } catch (error) {
                console.error(`Error planting ${plantId} in cell ${cellId}:`, error);
                throw error;
            }
        },
        
        /**
         * Clear a cell
         * @param {string} cellId - Cell ID
         */
        async clearCell(cellId) {
            try {
                await plantingService.clearCell(cellId);
                
                // Reload cells
                await this.loadCells();
                
                // Update selected cell if this was the selected cell
                if (this.selectedCell && this.selectedCell.id === cellId) {
                    await this.selectCell(cellId);
                }
            } catch (error) {
                console.error(`Error clearing cell ${cellId}:`, error);
                throw error;
            }
        },
        
        /**
         * Harvest a cell
         * @param {string} cellId - Cell ID
         */
        async harvestCell(cellId) {
            try {
                await plantingService.harvestCell(cellId);
                
                // Reload cells
                await this.loadCells();
                
                // Update selected cell if this was the selected cell
                if (this.selectedCell && this.selectedCell.id === cellId) {
                    await this.selectCell(cellId);
                }
            } catch (error) {
                console.error(`Error harvesting cell ${cellId}:`, error);
                throw error;
            }
        },
        
        /**
         * Check companion planting compatibility
         * @param {number} x - X coordinate
         * @param {number} y - Y coordinate
         * @param {string} plantId - Plant ID to check
         */
        async checkCompanionCompatibility(x, y, plantId) {
            if (!this.selectedPlot) return { compatible: [], incompatible: [] };
            
            try {
                return await plantingService.checkCompanionCompatibility(
                    this.selectedPlot.id,
                    x,
                    y,
                    plantId
                );
            } catch (error) {
                console.error(`Error checking companion compatibility at (${x}, ${y}):`, error);
                return { compatible: [], incompatible: [] };
            }
        }
    };
}

export default plotManager;
