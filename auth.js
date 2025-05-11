function authHandler() {
    return {
      user: null,
      email: '',
      password: '',
      errorMessage: '',
      isLoading: false,
      
      init() {
        // Check if user is already signed in
        firebase.auth().onAuthStateChanged(user => {
          this.user = user;
          if (user) {
            // User is signed in, load their todos
            if (window.todoApp) {
              window.todoApp.loadTodos();
            }
          }
        });
      },
      
      signIn() {
        this.isLoading = true;
        this.errorMessage = '';
        
        firebase.auth().signInWithEmailAndPassword(this.email, this.password)
          .then(() => {
            this.email = '';
            this.password = '';
          })
          .catch(error => {
            this.errorMessage = error.message;
          })
          .finally(() => {
            this.isLoading = false;
          });
      },
      
      signUp() {
        this.isLoading = true;
        this.errorMessage = '';
        
        firebase.auth().createUserWithEmailAndPassword(this.email, this.password)
          .then(() => {
            this.email = '';
            this.password = '';
          })
          .catch(error => {
            this.errorMessage = error.message;
          })
          .finally(() => {
            this.isLoading = false;
          });
      },
      
      signOut() {
        firebase.auth().signOut();
      },
      
      signInWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider)
          .catch(error => {
            this.errorMessage = error.message;
          });
      }
    };
  }