// Create Alpine.js store for authentication state
document.addEventListener('alpine:init', () => {
  Alpine.store('auth', {
    user: null,

    init() {
      // Check if user is already signed in
      firebase.auth().onAuthStateChanged(user => {
        this.user = user;
        console.log('Auth state changed:', user ? `User logged in: ${user.email}` : 'No user logged in');

        if (user) {
          // User is signed in, load their todos
          if (window.todoApp) {
            window.todoApp.loadTodos();
          }
        }
      });
    }
  });
});

function authHandler() {
    return {
      email: '',
      password: '',
      errorMessage: '',
      isLoading: false,

      get user() {
        return Alpine.store('auth').user;
      },

      init() {
        // Initialize the auth store
        Alpine.store('auth').init();
      },

      signIn() {
        this.isLoading = true;
        this.errorMessage = '';

        console.log('Attempting to sign in with email:', this.email);

        firebase.auth().signInWithEmailAndPassword(this.email, this.password)
          .then((userCredential) => {
            console.log('User signed in successfully:', userCredential.user.email);
            this.email = '';
            this.password = '';
          })
          .catch(error => {
            console.error('Sign in error:', error.code, error.message);
            this.errorMessage = error.message;
          })
          .finally(() => {
            this.isLoading = false;
          });
      },

      signUp() {
        this.isLoading = true;
        this.errorMessage = '';

        console.log('Attempting to create new account with email:', this.email);

        firebase.auth().createUserWithEmailAndPassword(this.email, this.password)
          .then((userCredential) => {
            console.log('New user created successfully:', userCredential.user.email);
            this.email = '';
            this.password = '';
          })
          .catch(error => {
            console.error('Sign up error:', error.code, error.message);
            this.errorMessage = error.message;
          })
          .finally(() => {
            this.isLoading = false;
          });
      },

      signOut() {
        console.log('Signing out user');
        firebase.auth().signOut()
          .then(() => {
            console.log('User signed out successfully');
          })
          .catch(error => {
            console.error('Error signing out:', error);
            this.errorMessage = error.message;
          });
      },

      signInWithGoogle() {
        console.log('Attempting to sign in with Google');
        const provider = new firebase.auth.GoogleAuthProvider();

        firebase.auth().signInWithPopup(provider)
          .then((result) => {
            console.log('Google sign-in successful:', result.user.email);
          })
          .catch(error => {
            console.error('Google sign-in error:', error.code, error.message);
            this.errorMessage = error.message;
          });
      }
    };
  }