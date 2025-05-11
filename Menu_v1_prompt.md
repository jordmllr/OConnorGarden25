# Adding a Menu and Base-Level Templates to the Garden Guide

## Overview
We need to implement a navigation menu and base-level templates for the O'Connor Garden Guide app. This will allow users to navigate between different sections of the app, such as the plant guide, plot layout, planting schedule, etc.

## Requirements
1. Add a persistent navigation menu to the app
2. Create base-level templates for different sections
3. Implement navigation between templates
4. Ensure the app maintains its responsive design

## Implementation Steps

### 1. Update the Alpine.js Data Model (app.js)
Modify the `plantGuide()` function to include:
- A `currentView` property to track the active template
- Methods to switch between templates
- Template-specific data and methods

```javascript
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
```

### 2. Update the HTML Structure (index.html)
Add a navigation menu and template containers:

```html
<div x-data="plantGuide()" class="container">
    <header>
        <h1>O'Connor Garden Guide</h1>
        
        <!-- Navigation Menu -->
        <nav class="main-nav">
            <button @click="navigateTo('plants')" :class="{ active: currentView === 'plants' }">
                <span class="emoji">🌱</span>
                <span class="name">Plants</span>
            </button>
            <button @click="navigateTo('plot')" :class="{ active: currentView === 'plot' }">
                <span class="emoji">🏡</span>
                <span class="name">Plot Layout</span>
            </button>
            <button @click="navigateTo('schedule')" :class="{ active: currentView === 'schedule' }">
                <span class="emoji">📅</span>
                <span class="name">Planting Schedule</span>
            </button>
        </nav>
    </header>

    <main>
        <!-- Plants View Template -->
        <div x-show="currentView === 'plants'">
            <div x-show="!selectedPlant" class="plant-selector">
                <h2>Select a Plant</h2>
                <div class="plant-grid">
                    <!-- Plant buttons here -->
                </div>
            </div>

            <div x-show="selectedPlant" class="plant-info">
                <button @click="selectedPlant = null" class="back-button">← Back to Plants</button>
                <div x-html="plantContent" class="markdown-content"></div>
            </div>
        </div>
        
        <!-- Plot Layout Template -->
        <div x-show="currentView === 'plot'" class="plot-layout">
            <h2>Garden Plot Layout</h2>
            <div class="plot-container">
                <div class="plot-grid">
                    <!-- Grid will be created here -->
                    <p>10' x 20' garden plot with 1' grid lines</p>
                </div>
            </div>
        </div>
        
        <!-- Planting Schedule Template -->
        <div x-show="currentView === 'schedule'" class="planting-schedule">
            <h2>Planting Schedule</h2>
            <p>Planting schedule will be implemented here.</p>
        </div>
    </main>
</div>
```

### 3. Update the CSS (styles.css)
Add styles for the navigation menu and templates:

```css
/* Navigation Menu */
.main-nav {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.main-nav button {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.75rem 1rem;
    background-color: #e8f5e9;
    border: 1px solid #a5d6a7;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}

.main-nav button:hover, .main-nav button:focus {
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.main-nav button.active {
    background-color: #4CAF50;
    color: white;
}

.main-nav .emoji {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
}

/* Plot Layout Styles */
.plot-layout {
    background-color: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.plot-container {
    overflow-x: auto;
    margin-top: 1rem;
}

.plot-grid {
    width: 100%;
    min-height: 400px;
    border: 2px solid #333;
    position: relative;
    background-color: #f9f9f9;
    background-image: 
        linear-gradient(rgba(0, 0, 0, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
        linear-gradient(rgba(0, 0, 0, 0.3) 10px, transparent 10px),
        linear-gradient(90deg, rgba(0, 0, 0, 0.3) 10px, transparent 10px);
    background-size: 10px 10px, 10px 10px, 100px 100px, 100px 100px;
}

/* Planting Schedule Styles */
.planting-schedule {
    background-color: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

### 4. Update the Service Worker (sw.js)
Add new template files to the cache list:

```javascript
const CACHE_NAME = 'garden-guide-v3';
const urlsToCache = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'manifest.json',
  // Plant data files
  'data/Tomatoes.md',
  'data/Cucumbers.md',
  'data/Pumpkins.md',
  'data/Onions.md',
  'data/Romaine.md',
  'data/SweetPotatoes.md',
  // External libraries
  'https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  // Icons
  'icons/favicon.svg',
  'icons/icon-192.svg',
  'icons/icon-512.svg',
  'icons/icon-32.png',
  'icons/icon-64.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];
```

## Testing
After implementing these changes:
1. Verify that the navigation menu appears and is styled correctly
2. Test navigation between different templates
3. Ensure the plant guide functionality still works as expected
4. Check that the responsive design works on different screen sizes
5. Test the PWA functionality to ensure it still works offline

## Next Steps
After implementing the base templates, we can:
1. Develop the plot layout functionality with the grid overlay
2. Implement the planting schedule with a Gantt chart
3. Add more plant varieties to the guide
