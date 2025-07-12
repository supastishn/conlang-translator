import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function AuthPage({ type }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const isRegister = type === 'register';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      if (isRegister) {
        await register(email, password);
        alert('Registration successful!');
      } else {
        await login(email, password);
        alert('Login successful!');
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="settings-container">
      <h2>{isRegister ? 'Create a New Account' : 'Login to Your Account'}</h2>
      {error && <div className="error" style={{marginBottom: '1rem'}}>{error}</div>}
      <form id={isRegister ? 'register-form' : 'login-form'} className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor={isRegister ? 'register-email' : 'login-email'}>Email:</label>
          <input type="email" id={isRegister ? 'register-email' : 'login-email'} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        
        <div className="form-group">
          <label htmlFor={isRegister ? 'register-password' : 'login-password'}>Password:</label>
          <input type="password" id={isRegister ? 'register-password' : 'login-password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        
        {isRegister && (
          <div className="form-group">
            <label htmlFor="register-confirm">Confirm Password:</label>
            <input type="password" id="register-confirm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
        )}
        
        <button type="submit" className="auth-btn">{isRegister ? 'Register' : 'Login'}</button>
        <p>
          {isRegister ? (
            <>Already have an account? <Link to="/login">Login here</Link></>
          ) : (
            <>Don't have an account? <Link to="/register">Register here</Link></>
          )}
        </p>
      </form>
    </div>
  );
}
