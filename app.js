function plantGuide() {
    return {
        // Navigation state
        currentView: 'plants', // Default view

        // Plant guide data
        selectedPlant: null,
        plantContent: '',

        // Switch to a specific view
        navigateTo(view) {
            this.currentView = view;
            this.selectedPlant = null; // Reset plant selection when changing views
        },

        // Plant selection method
        selectPlant(plant) {
            this.selectedPlant = plant;
            this.loadPlantInfo(plant);
        },

        // Load plant information
        loadPlantInfo(plant) {
            // Show loading state
            this.plantContent = '<div class="loading">Loading plant information...</div>';

            // Fetch the markdown file
            fetch(`data/${plant}.md`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Plant information not found');
                    }
                    return response.text();
                })
                .then(markdown => {
                    // Parse markdown to HTML
                    this.plantContent = marked.parse(markdown);
                })
                .catch(error => {
                    this.plantContent = `<div class="error">
                        <p>Sorry, we couldn't load information for ${plant}.</p>
                        <p>${error.message}</p>
                    </div>`;
                });
        },

        // Plot layout data and methods
        plotData: {
            width: 10,
            height: 20,
            // Add more plot-specific data as needed
        }
    };
}