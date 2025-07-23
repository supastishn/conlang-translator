import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function AuthPage({ type }) {
  const [state, setState] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    error: ''
  });
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const isRegister = type === 'register';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setState(prev => ({ ...prev, error: '' }));

    if (isRegister && state.password !== state.confirmPassword) {
      setState(prev => ({ ...prev, error: 'Passwords do not match' }));
      return;
    }

    try {
      if (isRegister) {
        await register(state.email, state.password);
        alert('Registration successful!');
      } else {
        await login(state.email, state.password);
        alert('Login successful!');
      }
      navigate('/');
    } catch (err) {
      setState(prev => ({ ...prev, error: err.message }));
    }
  };

  return (
    <div className="settings-container">
      <h2>{isRegister ? 'Create a New Account' : 'Login to Your Account'}</h2>
      {state.error && <div className="error" style={{marginBottom: '1rem'}}>{state.error}</div>}
      <form id={isRegister ? 'register-form' : 'login-form'} className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor={`${isRegister ? 'register' : 'login'}-email`}>Email:</label>
          <input
            type="email"
            id={`${isRegister ? 'register' : 'login'}-email`}
            value={state.email}
            onChange={e => setState(prev => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor={`${isRegister ? 'register' : 'login'}-password`}>Password:</label>
          <input
            type="password"
            id={`${isRegister ? 'register' : 'login'}-password`}
            value={state.password}
            onChange={e => setState(prev => ({ ...prev, password: e.target.value }))}
            required
          />
        </div>

        {isRegister && (
          <div className="form-group">
            <label htmlFor="register-confirm">Confirm Password:</label>
            <input
              type="password"
              id="register-confirm"
              value={state.confirmPassword}
              onChange={e => setState(prev => ({ ...prev, confirmPassword: e.target.value }))}
              required
            />
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
