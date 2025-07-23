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

  const authType = type === 'register' ? 'register' : 'login';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (authType === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      if (authType === 'register') {
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
      <h2>{authType === 'register' ? 'Create a New Account' : 'Login to Your Account'}</h2>
      {error && <div className="error" style={{marginBottom: '1rem'}}>{error}</div>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor={`${authType}-email`}>{`Email:`}</label>
          <input
            type="email"
            id={`${authType}-email`}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor={`${authType}-password`}>{`Password:`}</label>
          <input
            type="password"
            id={`${authType}-password`}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        {authType === 'register' && (
          <div className="form-group">
            <label htmlFor="register-confirm">Confirm Password:</label>
            <input
              type="password"
              id="register-confirm"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        )}

        <button type="submit" className="auth-btn">{authType === 'register' ? 'Register' : 'Login'}</button>
        <p>
          {authType === 'register'
            ? <>Already have an account? <Link to="/login">Login here</Link></>
            : <>Don't have an account? <Link to="/register">Register here</Link></>
          }
        </p>
      </form>
    </div>
  );
}
