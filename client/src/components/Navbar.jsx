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

  // Desktop styled tab appearance (border underline, pb-1, matching green text) - updated size to body-lg (18px)
  const desktopNavLinkClass = (path) =>
    `font-body-lg text-body-lg transition-all duration-200 ${
      isActive(path)
        ? 'text-primary border-b-2 border-primary pb-1'
        : 'text-on-surface-variant hover:text-primary'
    }`;

  // Mobile menu items styling with background highlight
  const mobileNavLinkClass = (path) =>
    `block px-4 py-2 rounded-lg text-body-md font-medium transition-all duration-200 ${
      isActive(path)
        ? 'text-primary bg-primary/10'
        : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
    }`;

  return (
    <header className="w-full sticky top-0 z-50 bg-surface-container-lowest border-b border-border-subtle shadow-sm">
      <nav className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between h-16 sm:h-20">
        {/* Left Section: Logo + Nav Tabs grouped together */}
        <div className="flex items-center gap-10">
          {/* Logo */}
          <Link to="/" className="font-headline-lg text-headline-lg font-bold text-primary shrink-0 animate-fade-in" onClick={() => setMenuOpen(false)}>
            QuizMaster
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-6">
            <Link to="/" className={desktopNavLinkClass('/')}>Home</Link>
            <Link to="/builder" className={desktopNavLinkClass('/builder')}>Create Quiz</Link>
            <Link to="/host" className={desktopNavLinkClass('/host')}>Host Quiz</Link>
            <Link to="/play" className={desktopNavLinkClass('/play')}>Join Quiz</Link>
          </div>
        </div>

        {/* Right Section: Auth links / buttons */}
        <div className="hidden lg:flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <span className="px-4 py-2 text-body-md font-medium text-on-surface-variant hover:text-primary transition-colors cursor-default font-body-md">
                {user?.name}
              </span>
              <button
                onClick={handleLogout}
                className="px-6 py-2 text-body-md font-semibold text-white bg-primary rounded-lg hover:bg-primary-container transition-all shadow-sm active:scale-95 font-body-md"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 text-body-md font-medium text-on-surface-variant hover:text-primary transition-colors font-body-md">
                Sign In
              </Link>
              <Link to="/login" className="px-6 py-2 text-body-md font-semibold text-white bg-primary rounded-lg hover:bg-primary-container transition-all shadow-sm active:scale-95 font-body-md">
                Join
              </Link>
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
          <Link to="/" className={mobileNavLinkClass('/')} onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/builder" className={mobileNavLinkClass('/builder')} onClick={() => setMenuOpen(false)}>Create Quiz</Link>
          <Link to="/host" className={mobileNavLinkClass('/host')} onClick={() => setMenuOpen(false)}>Host Quiz</Link>
          <Link to="/play" className={mobileNavLinkClass('/play')} onClick={() => setMenuOpen(false)}>Join Quiz</Link>

          <div className="pt-3 border-t border-border-subtle mt-2">
            {isAuthenticated ? (
              <div className="space-y-2">
                <span className="block px-4 py-2 text-body-md font-medium text-on-surface-variant hover:text-primary transition-colors cursor-default font-body-md">
                  {user?.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="block w-full px-4 py-2 rounded-lg text-body-md font-semibold text-white bg-primary hover:bg-primary-container transition-all text-center font-body-md"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link to="/login" className="block px-4 py-2 rounded-lg text-body-md font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors font-body-md" onClick={() => setMenuOpen(false)}>
                  Sign In
                </Link>
                <Link to="/login" className="block px-4 py-2 rounded-lg text-body-md font-semibold text-white bg-primary hover:bg-primary-container transition-all text-center font-body-md" onClick={() => setMenuOpen(false)}>
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
