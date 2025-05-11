// Firebase connectivity test function
function testFirebaseConnection() {
  console.log('Testing Firebase connectivity...');

  // Check if Firebase is initialized
  if (!firebase || !firebase.app) {
    console.error('Firebase is not initialized');
    return false;
  }

  console.log('Firebase is initialized');

  // Check authentication state
  const user = firebase.auth().currentUser;
  console.log('Current user:', user ? `Logged in as ${user.email}` : 'Not logged in');

  if (!user) {
    console.log('Please sign in to test Firestore permissions');
    alert('Please sign in first to test Firestore permissions');
    return false;
  }

  // Test Firestore connection with user collection
  console.log('Testing user-specific collection access...');
  const userDoc = firebase.firestore().collection('users').doc(user.uid);

  return userDoc.set({
    email: user.email,
    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
    testId: Math.random().toString(36).substring(2)
  }, { merge: true })
  .then(() => {
    console.log('Successfully wrote to user document in Firestore');
    return userDoc.get();
  })
  .then((doc) => {
    console.log('Successfully read user document from Firestore:', doc.exists ? 'Document exists' : 'Document does not exist');
    if (doc.exists) {
      console.log('User document data:', doc.data());
    }

    // Now test plants collection
    console.log('Testing plants collection access...');
    return firebase.firestore().collection('plants').get();
  })
  .then((snapshot) => {
    console.log('Successfully queried plants collection. Found', snapshot.docs.length, 'plants');

    if (snapshot.docs.length === 0) {
      console.log('Plants collection is empty. You may need to initialize it.');
      return initializePlantsCollection();
    }

    return true;
  })
  .catch((error) => {
    console.error('Firebase connectivity test failed:', error);

    if (error.code === 'permission-denied') {
      console.error('This is a permissions issue. You need to deploy your Firestore security rules.');
      alert('Firestore permission denied. You need to deploy your security rules to Firebase. See console for details.');
    }

    return false;
  });
}

// Initialize plants collection with sample data
async function initializePlantsCollection() {
  console.log('Initializing plants collection...');

  const user = firebase.auth().currentUser;
  if (!user) {
    console.error('User must be logged in to initialize plants collection');
    return false;
  }

  try {
    // Check if user has admin rights (this is a simple check, not secure)
    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
    const userData = userDoc.data() || {};

    if (!userData.isAdmin) {
      // Set user as admin (only for initial setup)
      await firebase.firestore().collection('users').doc(user.uid).update({
        isAdmin: true
      });
      console.log('User set as admin for initialization');
    }

    // Sample plant data
    const plants = [
      {
        id: 'tomatoes',
        name: 'Tomatoes',
        emoji: '🍅',
        growingInfo: {
          daysToMaturity: 80,
          spacing: 24,
          depth: 0.25,
          sunRequirements: 'full',
          waterRequirements: 'moderate'
        },
        tasks: [
          {
            title: 'Water deeply',
            description: 'Water tomatoes deeply at the base of the plant',
            category: 'watering',
            timingType: 'recurring',
            timing: 3 // every 3 days
          },
          {
            title: 'Apply fertilizer',
            description: 'Apply balanced fertilizer',
            category: 'fertilizing',
            timingType: 'daysAfterPlanting',
            timing: 30
          }
        ]
      },
      {
        id: 'cucumbers',
        name: 'Cucumbers',
        emoji: '🥒',
        growingInfo: {
          daysToMaturity: 60,
          spacing: 18,
          depth: 1,
          sunRequirements: 'full',
          waterRequirements: 'high'
        },
        tasks: [
          {
            title: 'Water thoroughly',
            description: 'Keep soil consistently moist',
            category: 'watering',
            timingType: 'recurring',
            timing: 2 // every 2 days
          }
        ]
      },
      {
        id: 'pumpkins',
        name: 'Pumpkins',
        emoji: '🎃',
        growingInfo: {
          daysToMaturity: 100,
          spacing: 72,
          depth: 1,
          sunRequirements: 'full',
          waterRequirements: 'moderate'
        },
        tasks: [
          {
            title: 'Water deeply',
            description: 'Water at base of plant, avoid wetting leaves',
            category: 'watering',
            timingType: 'recurring',
            timing: 4 // every 4 days
          }
        ]
      },
      {
        id: 'onions',
        name: 'Onions',
        emoji: '🧅',
        growingInfo: {
          daysToMaturity: 90,
          spacing: 6,
          depth: 1,
          sunRequirements: 'full',
          waterRequirements: 'low'
        },
        tasks: [
          {
            title: 'Water lightly',
            description: 'Water only when soil is dry',
            category: 'watering',
            timingType: 'recurring',
            timing: 5 // every 5 days
          }
        ]
      },
      {
        id: 'romaine',
        name: 'Romaine',
        emoji: '🥬',
        growingInfo: {
          daysToMaturity: 70,
          spacing: 12,
          depth: 0.25,
          sunRequirements: 'partial',
          waterRequirements: 'moderate'
        },
        tasks: [
          {
            title: 'Water regularly',
            description: 'Keep soil consistently moist',
            category: 'watering',
            timingType: 'recurring',
            timing: 2 // every 2 days
          }
        ]
      },
      {
        id: 'sweetPotatoes',
        name: 'Sweet Potatoes',
        emoji: '🍠',
        growingInfo: {
          daysToMaturity: 100,
          spacing: 12,
          depth: 3,
          sunRequirements: 'full',
          waterRequirements: 'moderate'
        },
        tasks: [
          {
            title: 'Water deeply',
            description: 'Water deeply but infrequently',
            category: 'watering',
            timingType: 'recurring',
            timing: 5 // every 5 days
          }
        ]
      }
    ];

    // Add plants to Firestore
    const batch = firebase.firestore().batch();

    plants.forEach(plant => {
      const plantRef = firebase.firestore().collection('plants').doc(plant.id);
      batch.set(plantRef, plant);
    });

    await batch.commit();
    console.log('Plants collection initialized with', plants.length, 'plants');

    return true;
  } catch (error) {
    console.error('Error initializing plants collection:', error);
    return false;
  }
}

// Add buttons to the page to test Firebase connectivity and view deployment instructions
document.addEventListener('DOMContentLoaded', () => {
  // Create a container for the buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.style.position = 'fixed';
  buttonContainer.style.bottom = '10px';
  buttonContainer.style.right = '10px';
  buttonContainer.style.zIndex = '9999';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.flexDirection = 'column';
  buttonContainer.style.gap = '10px';

  // Create test button
  const testButton = document.createElement('button');
  testButton.textContent = 'Test Firebase Connection';
  testButton.style.padding = '8px 12px';
  testButton.style.backgroundColor = '#4CAF50';
  testButton.style.color = 'white';
  testButton.style.border = 'none';
  testButton.style.borderRadius = '4px';
  testButton.style.cursor = 'pointer';

  // Add click event for test button
  testButton.addEventListener('click', () => {
    testFirebaseConnection()
      .then(success => {
        if (success) {
          alert('Firebase connection test successful! Check console for details.');
        } else {
          alert('Firebase connection test failed. Check console for details.');
        }
      });
  });

  // Create deploy instructions button
  const deployButton = document.createElement('button');
  deployButton.textContent = 'View Deployment Instructions';
  deployButton.style.padding = '8px 12px';
  deployButton.style.backgroundColor = '#2196F3';
  deployButton.style.color = 'white';
  deployButton.style.border = 'none';
  deployButton.style.borderRadius = '4px';
  deployButton.style.cursor = 'pointer';

  // Add click event for deploy button
  deployButton.addEventListener('click', () => {
    // Create a modal to display the instructions
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    modal.style.zIndex = '10000';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';

    // Create the modal content
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.maxWidth = '800px';
    modalContent.style.maxHeight = '80vh';
    modalContent.style.overflow = 'auto';

    // Add a close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.padding = '8px 16px';
    closeButton.style.backgroundColor = '#f44336';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.marginTop = '20px';
    closeButton.style.float = 'right';

    closeButton.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    // Fetch the deployment instructions
    fetch('deploy-rules.md')
      .then(response => response.text())
      .then(markdown => {
        // Use marked to convert markdown to HTML
        modalContent.innerHTML = marked.parse(markdown);
        modalContent.appendChild(closeButton);
      })
      .catch(error => {
        modalContent.innerHTML = `<h2>Error Loading Instructions</h2><p>${error.message}</p>`;
        modalContent.appendChild(closeButton);
      });

    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  });

  // Add buttons to container
  buttonContainer.appendChild(testButton);
  buttonContainer.appendChild(deployButton);

  // Add container to body
  document.body.appendChild(buttonContainer);
});
