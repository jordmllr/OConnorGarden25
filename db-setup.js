// This script sets up the initial database structure and populates reference data
// Run this script once to initialize your Firestore database

// Plant reference data
const plantsData = [
  {
    id: 'tomatoes',
    name: 'Tomatoes',
    scientificName: 'Solanum lycopersicum',
    emoji: '🍅',
    growingInfo: {
      daysToMaturity: 70,
      spacingInInches: 24,
      sunRequirements: 'Full sun',
      waterRequirements: 'Regular watering, 1-2 inches per week',
      soilRequirements: 'Well-draining, rich in organic matter, pH 6.0-6.8',
      plantingDepth: '1/4 inch',
      companionPlants: ['Basil', 'Marigolds', 'Onions', 'Garlic'],
      avoidPlanting: ['Potatoes', 'Corn', 'Fennel']
    },
    tasks: [
      {
        title: 'Stake or cage plants',
        description: 'Install stakes or cages to support growing plants',
        timingType: 'daysAfterPlanting',
        timing: 14,
        category: 'maintenance'
      },
      {
        title: 'Prune suckers',
        description: 'Remove suckers (shoots that grow in the crotch between branches)',
        timingType: 'daysAfterPlanting',
        timing: 30,
        category: 'maintenance'
      },
      {
        title: 'Fertilize',
        description: 'Apply balanced fertilizer',
        timingType: 'daysAfterPlanting',
        timing: 30,
        category: 'fertilizing'
      },
      {
        title: 'Check for pests',
        description: 'Inspect for hornworms, aphids, and other common pests',
        timingType: 'recurring',
        timing: 7, // every 7 days
        category: 'pest control'
      },
      {
        title: 'Harvest',
        description: 'Harvest ripe tomatoes when they are firm and fully colored',
        timingType: 'daysAfterPlanting',
        timing: 70,
        category: 'harvesting'
      }
    ]
  },
  {
    id: 'cucumbers',
    name: 'Cucumbers',
    scientificName: 'Cucumis sativus',
    emoji: '🥒',
    growingInfo: {
      daysToMaturity: 55,
      spacingInInches: 36,
      sunRequirements: 'Full sun',
      waterRequirements: 'Regular watering, 1-2 inches per week',
      soilRequirements: 'Well-draining, rich in organic matter, pH 6.0-7.0',
      plantingDepth: '1 inch',
      companionPlants: ['Corn', 'Beans', 'Peas', 'Sunflowers'],
      avoidPlanting: ['Potatoes', 'Aromatic herbs']
    },
    tasks: [
      {
        title: 'Install trellis',
        description: 'Set up trellis for vines to climb',
        timingType: 'daysAfterPlanting',
        timing: 14,
        category: 'maintenance'
      },
      {
        title: 'Train vines',
        description: 'Guide vines onto trellis',
        timingType: 'daysAfterPlanting',
        timing: 21,
        category: 'maintenance'
      },
      {
        title: 'Fertilize',
        description: 'Apply balanced fertilizer',
        timingType: 'daysAfterPlanting',
        timing: 30,
        category: 'fertilizing'
      },
      {
        title: 'Check for pests',
        description: 'Inspect for cucumber beetles and powdery mildew',
        timingType: 'recurring',
        timing: 7, // every 7 days
        category: 'pest control'
      },
      {
        title: 'Harvest',
        description: 'Harvest cucumbers when they reach 6-8 inches long',
        timingType: 'daysAfterPlanting',
        timing: 55,
        category: 'harvesting'
      }
    ]
  },
  {
    id: 'pumpkins',
    name: 'Pumpkins',
    scientificName: 'Cucurbita pepo',
    emoji: '🎃',
    growingInfo: {
      daysToMaturity: 100,
      spacingInInches: 72,
      sunRequirements: 'Full sun',
      waterRequirements: 'Regular watering, 1-2 inches per week',
      soilRequirements: 'Well-draining, rich in organic matter, pH 6.0-6.8',
      plantingDepth: '1 inch',
      companionPlants: ['Corn', 'Beans', 'Radishes', 'Marigolds'],
      avoidPlanting: ['Potatoes']
    },
    tasks: [
      {
        title: 'Thin seedlings',
        description: 'Thin to 2-3 plants per hill',
        timingType: 'daysAfterPlanting',
        timing: 14,
        category: 'maintenance'
      },
      {
        title: 'Fertilize',
        description: 'Apply balanced fertilizer',
        timingType: 'daysAfterPlanting',
        timing: 30,
        category: 'fertilizing'
      },
      {
        title: 'Check for pests',
        description: 'Inspect for squash bugs and powdery mildew',
        timingType: 'recurring',
        timing: 7, // every 7 days
        category: 'pest control'
      },
      {
        title: 'Turn pumpkins',
        description: 'Gently turn pumpkins to prevent flat sides and promote even coloring',
        timingType: 'daysAfterPlanting',
        timing: 70,
        category: 'maintenance'
      },
      {
        title: 'Harvest',
        description: 'Harvest pumpkins when fully colored and skin is hard',
        timingType: 'daysAfterPlanting',
        timing: 100,
        category: 'harvesting'
      }
    ]
  },
  {
    id: 'onions',
    name: 'Onions',
    scientificName: 'Allium cepa',
    emoji: '🧅',
    growingInfo: {
      daysToMaturity: 90,
      spacingInInches: 4,
      sunRequirements: 'Full sun',
      waterRequirements: 'Regular watering, 1 inch per week',
      soilRequirements: 'Well-draining, rich in organic matter, pH 6.0-7.0',
      plantingDepth: '1 inch',
      companionPlants: ['Tomatoes', 'Carrots', 'Beets', 'Lettuce'],
      avoidPlanting: ['Beans', 'Peas']
    },
    tasks: [
      {
        title: 'Thin seedlings',
        description: 'Thin to 4 inches apart',
        timingType: 'daysAfterPlanting',
        timing: 21,
        category: 'maintenance'
      },
      {
        title: 'Fertilize',
        description: 'Apply nitrogen-rich fertilizer',
        timingType: 'daysAfterPlanting',
        timing: 30,
        category: 'fertilizing'
      },
      {
        title: 'Stop watering',
        description: 'Reduce watering when tops begin to fall over',
        timingType: 'daysAfterPlanting',
        timing: 80,
        category: 'watering'
      },
      {
        title: 'Harvest',
        description: 'Harvest when tops fall over and begin to dry',
        timingType: 'daysAfterPlanting',
        timing: 90,
        category: 'harvesting'
      }
    ]
  }
];

// Function to set up the database
async function setupDatabase() {
  try {
    // Add plants to the plants collection
    for (const plant of plantsData) {
      await firebase.firestore().collection('plants').doc(plant.id).set(plant);
      console.log(`Added plant: ${plant.name}`);
    }
    
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

// Call the setup function when the script is loaded
// Uncomment this line to run the setup
// setupDatabase();
