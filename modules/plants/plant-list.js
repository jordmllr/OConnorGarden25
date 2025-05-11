/**
 * Plant List Component
 * Provides UI for displaying and selecting plants
 */

import plantService from './plant-service.js';
import PlantModel from './plant-model.js';

function plantList() {
    return {
        plants: [],
        filteredPlants: [],
        selectedPlant: null,
        searchTerm: '',
        isLoading: true,
        error: null,
        
        /**
         * Initialize the plant list
         */
        async init() {
            this.isLoading = true;
            
            try {
                await this.loadPlants();
                this.isLoading = false;
            } catch (error) {
                console.error('Error initializing plant list:', error);
                this.error = 'Failed to load plants. Please try again.';
                this.isLoading = false;
            }
        },
        
        /**
         * Load plants from the service
         */
        async loadPlants() {
            try {
                this.plants = await plantService.getAllPlants();
                this.filterPlants();
            } catch (error) {
                console.error('Error loading plants:', error);
                throw error;
            }
        },
        
        /**
         * Filter plants based on search term
         */
        filterPlants() {
            if (!this.searchTerm) {
                this.filteredPlants = [...this.plants];
                return;
            }
            
            const searchTerm = this.searchTerm.toLowerCase();
            
            this.filteredPlants = this.plants.filter(plant => 
                plant.name.toLowerCase().includes(searchTerm) ||
                plant.scientificName.toLowerCase().includes(searchTerm)
            );
        },
        
        /**
         * Handle search input
         */
        handleSearch() {
            this.filterPlants();
        },
        
        /**
         * Select a plant
         * @param {string} plantId - Plant ID
         */
        selectPlant(plantId) {
            this.selectedPlant = this.plants.find(plant => plant.id === plantId) || null;
            
            // Dispatch event for other components
            if (this.selectedPlant) {
                window.dispatchEvent(new CustomEvent('plant-selected', {
                    detail: { plant: this.selectedPlant }
                }));
            }
        },
        
        /**
         * Clear plant selection
         */
        clearSelection() {
            this.selectedPlant = null;
            
            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('plant-selected', {
                detail: { plant: null }
            }));
        },
        
        /**
         * Get companion plants for the selected plant
         * @returns {Promise<Object>} - Object with compatible and incompatible plants
         */
        async getCompanionPlants() {
            if (!this.selectedPlant) return { compatible: [], incompatible: [] };
            
            try {
                return await plantService.getCompanionPlants(this.selectedPlant.id);
            } catch (error) {
                console.error('Error getting companion plants:', error);
                return { compatible: [], incompatible: [] };
            }
        },
        
        /**
         * Add a new plant
         * @param {Object} plantData - Plant data
         */
        async addPlant(plantData) {
            try {
                const plantModel = new PlantModel(plantData);
                const plantId = await plantService.addPlant(plantModel);
                
                // Reload plants
                await this.loadPlants();
                
                // Select the new plant
                this.selectPlant(plantId);
                
                return plantId;
            } catch (error) {
                console.error('Error adding plant:', error);
                throw error;
            }
        },
        
        /**
         * Update an existing plant
         * @param {string} plantId - Plant ID
         * @param {Object} plantData - Updated plant data
         */
        async updatePlant(plantId, plantData) {
            try {
                // Get the current plant
                const currentPlant = this.plants.find(plant => plant.id === plantId);
                if (!currentPlant) {
                    throw new Error(`Plant not found: ${plantId}`);
                }
                
                // Create a merged plant model
                const plantModel = new PlantModel({
                    ...currentPlant,
                    ...plantData
                });
                
                // Update the plant
                await plantService.updatePlant(plantId, plantModel);
                
                // Reload plants
                await this.loadPlants();
                
                // Update selection if this was the selected plant
                if (this.selectedPlant && this.selectedPlant.id === plantId) {
                    this.selectPlant(plantId);
                }
            } catch (error) {
                console.error(`Error updating plant ${plantId}:`, error);
                throw error;
            }
        },
        
        /**
         * Delete a plant
         * @param {string} plantId - Plant ID
         */
        async deletePlant(plantId) {
            try {
                await plantService.deletePlant(plantId);
                
                // Reload plants
                await this.loadPlants();
                
                // Clear selection if this was the selected plant
                if (this.selectedPlant && this.selectedPlant.id === plantId) {
                    this.clearSelection();
                }
            } catch (error) {
                console.error(`Error deleting plant ${plantId}:`, error);
                throw error;
            }
        }
    };
}

export default plantList;
