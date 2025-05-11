/**
 * Plant Model
 * Defines the data structure and validation for plants
 */

class PlantModel {
    /**
     * Create a new plant model
     * @param {Object} data - Plant data
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.scientificName = data.scientificName || '';
        this.emoji = data.emoji || '🌱';
        this.growingInfo = {
            daysToMaturity: data.growingInfo?.daysToMaturity || 0,
            spacingInInches: data.growingInfo?.spacingInInches || 0,
            sunRequirements: data.growingInfo?.sunRequirements || '',
            waterRequirements: data.growingInfo?.waterRequirements || '',
            soilRequirements: data.growingInfo?.soilRequirements || '',
            plantingDepth: data.growingInfo?.plantingDepth || '',
            companionPlants: data.growingInfo?.companionPlants || [],
            avoidPlanting: data.growingInfo?.avoidPlanting || []
        };
        this.careInstructions = data.careInstructions || '';
        this.taskTemplates = data.taskTemplates || [];
    }

    /**
     * Validate the plant model
     * @returns {Object} - Validation result with isValid and errors
     */
    validate() {
        const errors = {};

        // Required fields
        if (!this.name) {
            errors.name = 'Name is required';
        }

        // Validate growing info
        if (this.growingInfo.daysToMaturity < 0) {
            errors['growingInfo.daysToMaturity'] = 'Days to maturity must be a positive number';
        }

        if (this.growingInfo.spacingInInches < 0) {
            errors['growingInfo.spacingInInches'] = 'Spacing must be a positive number';
        }

        // Validate task templates
        if (this.taskTemplates && Array.isArray(this.taskTemplates)) {
            this.taskTemplates.forEach((template, index) => {
                if (!template.title) {
                    errors[`taskTemplates[${index}].title`] = 'Task title is required';
                }
                
                if (!['daysAfterPlanting', 'recurring'].includes(template.timingType)) {
                    errors[`taskTemplates[${index}].timingType`] = 'Invalid timing type';
                }
            });
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
            scientificName: this.scientificName,
            emoji: this.emoji,
            growingInfo: { ...this.growingInfo },
            careInstructions: this.careInstructions,
            taskTemplates: this.taskTemplates.map(template => ({ ...template }))
        };
    }

    /**
     * Create a plant model from a plain object
     * @param {Object} data - Plant data
     * @returns {PlantModel} - New plant model instance
     */
    static fromObject(data) {
        return new PlantModel(data);
    }
}

export default PlantModel;
