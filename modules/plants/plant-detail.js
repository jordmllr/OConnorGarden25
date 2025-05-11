/**
 * Plant Detail Component
 * Provides UI for displaying detailed plant information
 */

import plantService from './plant-service.js';
import { TaskTemplateModel } from '../tasks/task-model.js';

function plantDetail() {
    return {
        plant: null,
        isLoading: false,
        error: null,
        companionPlants: { compatible: [], incompatible: [] },
        isEditMode: false,
        editData: {},
        
        /**
         * Initialize the plant detail component
         */
        init() {
            // Listen for plant selection events
            window.addEventListener('plant-selected', event => {
                this.loadPlant(event.detail.plant);
            });
        },
        
        /**
         * Load a plant
         * @param {Object} plant - Plant object or ID
         */
        async loadPlant(plant) {
            if (!plant) {
                this.plant = null;
                this.companionPlants = { compatible: [], incompatible: [] };
                return;
            }
            
            this.isLoading = true;
            this.error = null;
            
            try {
                // If plant is an ID, fetch the plant
                if (typeof plant === 'string') {
                    this.plant = await plantService.getPlantById(plant);
                } else {
                    this.plant = plant;
                }
                
                // Load companion plants
                this.loadCompanionPlants();
                
                this.isLoading = false;
            } catch (error) {
                console.error('Error loading plant:', error);
                this.error = 'Failed to load plant details. Please try again.';
                this.isLoading = false;
            }
        },
        
        /**
         * Load companion plants for the current plant
         */
        async loadCompanionPlants() {
            if (!this.plant) return;
            
            try {
                this.companionPlants = await plantService.getCompanionPlants(this.plant.id);
            } catch (error) {
                console.error('Error loading companion plants:', error);
                this.companionPlants = { compatible: [], incompatible: [] };
            }
        },
        
        /**
         * Enter edit mode
         */
        enterEditMode() {
            this.isEditMode = true;
            
            // Clone the plant data for editing
            this.editData = {
                name: this.plant.name,
                scientificName: this.plant.scientificName,
                emoji: this.plant.emoji,
                growingInfo: { ...this.plant.growingInfo },
                careInstructions: this.plant.careInstructions,
                taskTemplates: this.plant.taskTemplates.map(template => ({ ...template }))
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
         * Save plant changes
         */
        async savePlant() {
            if (!this.plant) return;
            
            try {
                await plantService.updatePlant(this.plant.id, this.editData);
                
                // Reload the plant
                await this.loadPlant(this.plant.id);
                
                // Exit edit mode
                this.isEditMode = false;
                this.editData = {};
            } catch (error) {
                console.error('Error saving plant:', error);
                this.error = 'Failed to save plant changes. Please try again.';
            }
        },
        
        /**
         * Add a task template
         */
        addTaskTemplate() {
            if (!this.editData.taskTemplates) {
                this.editData.taskTemplates = [];
            }
            
            const newTemplate = new TaskTemplateModel({
                title: 'New Task',
                description: '',
                timingType: 'daysAfterPlanting',
                timing: 7,
                category: 'maintenance'
            });
            
            this.editData.taskTemplates.push(newTemplate);
        },
        
        /**
         * Remove a task template
         * @param {number} index - Template index
         */
        removeTaskTemplate(index) {
            if (!this.editData.taskTemplates) return;
            
            this.editData.taskTemplates.splice(index, 1);
        },
        
        /**
         * Add a companion plant
         * @param {string} plantName - Plant name
         */
        addCompanionPlant(plantName) {
            if (!plantName) return;
            
            if (!this.editData.growingInfo.companionPlants) {
                this.editData.growingInfo.companionPlants = [];
            }
            
            if (!this.editData.growingInfo.companionPlants.includes(plantName)) {
                this.editData.growingInfo.companionPlants.push(plantName);
            }
        },
        
        /**
         * Remove a companion plant
         * @param {string} plantName - Plant name
         */
        removeCompanionPlant(plantName) {
            if (!this.editData.growingInfo.companionPlants) return;
            
            const index = this.editData.growingInfo.companionPlants.indexOf(plantName);
            if (index !== -1) {
                this.editData.growingInfo.companionPlants.splice(index, 1);
            }
        },
        
        /**
         * Add a plant to avoid
         * @param {string} plantName - Plant name
         */
        addAvoidPlant(plantName) {
            if (!plantName) return;
            
            if (!this.editData.growingInfo.avoidPlanting) {
                this.editData.growingInfo.avoidPlanting = [];
            }
            
            if (!this.editData.growingInfo.avoidPlanting.includes(plantName)) {
                this.editData.growingInfo.avoidPlanting.push(plantName);
            }
        },
        
        /**
         * Remove a plant to avoid
         * @param {string} plantName - Plant name
         */
        removeAvoidPlant(plantName) {
            if (!this.editData.growingInfo.avoidPlanting) return;
            
            const index = this.editData.growingInfo.avoidPlanting.indexOf(plantName);
            if (index !== -1) {
                this.editData.growingInfo.avoidPlanting.splice(index, 1);
            }
        }
    };
}

export default plantDetail;
