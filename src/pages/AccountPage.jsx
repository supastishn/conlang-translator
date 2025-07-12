import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AccountPage() {
  const { user, loading, updateEmail, updatePassword, deleteAccount, logout } = useAuth();
  const navigate = useNavigate();

  const [newEmail, setNewEmail] = useState('');
  const [passwordForEmail, setPasswordForEmail] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [confirmDeletion, setConfirmDeletion] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await updateEmail(newEmail, passwordForEmail);
      alert('Email updated successfully! Please log in with your new email.');
      await logout();
      navigate('/login');
    } catch (err) => {
      setError('Failed to update email: ' + err.message);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    try {
      await updatePassword(oldPassword, newPassword);
      alert('Password updated successfully! Please log in again.');
      await logout();
      navigate('/login');
    } catch (err) {
      setError('Failed to update password: ' + err.message);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (confirmDeletion !== 'DELETE MY ACCOUNT') {
      setError('Please type exactly "DELETE MY ACCOUNT" to confirm');
      return;
    }
    if (window.confirm('Are you absolutely sure? This will permanently delete your account and all data.')) {
      try {
        await deleteAccount();
        alert('Account permanently deleted');
        navigate('/');
      } catch (err) {
        setError('Failed to delete account: ' + err.message);
      }
    }
  };

  if (loading || !user) {
    return <div>Loading account...</div>;
  }

  return (
    <div className="settings-container">
      <h2>Manage Your Account</h2>
      
      {error && <div className="error" style={{marginBottom: '1rem'}}>{error}</div>}
      {message && <div className="success" style={{marginBottom: '1rem'}}>{message}</div>}
      
      <div id="account-info" className="account-info">
          <p><strong>Email:</strong> <span id="current-email">{user.email}</span></p>
      </div>
      
      <div className="account-actions">
          <div className="form-group">
              <h3>Update Email</h3>
              <form id="update-email-form" onSubmit={handleUpdateEmail}>
                  <div className="form-group">
                      <label htmlFor="new-email">New Email:</label>
                      <input type="email" id="new-email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                  </div>
                  <div className="form-group">
                      <label htmlFor="password-for-email">Current Password:</label>
                      <input type="password" id="password-for-email" value={passwordForEmail} onChange={e => setPasswordForEmail(e.target.value)} required />
                  </div>
                  <button type="submit" className="auth-btn">Update Email</button>
              </form>
          </div>
          
          <div className="form-group">
              <h3>Update Password</h3>
              <form id="update-password-form" onSubmit={handleUpdatePassword}>
                  <div className="form-group">
                      <label htmlFor="old-password">Current Password:</label>
                      <input type="password" id="old-password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
                  </div>
                  <div className="form-group">
                      <label htmlFor="new-password">New Password:</label>
                      <input type="password" id="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                  </div>
                  <div className="form-group">
                      <label htmlFor="confirm-password">Confirm New Password:</label>
                      <input type="password" id="confirm-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                  </div>
                  <button type="submit" className="auth-btn">Update Password</button>
              </form>
          </div>
          
          <div className="form-group warning-section">
              <h3>Delete Account</h3>
              <div className="warning">
                  Warning: This will permanently delete your account and all associated data. This action cannot be undone.
              </div>
              <form id="delete-account-form" onSubmit={handleDeleteAccount}>
                  <div className="form-group">
                      <label htmlFor="confirm-deletion">Type "DELETE MY ACCOUNT" to confirm:</label>
                      <input type="text" id="confirm-deletion" placeholder="DELETE MY ACCOUNT" value={confirmDeletion} onChange={e => setConfirmDeletion(e.target.value)} required />
                  </div>
                  <button type="submit" className="auth-btn error-btn">Permanently Delete Account</button>
              </form>
          </div>
      </div>
    </div>
  );
}
