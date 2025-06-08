/*
// Remove import statement
// Initialize Appwrite using window object
*/
const client = new window.Appwrite.Client()
    .setEndpoint('https://your-appwrite-endpoint/v1') // ACTUAL ENDPOINT
    .setProject('your-project-id'); // ACTUAL PROJECT ID

const account = new window.Appwrite.Account(client);

const login = async (email, password) => {
    return await account.createEmailSession(email, password);
};

const register = async (email, password) => {
    // Create account
    await account.create('unique()', email, password);
    // Automatically log in the new user
    return await account.createEmailSession(email, password);
};

const logout = async () => {
    return await account.deleteSession('current');
};

const updateEmail = async (newEmail, password) => {
    return await account.updateEmail(newEmail, password);
};

const updatePassword = async (oldPassword, newPassword) => {
    return await account.updatePassword(newPassword, oldPassword);
};

const deleteAccount = async () => {
    return await account.delete();
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
    console.debug(`Auth state changed. User logged in: ${user ? 'Yes' : 'No'}`);
    
    const accountLinks = document.querySelectorAll('#account-nav-item');
    const navContainers = document.querySelectorAll('nav ul');

    navContainers.forEach(nav => {
        // Remove any existing auth container
        const existingAuthContainer = nav.querySelector('.auth-container');
        if (existingAuthContainer) {
            nav.removeChild(existingAuthContainer);
        }

        // Create new auth container as a nav item (li)
        const authContainer = document.createElement('li');
        authContainer.className = 'auth-container';
        authContainer.innerHTML = user
            ? `<a href="account.html" class="auth-btn">Account</a>`
            : `<a href="login.html" class="auth-btn login-btn">Login</a>
               <a href="register.html" class="auth-btn">Register</a>`;
        nav.appendChild(authContainer);
    });

    // Show/hide account nav item
    accountLinks.forEach(link => {
        const action = user ? 'block' : 'none';
        console.debug(`Setting account nav item visibility: ${action}`);
        link.style.display = user ? 'block' : 'none';
    });
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log("AuthService DOMContentLoaded triggered");
    await updateAuthUI();
});

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
