const APPRWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const APPRWRITE_PROJECT = 'draconic-translator';

/*
// Remove import statement
// Initialize Appwrite using window object
*/
document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.Appwrite !== 'undefined') {
        const client = new window.Appwrite.Client()
            .setEndpoint(APPRWRITE_ENDPOINT)
            .setProject(APPRWRITE_PROJECT);

        const account = new window.Appwrite.Account(client);

        // Modify login handler
        const login = async (email, password) => {
            try {
                return await account.createEmailPasswordSession(email, password);
            } catch (error) {
                console.error(error);
                throw new Error('Authentication failed. Check credentials and try again.');
            }
        };

        // Similar error handling for register/update functions
        const register = async (email, password) => {
            try {
                await account.create('unique()', email, password);
                return await account.createEmailPasswordSession(email, password);
            } catch (error) {
                console.error(error);
                throw new Error('Registration failed. Please check your input and try again.');
            }
        };

        const logout = async () => {
            try {
                return await account.deleteSession('current');
            } catch (error) {
                console.error(error);
                throw new Error('Logout failed. Please try again.');
            }
        };

        const updateEmail = async (newEmail, password) => {
            try {
                return await account.updateEmail(newEmail, password);
            } catch (error) {
                console.error(error);
                throw new Error('Failed to update email. Please check your password and try again.');
            }
        };

        const updatePassword = async (oldPassword, newPassword) => {
            try {
                return await account.updatePassword(newPassword, oldPassword);
            } catch (error) {
                console.error(error);
                throw new Error('Failed to update password. Please check your credentials and try again.');
            }
        };

        const deleteAccount = async () => {
            try {
                return await account.delete();
            } catch (error) {
                console.error(error);
                throw new Error('Failed to delete account. Please try again.');
            }
        };

        const getCurrentUser = async () => {
            try {
                return await account.get();
            } catch (error) {
                console.log('Current user not found', error);
                return null;
            }
        };

        // New function to update UI based on auth state
        const updateAuthUI = async () => {
            const user = await getCurrentUser();
            console.log(`Auth state changed. User logged in: ${user ? 'Yes' : 'No'}`);
            
            const navContainers = document.querySelectorAll('nav ul');
            const loginElements = document.querySelectorAll('#login-nav-item');
            const registerElements = document.querySelectorAll('#register-nav-item');

            navContainers.forEach(nav => {
                // Remove any existing auth links
                const existingLogin = nav.querySelector('#login-nav-item');
                if (existingLogin) nav.removeChild(existingLogin);
                
                const existingRegister = nav.querySelector('#register-nav-item');
                if (existingRegister) nav.removeChild(existingRegister);

                if (!user) {
                    // Create login link as direct list item
                    const loginLi = document.createElement('li');
                    loginLi.id = 'login-nav-item';
                    
                    const loginLink = document.createElement('a');
                    loginLink.href = "login.html";
                    loginLink.textContent = "Login";
                    loginLink.className = "auth-link login-link";
                    loginLi.appendChild(loginLink);
                    nav.appendChild(loginLi);

                    // Create register link as direct list item
                    const registerLi = document.createElement('li');
                    registerLi.id = 'register-nav-item';
                    
                    const registerLink = document.createElement('a');
                    registerLink.href = "register.html";
                    registerLink.textContent = "Register";
                    registerLink.className = "auth-link";
                    registerLi.appendChild(registerLink);
                    nav.appendChild(registerLi);
                }
            });

            // Show/hide account nav item
            const accountLinks = document.querySelectorAll('#account-nav-item');
            accountLinks.forEach(link => {
                link.style.display = user ? 'list-item' : 'none';
            });
        };

        // Expose to global scope for legacy pages
        window.handleAuthStateChange = async () => {
            await updateAuthUI();
        };

        // Make functions available globally
        window.authService = {
            login,
            register,
            logout,
            updateEmail,
            updatePassword,
            deleteAccount,
            getCurrentUser,
            updateAuthUI
        };

        // Initial UI update
        window.initializeAuth = async () => {
            await updateAuthUI();
        };
        
        initializeAuth();
    } else {
        console.error("Appwrite SDK not loaded");
    }
});
