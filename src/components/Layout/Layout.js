import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useApp } from '../../contexts/AppContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { t } = useTranslation();
  const { user, logout, role, userData } = useAuth();
  const { currentLanguage, toggleLanguage } = useLanguage();
  const { isOnline, panicMode } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getRoleBasedNavItems = () => {
    const baseItems = [
      { path: '/dashboard', label: t('navigation.dashboard'), icon: '📊' },
      { path: '/shelters', label: t('navigation.shelters'), icon: '🏠' },
      { path: '/donations', label: t('navigation.donations'), icon: '🎁' },
      { path: '/chat', label: t('navigation.chat'), icon: '💬' },
    ];

    // Show Submit Request for requesters or if role is not set
    if (role === 'requester' || !role) {
      baseItems.splice(0, 0, { path: '/request', label: 'Submit Request', icon: '📝' });
    } else if (role === 'volunteer') {
      baseItems.splice(1, 0, { path: '/volunteer', label: 'Volunteer Requests', icon: '🤝' });
    } else if (role === 'admin') {
      baseItems.splice(1, 0, { path: '/admin', label: 'Admin Panel', icon: '⚙️' });
    }

    return baseItems;
  };

  const navItems = getRoleBasedNavItems();

  return (
    <div className="layout">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="offline-indicator" role="alert">
          <span>📡 {t('alerts.offline')}</span>
        </div>
      )}

      {/* Panic mode indicator */}
      {panicMode && (
        <div className="panic-indicator" role="alert">
          <span>🚨 {t('panic.alertActive')}</span>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <Link to="/" className="logo">
              🚨 Emergency Aid
            </Link>
          </div>

          <div className="header-center">
            <nav className="desktop-nav">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={closeMobileMenu}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="header-right">
            {/* Language toggle */}
            <button
              className="language-toggle"
              onClick={toggleLanguage}
              aria-label={`Switch to ${currentLanguage === 'en' ? 'Bangla' : 'English'}`}
            >
              {currentLanguage === 'en' ? 'বাংলা' : 'EN'}
            </button>

            {/* User menu */}
            <div className="user-menu">
              <span className="user-name">{user?.name}</span>
              <button className="logout-btn" onClick={handleLogout}>
                {t('common.logout')}
              </button>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="mobile-menu-toggle"
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="hamburger"></span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile navigation */}
      {isMobileMenuOpen && (
        <nav className="mobile-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-nav-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
          <div className="mobile-nav-footer">
            <span className="user-name">{user?.name}</span>
            <button className="logout-btn" onClick={handleLogout}>
              {t('common.logout')}
            </button>
          </div>
        </nav>
      )}

      {/* Main content */}
      <main className="main-content">
        {children}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>Emergency Aid System</h4>
            <p>{t('home.description')}</p>
          </div>
          <div className="footer-section">
            <h4>{t('common.language')}</h4>
            <button className="language-toggle-footer" onClick={toggleLanguage}>
              {currentLanguage === 'en' ? 'বাংলা' : 'English'}
            </button>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <Link to="/resources">{t('navigation.resources')}</Link>
            <Link to="/panic">{t('navigation.panic')}</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 Emergency Aid System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout; 