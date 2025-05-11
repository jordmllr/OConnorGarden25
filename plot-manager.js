// Plot Grid Manager
function plotManager() {
  return {
    // Plot data
    plotId: null,
    plotName: 'My Garden Plot',
    plotWidth: 10, // in feet
    plotHeight: 20, // in feet
    cellSize: 12, // in inches (1 foot = 12 inches)
    selectedPlant: null,
    selectedCell: null,
    cells: [],
    plants: [],
    isLoading: true,

    // Initialize the plot manager
    async init() {
      this.isLoading = true;

      // Load plants from Firestore
      await this.loadPlants();

      // Check if user has a plot already
      await this.loadUserPlot();

      this.isLoading = false;

      // Set up the grid interaction
      this.setupGridInteraction();
    },

    // Load plants from Firestore
    async loadPlants() {
      try {
        console.log('Loading plants from Firestore...');
        const snapshot = await firebase.firestore().collection('plants').get();
        console.log('Plants query completed. Found', snapshot.docs.length, 'plants');

        this.plants = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log('Plants loaded successfully:', this.plants);

        // If no plants were found, try to initialize the collection
        if (this.plants.length === 0 && typeof initializePlantsCollection === 'function') {
          console.log('No plants found. Attempting to initialize plants collection...');
          await initializePlantsCollection();
          // Try loading again
          return this.loadPlants();
        }
      } catch (error) {
        console.error('Error loading plants:', error);

        if (error.code === 'permission-denied') {
          console.error('This is a permissions issue. You need to deploy your Firestore security rules.');
          alert('Cannot load plants: Permission denied. Please deploy your Firestore security rules. See the deploy-rules.md file for instructions.');
        }
      }
    },

    // Load user's plot from Firestore
    async loadUserPlot() {
      const user = Alpine.store('auth').user || firebase.auth().currentUser;
      if (!user) {
        console.log('Cannot load user plot: No user logged in');
        return;
      }

      console.log('Loading plot for user:', user.email);

      try {
        // Check if user has any plots
        console.log('Checking if user has any plots...');
        const plotsSnapshot = await firebase.firestore()
          .collection('users')
          .doc(user.uid)
          .collection('plots')
          .limit(1)
          .get();

        if (plotsSnapshot.empty) {
          console.log('No plots found for user. Creating default plot...');
          // Create a default plot for the user
          await this.createDefaultPlot();
        } else {
          console.log('Found existing plot for user');
          // Load the first plot
          const plotDoc = plotsSnapshot.docs[0];
          this.plotId = plotDoc.id;
          const plotData = plotDoc.data();
          this.plotName = plotData.name;
          this.plotWidth = plotData.width;
          this.plotHeight = plotData.height;

          console.log('Plot data loaded:', {
            id: this.plotId,
            name: this.plotName,
            width: this.plotWidth,
            height: this.plotHeight
          });

          // Load cells for this plot
          await this.loadPlotCells();
        }
      } catch (error) {
        console.error('Error loading user plot:', error);

        if (error.code === 'permission-denied') {
          console.error('This is a permissions issue. You need to deploy your Firestore security rules.');
          alert('Cannot load plot: Permission denied. Please deploy your Firestore security rules. See the deploy-rules.md file for instructions.');
        }
      }
    },

    // Create a default plot for the user
    async createDefaultPlot() {
      const user = firebase.auth().currentUser;
      if (!user) return;

      try {
        // Create a new plot document
        const plotRef = await firebase.firestore()
          .collection('users')
          .doc(user.uid)
          .collection('plots')
          .add({
            name: this.plotName,
            width: this.plotWidth,
            height: this.plotHeight,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastModified: firebase.firestore.FieldValue.serverTimestamp()
          });

        this.plotId = plotRef.id;

        // Initialize empty cells
        this.initializeEmptyCells();

        // Save cells to Firestore
        await this.saveCellsToFirestore();
      } catch (error) {
        console.error('Error creating default plot:', error);
      }
    },

    // Initialize empty cells for the plot
    initializeEmptyCells() {
      this.cells = [];

      // Calculate grid dimensions
      const gridWidth = this.plotWidth * 12 / this.cellSize; // Convert feet to cell units
      const gridHeight = this.plotHeight * 12 / this.cellSize;

      // Create empty cells
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          this.cells.push({
            id: `cell-${x}-${y}`,
            x,
            y,
            plantId: null,
            plantedDate: null,
            status: 'empty'
          });
        }
      }
    },

    // Load cells for the current plot
    async loadPlotCells() {
      const user = firebase.auth().currentUser;
      if (!user || !this.plotId) return;

      try {
        const cellsSnapshot = await firebase.firestore()
          .collection('users')
          .doc(user.uid)
          .collection('plots')
          .doc(this.plotId)
          .collection('cells')
          .get();

        if (cellsSnapshot.empty) {
          // Initialize empty cells if none exist
          this.initializeEmptyCells();
          await this.saveCellsToFirestore();
        } else {
          // Load cells from Firestore
          this.cells = cellsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        }
      } catch (error) {
        console.error('Error loading plot cells:', error);
      }
    },

    // Save cells to Firestore
    async saveCellsToFirestore() {
      const user = firebase.auth().currentUser;
      if (!user || !this.plotId) return;

      try {
        const batch = firebase.firestore().batch();
        const cellsRef = firebase.firestore()
          .collection('users')
          .doc(user.uid)
          .collection('plots')
          .doc(this.plotId)
          .collection('cells');

        // Add each cell to the batch
        for (const cell of this.cells) {
          const cellDoc = cellsRef.doc(cell.id);
          batch.set(cellDoc, {
            x: cell.x,
            y: cell.y,
            plantId: cell.plantId,
            plantedDate: cell.plantedDate,
            status: cell.status
          });
        }

        // Commit the batch
        await batch.commit();
      } catch (error) {
        console.error('Error saving cells to Firestore:', error);
      }
    },

    // Set up grid interaction
    setupGridInteraction() {
      // This will be implemented in the HTML/Alpine.js
    },

    // Select a plant for planting
    selectPlant(plantId) {
      this.selectedPlant = plantId;
      this.selectedCell = null;
    },

    // Get plant by ID
    getPlant(plantId) {
      return this.plants.find(plant => plant.id === plantId);
    },

    // Get cell at coordinates
    getCell(x, y) {
      return this.cells.find(cell => cell.x === x && cell.y === y);
    },

    // Plant the selected plant in a cell
    async plantInCell(cellId) {
      if (!this.selectedPlant) return;

      const user = firebase.auth().currentUser;
      if (!user || !this.plotId) return;

      try {
        // Find the cell
        const cellIndex = this.cells.findIndex(cell => cell.id === cellId);
        if (cellIndex === -1) return;

        // Update the cell
        this.cells[cellIndex].plantId = this.selectedPlant;
        this.cells[cellIndex].plantedDate = new Date();
        this.cells[cellIndex].status = 'planted';

        // Save the updated cell to Firestore
        await firebase.firestore()
          .collection('users')
          .doc(user.uid)
          .collection('plots')
          .doc(this.plotId)
          .collection('cells')
          .doc(cellId)
          .update({
            plantId: this.selectedPlant,
            plantedDate: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'planted'
          });

        // Create a planting record
        await this.createPlantingRecord(this.cells[cellIndex]);

        // Generate tasks for this planting
        await this.generateTasksForPlanting(this.cells[cellIndex]);
      } catch (error) {
        console.error('Error planting in cell:', error);
      }
    },

    // Create a planting record
    async createPlantingRecord(cell) {
      const user = firebase.auth().currentUser;
      if (!user || !this.plotId) return;

      try {
        const plant = this.getPlant(cell.plantId);
        if (!plant) return;

        // Calculate expected harvest date
        const plantedDate = cell.plantedDate;
        const daysToMaturity = plant.growingInfo.daysToMaturity || 90;
        const expectedHarvestDate = new Date(plantedDate);
        expectedHarvestDate.setDate(expectedHarvestDate.getDate() + daysToMaturity);

        // Create the planting record
        await firebase.firestore()
          .collection('users')
          .doc(user.uid)
          .collection('plantings')
          .add({
            plantId: cell.plantId,
            plantName: plant.name,
            plotId: this.plotId,
            cellIds: [cell.id],
            plantedDate: firebase.firestore.FieldValue.serverTimestamp(),
            expectedHarvestDate: expectedHarvestDate,
            status: 'planted',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
      } catch (error) {
        console.error('Error creating planting record:', error);
      }
    },

    // Generate tasks for a planting
    async generateTasksForPlanting(cell) {
      const user = firebase.auth().currentUser;
      if (!user) return;

      try {
        const plant = this.getPlant(cell.plantId);
        if (!plant || !plant.tasks) return;

        const batch = firebase.firestore().batch();
        const tasksRef = firebase.firestore()
          .collection('users')
          .doc(user.uid)
          .collection('tasks');

        // Create tasks based on plant's task templates
        for (const taskTemplate of plant.tasks) {
          // Calculate due date based on timing type
          let dueDate = new Date(cell.plantedDate);

          if (taskTemplate.timingType === 'daysAfterPlanting') {
            dueDate.setDate(dueDate.getDate() + taskTemplate.timing);
          } else if (taskTemplate.timingType === 'recurring') {
            // For recurring tasks, set the first occurrence
            dueDate.setDate(dueDate.getDate() + taskTemplate.timing);
          }

          // Create the task
          const taskDoc = tasksRef.doc();
          batch.set(taskDoc, {
            title: `${plant.name}: ${taskTemplate.title}`,
            description: taskTemplate.description,
            dueDate: dueDate,
            completed: false,
            priority: 'medium',
            category: taskTemplate.category,
            relatedPlantingId: cell.id,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            recurring: taskTemplate.timingType === 'recurring',
            recurrencePattern: taskTemplate.timingType === 'recurring' ? `every${taskTemplate.timing}days` : null
          });
        }

        // Commit the batch
        await batch.commit();
      } catch (error) {
        console.error('Error generating tasks for planting:', error);
      }
    },

    // Clear a cell (remove plant)
    async clearCell(cellId) {
      const user = firebase.auth().currentUser;
      if (!user || !this.plotId) return;

      try {
        // Find the cell
        const cellIndex = this.cells.findIndex(cell => cell.id === cellId);
        if (cellIndex === -1) return;

        // Update the cell
        this.cells[cellIndex].plantId = null;
        this.cells[cellIndex].plantedDate = null;
        this.cells[cellIndex].status = 'empty';

        // Save the updated cell to Firestore
        await firebase.firestore()
          .collection('users')
          .doc(user.uid)
          .collection('plots')
          .doc(this.plotId)
          .collection('cells')
          .doc(cellId)
          .update({
            plantId: null,
            plantedDate: null,
            status: 'empty'
          });
      } catch (error) {
        console.error('Error clearing cell:', error);
      }
    }
  };
}
