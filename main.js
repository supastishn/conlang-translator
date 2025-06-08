import authService from './authService.js';

// Check auth state on load
authService.getCurrentUser().then(user => {
    if (user) {
        // Show authenticated UI
    } else {
        // Show login modal
    }
});
