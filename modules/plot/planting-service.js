/**
 * Planting Service
 * Provides operations for managing plant placements in the garden plot
 */

import { CellModel } from './plot-model.js';
import plotService from './plot-service.js';
import plantService from '../plants/plant-service.js';
import taskService from '../tasks/task-service.js';
import { TaskTemplateModel } from '../tasks/task-model.js';

class PlantingService {
    /**
     * Plant a plant in a cell
     * @param {string} cellId - Cell ID
     * @param {string} plantId - Plant ID
     * @returns {Promise<CellModel>} - Updated cell model
     */
    async plantInCell(cellId, plantId) {
        try {
            // Get the cell
            const cell = await plotService.getCellById(cellId);
            
            // Get the plant
            const plant = await plantService.getPlantById(plantId);
            
            // Update the cell with the plant
            cell.plantId = plantId;
            cell.plantedDate = new Date();
            cell.status = 'planted';
            
            // Save the updated cell
            await plotService.updateCell(cellId, cell);
            
            // Generate tasks for this planting
            await this.generateTasksForPlanting(cell, plant);
            
            return cell;
        } catch (error) {
            console.error(`Error planting ${plantId} in cell ${cellId}:`, error);
            throw error;
        }
    }

    /**
     * Clear a cell (remove plant)
     * @param {string} cellId - Cell ID
     * @returns {Promise<CellModel>} - Updated cell model
     */
    async clearCell(cellId) {
        try {
            // Get the cell
            const cell = await plotService.getCellById(cellId);
            
            // Clear the cell
            cell.plantId = null;
            cell.plantedDate = null;
            cell.status = 'empty';
            
            // Save the updated cell
            await plotService.updateCell(cellId, cell);
            
            return cell;
        } catch (error) {
            console.error(`Error clearing cell ${cellId}:`, error);
            throw error;
        }
    }

    /**
     * Mark a cell as harvested
     * @param {string} cellId - Cell ID
     * @returns {Promise<CellModel>} - Updated cell model
     */
    async harvestCell(cellId) {
        try {
            // Get the cell
            const cell = await plotService.getCellById(cellId);
            
            // Update the cell status
            cell.status = 'harvested';
            
            // Save the updated cell
            await plotService.updateCell(cellId, cell);
            
            return cell;
        } catch (error) {
            console.error(`Error harvesting cell ${cellId}:`, error);
            throw error;
        }
    }

    /**
     * Generate tasks for a planting
     * @param {CellModel} cell - Cell model
     * @param {PlantModel} plant - Plant model
     * @returns {Promise<Array<string>>} - Array of task IDs
     */
    async generateTasksForPlanting(cell, plant) {
        try {
            const taskIds = [];
            
            // Check if the plant has task templates
            if (!plant.taskTemplates || plant.taskTemplates.length === 0) {
                return taskIds;
            }
            
            // Create tasks from templates
            for (const templateData of plant.taskTemplates) {
                // Create a task template model
                const template = new TaskTemplateModel(templateData);
                
                // Generate a task from the template
                const task = template.generateTask(cell.plantedDate, cell.id);
                
                // Add plant name to task title
                task.title = `${plant.name}: ${task.title}`;
                
                // Save the task
                const taskId = await taskService.addTask(task);
                taskIds.push(taskId);
            }
            
            return taskIds;
        } catch (error) {
            console.error(`Error generating tasks for planting in cell ${cell.id}:`, error);
            throw error;
        }
    }

    /**
     * Get all planted cells
     * @param {string} plotId - Plot ID
     * @returns {Promise<Array<Object>>} - Array of cells with plant information
     */
    async getPlantedCells(plotId) {
        try {
            // Get all cells for the plot
            const cells = await plotService.getCellsByPlotId(plotId);
            
            // Filter planted cells
            const plantedCells = cells.filter(cell => 
                cell.status === 'planted' || cell.status === 'harvested'
            );
            
            // Get plant information for each cell
            const plantedCellsWithInfo = await Promise.all(
                plantedCells.map(async cell => {
                    if (cell.plantId) {
                        try {
                            const plant = await plantService.getPlantById(cell.plantId);
                            return {
                                ...cell,
                                plant
                            };
                        } catch (error) {
                            // If plant not found, just return the cell
                            console.warn(`Plant ${cell.plantId} not found for cell ${cell.id}`);
                            return cell;
                        }
                    }
                    return cell;
                })
            );
            
            return plantedCellsWithInfo;
        } catch (error) {
            console.error(`Error getting planted cells for plot ${plotId}:`, error);
            throw error;
        }
    }

    /**
     * Check companion planting compatibility
     * @param {string} plotId - Plot ID
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} plantId - Plant ID to check
     * @returns {Promise<Object>} - Compatibility information
     */
    async checkCompanionCompatibility(plotId, x, y, plantId) {
        try {
            // Get the plant
            const plant = await plantService.getPlantById(plantId);
            
            // Get all cells for the plot
            const cells = await plotService.getCellsByPlotId(plotId);
            
            // Find adjacent cells
            const adjacentCells = cells.filter(cell => 
                (Math.abs(cell.x - x) <= 1 && Math.abs(cell.y - y) <= 1) && // Adjacent (including diagonals)
                !(cell.x === x && cell.y === y) && // Not the same cell
                cell.plantId !== null // Has a plant
            );
            
            // Check compatibility with adjacent plants
            const compatibility = {
                compatible: [],
                incompatible: []
            };
            
            for (const cell of adjacentCells) {
                try {
                    const adjacentPlant = await plantService.getPlantById(cell.plantId);
                    
                    // Check if this plant is a companion
                    if (plant.growingInfo.companionPlants.includes(adjacentPlant.name)) {
                        compatibility.compatible.push({
                            cell,
                            plant: adjacentPlant
                        });
                    }
                    
                    // Check if this plant should be avoided
                    if (plant.growingInfo.avoidPlanting.includes(adjacentPlant.name)) {
                        compatibility.incompatible.push({
                            cell,
                            plant: adjacentPlant
                        });
                    }
                } catch (error) {
                    console.warn(`Error checking compatibility with plant in cell (${cell.x}, ${cell.y}):`, error);
                }
            }
            
            return compatibility;
        } catch (error) {
            console.error(`Error checking companion compatibility for plant ${plantId} at (${x}, ${y}):`, error);
            throw error;
        }
    }
}

// Create and export a singleton instance
const plantingService = new PlantingService();
export default plantingService;
