import { Client, Account } from 'https://cdn.jsdelivr.net/npm/appwrite@14.1.0/+esm';

const client = new Client()
    .setEndpoint('https://your-appwrite-endpoint/v1') // ACTUAL ENDPOINT
    .setProject('your-project-id'); // ACTUAL PROJECT ID

const account = new Account(client);

export const login = async (email, password) => {
    return await account.createEmailSession(email, password);
};

export const register = async (email, password) => {
    // Create account
    await account.create('unique()', email, password);
    // Automatically log in the new user
    return await account.createEmailSession(email, password);
};

export const logout = async () => {
    return await account.deleteSession('current');
};

export const updateEmail = async (newEmail, password) => {
    return await account.updateEmail(newEmail, password);
};

export const updatePassword = async (oldPassword, newPassword) => {
    return await account.updatePassword(newPassword, oldPassword);
};

export const deleteAccount = async () => {
    return await account.delete();
};

export const getCurrentUser = async () => {
    try {
        return await account.get();
    } catch (error) {
        console.log('Current user not found', error);
        return null;
    }
};

// New function to update UI based on auth state
export const updateAuthUI = async () => {
    const user = await getCurrentUser();
    console.debug(`Auth state changed. User logged in: ${user ? 'Yes' : 'No'}`);
    
    const accountLinks = document.querySelectorAll('#account-nav-item');
    const authContainers = document.querySelectorAll('.auth-container');

    authContainers.forEach(container => {
        const action = user ? 'Account' : 'Login/Register links';
        console.debug(`Setting auth container to: ${action}`);
        
        container.innerHTML = user
            ? `<a href="account.html" class="auth-btn">Account</a>`
            : `<a href="login.html" class="auth-btn login-btn">Login</a>
               <a href="register.html" class="auth-btn">Register</a>`;
    });

    // Add account page nav item only if logged in
    accountLinks.forEach(link => {
        const action = user ? 'block' : 'none';
        console.debug(`Setting account nav item visibility: ${action}`);
        link.style.display = user ? 'block' : 'none';
    });
};

// Auth state change listener
document.addEventListener('DOMContentLoaded', async () => {
    const authContainers = document.querySelectorAll('.auth-container');
    if (authContainers.length > 0) {
        await updateAuthUI();
    }
});

// Expose to global scope for legacy pages
window.handleAuthStateChange = async () => {
    await updateAuthUI();
};
