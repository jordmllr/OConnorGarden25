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
  
  // Test Firestore connection
  const testDoc = firebase.firestore().collection('_test_connection').doc('test');
  
  return testDoc.set({
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    testId: Math.random().toString(36).substring(2)
  })
  .then(() => {
    console.log('Successfully wrote to Firestore');
    return testDoc.get();
  })
  .then((doc) => {
    console.log('Successfully read from Firestore:', doc.exists ? 'Document exists' : 'Document does not exist');
    if (doc.exists) {
      console.log('Document data:', doc.data());
    }
    return true;
  })
  .catch((error) => {
    console.error('Firebase connectivity test failed:', error);
    return false;
  });
}

// Add a button to the page to test Firebase connectivity
document.addEventListener('DOMContentLoaded', () => {
  // Create a test button
  const testButton = document.createElement('button');
  testButton.textContent = 'Test Firebase Connection';
  testButton.style.position = 'fixed';
  testButton.style.bottom = '10px';
  testButton.style.right = '10px';
  testButton.style.zIndex = '9999';
  testButton.style.padding = '8px 12px';
  testButton.style.backgroundColor = '#4CAF50';
  testButton.style.color = 'white';
  testButton.style.border = 'none';
  testButton.style.borderRadius = '4px';
  testButton.style.cursor = 'pointer';
  
  // Add click event
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
  
  // Add to body
  document.body.appendChild(testButton);
});
