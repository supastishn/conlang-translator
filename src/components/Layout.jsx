import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ viteSvg, reactSvg }) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      alert('Logout failed: ' + error.message);
    }
  };

  const COMMON_ITEMS = [
    { path: '/', label: 'Translator' },
    { path: '/settings', label: 'Settings' }
  ];
  const USER_ITEMS = [
    { path: '/account', label: 'Account' },
    { action: handleLogout, label: 'Logout' }
  ];
  const GUEST_ITEMS = [
    { path: '/login', label: 'Login', className: 'auth-link login-link' },
    { path: '/register', label: 'Register', className: 'auth-link' }
  ];
  const NAV_ITEMS = [
    ...(user ? USER_ITEMS : GUEST_ITEMS),
    ...COMMON_ITEMS
  ].flat();

  return (
    <div className="container">
      <header style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>
          <NavLink to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <object type="image/svg+xml" data={reactSvg} aria-label="React" style={{ height: '2em', verticalAlign: 'middle', marginRight: '0.5em' }} />
            Draconic Translator
          </NavLink>
        </h1>
        <nav>
          <ul>
            {NAV_ITEMS.map((item, index) =>
              item.path ? (
                <li key={index}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `${item.className || ''}${isActive ? ' active' : ''}`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ) : (
                <li key={index}>
                  <a href="#" onClick={item.action} className="auth-link">
                    {item.label}
                  </a>
                </li>
              )
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
          <a
            href="https://github.com/supastishn/conlang-translator"
            target="_blank"
            rel="noreferrer"
          >
            See the source code
          </a>{' '}
          |{' '}
          <a href="https://supastishn.github.io" target="_blank" rel="noreferrer">
            See more fun stuff
          </a>
        </div>
      </footer>
    </div>
  );
}
