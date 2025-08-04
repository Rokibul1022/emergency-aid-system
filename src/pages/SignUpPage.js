import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import './AuthPages.css';

const SignUpPage = () => {
  const { t } = useTranslation();
  const { signup, loginWithGoogle } = useAuth();
  const { addNotification } = useApp();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'requester',
    phone: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

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

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.phone) {
      const cleanPhone = formData.phone.replace(/\s/g, '');
      // Bangladeshi phone number validation: 11 digits starting with 01[3-9]
      const bangladeshiPhoneRegex = /^01[3-9]\d{8}$/;
      // Also allow international format with +880
      const internationalRegex = /^\+8801[3-9]\d{8}$/;
      
      if (!bangladeshiPhoneRegex.test(cleanPhone) && !internationalRegex.test(cleanPhone)) {
        newErrors.phone = 'Please enter a valid Bangladeshi phone number (e.g., 01712345678 or +8801712345678)';
      }
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
      const result = await signup(formData.email, formData.password, formData.name, formData.role, formData.phone);
      
      if (result.success) {
        addNotification('Account created successfully!', 'success');
        navigate('/dashboard');
      } else {
        addNotification(result.error || 'Signup failed', 'error');
      }
    } catch (error) {
      addNotification(error.message || 'An error occurred during signup', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    
    try {
      const result = await loginWithGoogle(formData.role);
      
      if (result.success) {
        addNotification('Google signup successful!', 'success');
        navigate('/dashboard');
      } else {
        addNotification(result.error || 'Google signup failed', 'error');
      }
    } catch (error) {
      addNotification(error.message || 'An error occurred during Google signup', 'error');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>{t('auth.signup')}</h1>
            <p>Create your Emergency Aid System account</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'error' : ''}
                placeholder="Enter your full name"
                required
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

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
              <label htmlFor="phone">Phone Number (Optional)</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={errors.phone ? 'error' : ''}
                placeholder="Enter your phone number"
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="role">{t('auth.role')}</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="role-select"
              >
                <option value="requester">{t('auth.requester')}</option>
                <option value="volunteer">{t('auth.volunteer')}</option>
                <option value="admin">{t('auth.admin')}</option>
              </select>
              <small className="role-description">
                {formData.role === 'requester' && 'Submit emergency requests and track their status'}
                {formData.role === 'volunteer' && 'Help others by responding to emergency requests'}
                {formData.role === 'admin' && 'Manage the system and oversee operations'}
              </small>
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
                placeholder="Create a password"
                required
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? 'error' : ''}
                placeholder="Confirm your password"
                required
              />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : t('auth.signup')}
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
              onClick={handleGoogleSignup}
              disabled={isGoogleLoading}
            >
              <span className="social-icon">🔍</span>
              {isGoogleLoading ? 'Signing up...' : 'Sign up with Google'}
            </button>
          </div>

          <div className="auth-footer">
            <p>
              {t('auth.alreadyHaveAccount')}{' '}
              <Link to="/login" className="auth-link">
                {t('auth.loginHere')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage; 
