import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import './AuthPages.css';

const LoginPage = () => {
  const { t } = useTranslation();
  const { login, loginWithGoogle } = useAuth();
  const { addNotification } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        addNotification('Login successful!', 'success');
        navigate(from, { replace: true });
      } else {
        addNotification(result.error || 'Login failed', 'error');
      }
    } catch (error) {
      addNotification(error.message || 'An error occurred during login', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    
    try {
      const result = await loginWithGoogle();
      
      if (result.success) {
        addNotification('Google login successful!', 'success');
        navigate(from, { replace: true });
      } else {
        addNotification(result.error || 'Google login failed', 'error');
      }
    } catch (error) {
      addNotification(error.message || 'An error occurred during Google login', 'error');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>{t('auth.login')}</h1>
            <p>Welcome back to Emergency Aid System</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">{t('auth.email')}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'error' : ''}
                placeholder="Enter your email"
                required
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">{t('auth.password')}</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
                placeholder="Enter your password"
                required
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : t('auth.login')}
              </button>
            </div>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <div className="social-login">
            <button
              type="button"
              className="btn btn-social btn-google"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
            >
              <span className="social-icon">🔍</span>
              {isGoogleLoading ? 'Signing in...' : t('auth.loginWithGoogle')}
            </button>
          </div>

          <div className="auth-footer">
            <p>
              {t('auth.dontHaveAccount')}{' '}
              <Link to="/signup" className="auth-link">
                {t('auth.signUpHere')}
              </Link>
            </p>
            <Link to="/forgot-password" className="auth-link">
              {t('auth.forgotPassword')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 