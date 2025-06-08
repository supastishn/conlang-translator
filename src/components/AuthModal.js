import authService from '../authService.js';

export default class AuthModal {
    constructor() {
        this.modal = document.createElement('div');
        this.modal.id = 'auth-modal';
        // ... modal UI code ...
    }

    loginHandler = async (email, password) => {
        try {
            await authService.login(email, password);
            this.close();
        } catch (error) {
            // Show error message
        }
    }
}
