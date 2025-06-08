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

export const getCurrentUser = async () => {
    try {
        return await account.get();
    } catch (error) {
        console.log('Current user not found', error);
        return null;
    }
};
