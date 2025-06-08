import { 
    getCurrentUser, 
    updateEmail, 
    updatePassword, 
    deleteAccount,
    logout
} from './src/authService.js';

document.addEventListener('DOMContentLoaded', async function() {
    const user = await getCurrentUser();
    
    if (!user) {
        alert('You must be logged in to access this page');
        window.location.href = 'login.html';
        return;
    }
    
    // Show user email
    document.getElementById('current-email').textContent = user.email;
    
    // Update Email Form
    document.getElementById('update-email-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newEmail = document.getElementById('new-email').value;
        const password = document.getElementById('password-for-email').value;
        
        try {
            await updateEmail(newEmail, password);
            alert('Email updated successfully! Please log in with your new email.');
            await logout();
            window.location.href = 'login.html';
        } catch (error) {
            alert('Failed to update email: ' + error.message);
        }
    });
    
    // Update Password Form
    document.getElementById('update-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldPassword = document.getElementById('old-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (newPassword !== confirmPassword) {
            alert('New passwords do not match');
            return;
        }
        
        try {
            await updatePassword(oldPassword, newPassword);
            alert('Password updated successfully! Please log in again.');
            await logout();
            window.location.href = 'login.html';
        } catch (error) {
            alert('Failed to update password: ' + error.message);
        }
    });
    
    // Delete Account Form
    document.getElementById('delete-account-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const confirmation = document.getElementById('confirm-deletion').value;
        
        if (confirmation !== 'DELETE MY ACCOUNT') {
            alert('Please type exactly "DELETE MY ACCOUNT" to confirm');
            return;
        }
        
        if (confirm('Are you absolutely sure? This will permanently delete your account and all data.')) {
            try {
                await deleteAccount();
                alert('Account permanently deleted');
                window.location.href = 'index.html';
            } catch (error) {
                alert('Failed to delete account: ' + error.message);
            }
        }
    });
});
