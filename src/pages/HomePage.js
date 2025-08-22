import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import './HomePage.css';


// ======================
// Strategy Pattern Classes
// ======================
class AccessStrategy {
  canAccess({ isAuthenticated, role }, feature) {
    return true;
  }
}


class PublicStrategy extends AccessStrategy {
  canAccess({ isAuthenticated, role }, feature) {
    return true;
  }
}


class AuthRequiredStrategy extends AccessStrategy {
  canAccess({ isAuthenticated }) {
    return isAuthenticated;
  }
}


class RoleBasedStrategy extends AccessStrategy {
  canAccess({ isAuthenticated, role }, feature) {
    return isAuthenticated && role === feature.requiredRole;
  }
}


// ======================
// HomePage Component
// ======================
const HomePage = () => {
  const { t } = useTranslation();
  const { isAuthenticated, userData } = useAuth();
  const { currentLanguage } = useLanguage();
  const navigate = useNavigate();


  // Features now use Strategy instead of requiresAuth/requiredRole checks
  const features = [
    {
      icon: '📝',
      title: t('home.features.request'),
      description: 'Submit emergency requests with location tracking and real-time updates',
      link: '/request',
      requiredRole: 'requester',
      accessStrategy: new RoleBasedStrategy()
    },
    {
      icon: '🤝',
      title: t('home.features.volunteer'),
      description: 'Help those in need by responding to nearby emergency requests',
      link: '/volunteer',
      requiredRole: 'volunteer',
      accessStrategy: new RoleBasedStrategy()
    },
    {
      icon: '📊',
      title: t('home.features.track'),
      description: 'Monitor the status of your requests from submission to resolution',
      link: '/dashboard',
      accessStrategy: new AuthRequiredStrategy()
    },
    {
      icon: '💬',
      title: t('home.features.chat'),
      description: 'Communicate directly with volunteers and requesters in real-time',
      link: '/chat',
      accessStrategy: new AuthRequiredStrategy()
    },
    {
      icon: '🗺️',
      title: t('home.features.map'),
      description: 'Find nearby shelters, volunteers, and emergency resources',
      link: '/shelters',
      accessStrategy: new AuthRequiredStrategy()
    },
    {
      icon: '📚',
      title: t('home.features.resources'),
      description: 'Access emergency guides, first aid information, and survival tips',
      link: '/resources',
      accessStrategy: new PublicStrategy()
    },
  ];


  const stats = [
    { number: '1000+', label: 'Requests Helped', link: '/requests-helped' },
    { number: '500+', label: 'Active Volunteers', link: '/active-volunteers' },
    { number: '50+', label: 'Emergency Shelters', link: '/emergency-shelters' },
    { number: '24/7', label: 'Support Available', link: '/support' },
  ];


  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">{t('home.title')}</h1>
            <p className="hero-subtitle">{t('home.subtitle')}</p>
            <p className="hero-description">{t('home.description')}</p>
           
            <div className="hero-actions">
              {!isAuthenticated ? (
                <>
                  <Link to="/signup" className="btn btn-primary">
                    {t('home.getStarted')}
                  </Link>
                  <Link to="/login" className="btn btn-secondary">
                    {t('auth.login')}
                  </Link>
                </>
              ) : (
                <Link to="/dashboard" className="btn btn-primary">
                  {t('navigation.dashboard')}
                </Link>
              )}
            </div>
          </div>
         
          <div className="hero-visual">
            <div className="hero-image">
              <div className="emergency-icon">🚨</div>
              <div className="connection-lines">
                <div className="line line-1"></div>
                <div className="line line-2"></div>
                <div className="line line-3"></div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2>{t('home.features.title')}</h2>
            <p>Comprehensive emergency response platform designed for everyone</p>
          </div>
         
          <div className="features-grid">
            {features.map((feature, index) => {
              const canAccess = feature.accessStrategy.canAccess(
                { isAuthenticated, role: userData?.role },
                feature
              );


              const handleFeatureClick = () => {
                if (!canAccess) {
                  if (!isAuthenticated) {
                    navigate('/login');
                  } else if (feature.requiredRole && userData?.role !== feature.requiredRole) {
                    alert(`This feature is only available for ${feature.requiredRole}s.`);
                  }
                  return;
                }
                navigate(feature.link);
              };


              return (
                <div
                  key={index}
                  className={`feature-card ${canAccess ? 'clickable' : 'disabled'}`}
                  onClick={handleFeatureClick}
                  style={{
                    cursor: canAccess ? 'pointer' : 'not-allowed',
                    opacity: canAccess ? 1 : 0.6,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div className="feature-icon">{feature.icon}</div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-description">{feature.description}</p>
                  {!canAccess && (
                    <div className="feature-lock" style={{
                      fontSize: '12px',
                      color: '#666',
                      marginTop: '8px',
                      fontStyle: 'italic'
                    }}>
                      {!isAuthenticated ? 'Login required' : `Only for ${feature.requiredRole || 'authorized users'}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>


      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-header">
            <h2 style={{
              color: '#fff',
              textAlign: 'center',
              marginBottom: '16px',
              fontSize: '2.5rem',
              fontWeight: '700',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              Our Impact
            </h2>
            <p style={{
              color: '#e2e8f0',
              textAlign: 'center',
              fontSize: '1.1rem',
              marginBottom: '40px',
              maxWidth: '600px',
              margin: '0 auto 40px auto'
            }}>
              Real-time statistics showing our community's dedication to helping those in need
            </p>
          </div>
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="stat-item"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '32px 24px',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: 1
                }}
                onClick={() => navigate(stat.link)}
                onMouseEnter={(e) => {
                  const card = e.currentTarget;
                  card.style.transform = 'translateY(-8px)';
                  card.style.background = 'rgba(255, 255, 255, 0.15)';
                  card.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  const card = e.currentTarget;
                  card.style.transform = 'translateY(0)';
                  card.style.background = 'rgba(255, 255, 255, 0.1)';
                  card.style.boxShadow = 'none';
                }}
                tabIndex={0}
                role="button"
                aria-label={`Click to view ${stat.label}: ${stat.number}`}
              >
                <div className="stat-number" style={{
                  fontSize: '3.5rem',
                  fontWeight: '800',
                  marginBottom: '12px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {stat.number}
                </div>
                <div className="stat-label" style={{
                  fontSize: '1.1rem',
                  color: '#e2e8f0',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  {stat.label}
                </div>
                <div style={{
                  width: '40px',
                  height: '3px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  margin: '16px auto 0 auto',
                  borderRadius: '2px'
                }}></div>
              </div>
            ))}
          </div>
          <div className="stats-footer" style={{
            textAlign: 'center',
            marginTop: '48px',
            padding: '24px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <p style={{
              color: '#cbd5e0',
              fontSize: '1rem',
              marginBottom: '16px'
            }}>
              These numbers represent real people helped and lives saved through our platform
            </p>
            <div style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Link
                to="/signup"
                style={{
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '0.9rem',
                  textDecoration: 'none'
                }}
              >
                Join Our Mission
              </Link>
              <Link
                to="/resources"
                style={{
                  background: 'transparent',
                  color: '#e2e8f0',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '0.9rem',
                  textDecoration: 'none'
                }}
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to help or need assistance?</h2>
            <p>Join our community of volunteers and requesters today</p>
           
            <div className="cta-actions">
              <Link to="/signup" className="btn btn-primary btn-large">
                Join Now
              </Link>
              <Link to="/resources" className="btn btn-outline btn-large">
                {t('navigation.resources')}
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* Emergency Quick Access */}
      <section className="emergency-section">
        <div className="container">
          <div className="emergency-content">
            <h2>🚨 Emergency Quick Access</h2>
            <div className="emergency-actions">
              <Link to="/panic" className="emergency-btn panic-btn">
                <span className="btn-icon">🚨</span>
                <span className="btn-text">Panic Button</span>
              </Link>
              <Link to="/resources" className="emergency-btn resource-btn">
                <span className="btn-icon">📚</span>
                <span className="btn-text">Emergency Resources</span>
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* Language Toggle */}
      <div className="language-toggle-fixed">
        <button
          className="language-btn"
          onClick={() => window.location.reload()}
          title={`Current: ${currentLanguage === 'en' ? 'English' : 'বাংলা'}`}
        >
          {currentLanguage === 'en' ? 'বাংলা' : 'EN'}
        </button>
      </div>
    </div>
  );
};


export default HomePage;



