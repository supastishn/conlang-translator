import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      // Navigate to home or login page after logout if needed
    } catch (error) {
      alert('Logout failed: ' + error.message);
    }
  };

  return (
    <div className="container">
      <header style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1><NavLink to="/" style={{textDecoration: 'none', color: 'inherit'}}>Draconic Translator</NavLink></h1>
        <nav>
          <ul>
            <li><NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>Translator</NavLink></li>
            <li><NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>Settings</NavLink></li>
            {user ? (
              <>
                <li id="account-nav-item" style={{ display: 'list-item' }}>
                  <NavLink to="/account" className={({ isActive }) => (isActive ? 'active' : '')}>Account</NavLink>
                </li>
                <li>
                  <a href="#" onClick={handleLogout} className="auth-link">Logout</a>
                </li>
              </>
            ) : (
              <>
                <li id="login-nav-item">
                  <NavLink to="/login" className={({ isActive }) => 'auth-link login-link' + (isActive ? ' active' : '')}>Login</NavLink>
                </li>
                <li id="register-nav-item">
                  <NavLink to="/register" className={({ isActive }) => 'auth-link' + (isActive ? ' active' : '')}>Register</NavLink>
                </li>
              </>
            )}
          </ul>
        </nav>
      </header>
      
      <main>
        <Outlet />
      </main>

      <footer>
        <p>Draconic Translator - Using OpenAI API for constructed language translation</p>
        <div className="footer-links">
            <a href="https://github.com/supastishn/conlang-translator" target="_blank" rel="noreferrer">See the source code</a> | 
            <a href="https://supastishn.github.io" target="_blank" rel="noreferrer">See more fun stuff</a>
        </div>
      </footer>
    </div>
  );
}
