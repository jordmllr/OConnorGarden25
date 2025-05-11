function plantGuide() {
    return {
        selectedPlant: null,
        plantContent: '',
        
        selectPlant(plant) {
            this.selectedPlant = plant;
            this.loadPlantInfo(plant);
        },
        
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
        }
    };
}