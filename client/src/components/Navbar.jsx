import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `block px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive(path)
        ? 'text-primary bg-primary/10'
        : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
    }`;

  return (
    <header className="w-full sticky top-0 z-50 bg-surface-container-lowest border-b border-border-subtle shadow-sm">
      <nav className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between h-16 sm:h-20">
        {/* Logo */}
        <Link to="/" className="font-headline-lg text-headline-lg font-bold text-primary shrink-0" onClick={() => setMenuOpen(false)}>
          QuizMaster
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-2">
          <Link to="/" className={navLinkClass('/')}>Home</Link>
          {isAuthenticated && (
            <Link to="/builder" className={navLinkClass('/builder')}>Create Quiz</Link>
          )}
          {isAuthenticated && (
            <Link to="/host" className={navLinkClass('/host')}>Host Quiz</Link>
          )}
          <Link to="/play" className={navLinkClass('/play')}>Join Quiz</Link>
        </div>

        {/* Desktop Auth */}
        <div className="hidden lg:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="text-on-surface text-sm font-medium">{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-primary border border-border-subtle hover:border-primary rounded-lg transition-all duration-200"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Sign In</Link>
              <Link to="/register" className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-container transition-all">Get Started</Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="lg:hidden border-t border-border-subtle bg-surface-container-lowest px-4 pb-4 space-y-1 shadow-md">
          <Link to="/" className={navLinkClass('/')} onClick={() => setMenuOpen(false)}>Home</Link>
          {isAuthenticated && (
            <Link to="/builder" className={navLinkClass('/builder')} onClick={() => setMenuOpen(false)}>Create Quiz</Link>
          )}
          {isAuthenticated && (
            <Link to="/host" className={navLinkClass('/host')} onClick={() => setMenuOpen(false)}>Host Quiz</Link>
          )}
          <Link to="/play" className={navLinkClass('/play')} onClick={() => setMenuOpen(false)}>Join Quiz</Link>

          <div className="pt-3 border-t border-border-subtle mt-2">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-4 py-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-on-surface text-sm font-medium">{user?.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 rounded-lg text-sm font-medium text-error hover:bg-error/10 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link to="/login" className="block px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors" onClick={() => setMenuOpen(false)}>Sign In</Link>
                <Link to="/register" className="block px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-container transition-all text-center" onClick={() => setMenuOpen(false)}>Get Started</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
