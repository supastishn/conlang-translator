import { Client, Account } from 'appwrite';

const client = new Client()
    .setEndpoint('https://[HOSTNAME_OR_IP]/v1') // Your Appwrite endpoint
    .setProject('[YOUR_PROJECT_ID]'); // Your Appwrite project ID

const account = new Account(client);

export const login = async (email, password) => {
    return await account.createEmailSession(email, password);
};

export const register = async (email, password) => {
    return await account.create('unique()', email, password);
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
