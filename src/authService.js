import { Client, Account } from 'appwrite';

const client = new Client()
    .setEndpoint('https://[HOSTNAME_OR_IP]/v1') // Your Appwrite endpoint
    .setProject('[YOUR_PROJECT_ID]'); // Your Appwrite project ID

const account = new Account(client);

const authService = {
    login: async (email, password) => {
        return await account.createEmailSession(email, password);
    },
    
    register: async (email, password) => {
        return await account.create('unique()', email, password);
    },
    
    logout: async () => {
        return await account.deleteSession('current');
    },
    
    getCurrentUser: async () => {
        try {
            return await account.get();
        } catch (error) {
            console.log('Current user not found', error);
            return null;
        }
    }
};

// Make authService globally available
window.authService = {
    login: authService.login,
    register: authService.register,
    logout: authService.logout,
    getCurrentUser: authService.getCurrentUser
};

export default authService;
