/**
 * Plant Service
 * Provides operations for managing plant data
 */

import PlantModel from './plant-model.js';
import dataService from '../../services/data-service.js';

class PlantService {
    constructor() {
        this.collectionName = 'plants';
    }

    /**
     * Get all plants
     * @returns {Promise<Array<PlantModel>>} - Array of plant models
     */
    async getAllPlants() {
        try {
            const plants = await dataService.getAll(this.collectionName);
            return plants.map(plant => PlantModel.fromObject(plant));
        } catch (error) {
            console.error('Error getting all plants:', error);
            throw error;
        }
    }

    /**
     * Get a plant by ID
     * @param {string} id - Plant ID
     * @returns {Promise<PlantModel>} - Plant model
     */
    async getPlantById(id) {
        try {
            const plant = await dataService.getById(this.collectionName, id);
            return PlantModel.fromObject(plant);
        } catch (error) {
            console.error(`Error getting plant ${id}:`, error);
            throw error;
        }
    }

    /**
     * Add a new plant
     * @param {PlantModel} plantModel - Plant model to add
     * @returns {Promise<string>} - ID of the new plant
     */
    async addPlant(plantModel) {
        try {
            // Validate the plant model
            const validation = plantModel.validate();
            if (!validation.isValid) {
                throw new Error(`Invalid plant data: ${JSON.stringify(validation.errors)}`);
            }

            // Convert to plain object for storage
            const plantData = plantModel.toObject();
            
            // Add to data service
            const id = await dataService.add(this.collectionName, plantData);
            
            return id;
        } catch (error) {
            console.error('Error adding plant:', error);
            throw error;
        }
    }

    /**
     * Update an existing plant
     * @param {string} id - Plant ID
     * @param {PlantModel} plantModel - Updated plant model
     * @returns {Promise<void>}
     */
    async updatePlant(id, plantModel) {
        try {
            // Validate the plant model
            const validation = plantModel.validate();
            if (!validation.isValid) {
                throw new Error(`Invalid plant data: ${JSON.stringify(validation.errors)}`);
            }

            // Convert to plain object for storage
            const plantData = plantModel.toObject();
            
            // Update in data service
            await dataService.update(this.collectionName, id, plantData);
        } catch (error) {
            console.error(`Error updating plant ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete a plant
     * @param {string} id - Plant ID
     * @returns {Promise<void>}
     */
    async deletePlant(id) {
        try {
            await dataService.delete(this.collectionName, id);
        } catch (error) {
            console.error(`Error deleting plant ${id}:`, error);
            throw error;
        }
    }

    /**
     * Search plants by name
     * @param {string} searchTerm - Search term
     * @returns {Promise<Array<PlantModel>>} - Array of matching plant models
     */
    async searchPlants(searchTerm) {
        try {
            const plants = await this.getAllPlants();
            
            if (!searchTerm) {
                return plants;
            }
            
            const lowerSearchTerm = searchTerm.toLowerCase();
            
            return plants.filter(plant => 
                plant.name.toLowerCase().includes(lowerSearchTerm) ||
                plant.scientificName.toLowerCase().includes(lowerSearchTerm)
            );
        } catch (error) {
            console.error('Error searching plants:', error);
            throw error;
        }
    }

    /**
     * Get plants by companion planting compatibility
     * @param {string} plantId - ID of the plant to find companions for
     * @returns {Promise<Object>} - Object with compatible and incompatible plants
     */
    async getCompanionPlants(plantId) {
        try {
            const plant = await this.getPlantById(plantId);
            const allPlants = await this.getAllPlants();
            
            const companions = allPlants.filter(p => 
                plant.growingInfo.companionPlants.includes(p.name)
            );
            
            const avoid = allPlants.filter(p => 
                plant.growingInfo.avoidPlanting.includes(p.name)
            );
            
            return {
                compatible: companions,
                incompatible: avoid
            };
        } catch (error) {
            console.error(`Error getting companion plants for ${plantId}:`, error);
            throw error;
        }
    }
}

// Create and export a singleton instance
const plantService = new PlantService();
export default plantService;
