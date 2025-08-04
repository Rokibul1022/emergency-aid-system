import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './EmergencyResourcesPage.css';

const EmergencyResourcesPage = () => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewLoadingId, setViewLoadingId] = useState(null);

  const resources = [
    {
      id: 1,
      title: 'First Aid Guide',
      category: 'firstAid',
      description: 'Comprehensive first aid procedures for common emergencies',
      icon: '🩹',
      type: 'PDF',
      size: '2.3 MB',
      downloadUrl: '/resources/first-aid-guide.pdf',
    },
    {
      id: 2,
      title: 'Emergency Evacuation Plan',
      category: 'evacuation',
      description: 'Step-by-step evacuation procedures for different scenarios',
      icon: '🚪',
      type: 'PDF',
      size: '1.8 MB',
      downloadUrl: '/resources/emergency-evacuation-plan.pdf',
    },
    {
      id: 3,
      title: 'Survival Guide',
      category: 'survival',
      description: 'Essential survival tips for emergency situations',
      icon: '🏕️',
      type: 'PDF',
      size: '3.1 MB',
      downloadUrl: '/resources/Survival%20Guide.pdf', // Fixed case and space
    },
    {
      id: 4,
      title: 'Emergency Contact List',
      category: 'contacts',
      description: 'Important emergency contact numbers and information',
      icon: '📞',
      type: 'PDF',
      size: '0.5 MB',
      downloadUrl: '/resources/emergency-contact-list.pdf',
    },
    {
      id: 5,
      title: 'Disaster Preparedness Checklist',
      category: 'survival',
      description: 'Complete checklist for emergency preparedness',
      icon: '✅',
      type: 'PDF',
      size: '1.2 MB',
      downloadUrl: '/resources/disaster-preparedness-checklist.pdf',
    },
    {
      id: 6,
      title: 'Medical Emergency Procedures',
      category: 'firstAid',
      description: 'Medical emergency response procedures',
      icon: '🏥',
      type: 'PDF',
      size: '2.7 MB',
      downloadUrl: '/resources/medical-emergency-procedures.pdf',
    },
  ];

  const categories = [
    { id: 'all', label: 'All Resources', icon: '📚' },
    { id: 'firstAid', label: t('resources.firstAid'), icon: '🩹' },
    { id: 'survival', label: t('resources.survival'), icon: '🏕️' },
    { id: 'evacuation', label: t('resources.evacuation'), icon: '🚪' },
    { id: 'contacts', label: t('resources.contacts'), icon: '📞' },
  ];

  const filteredResources = selectedCategory === 'all' 
    ? resources 
    : resources.filter(resource => resource.category === selectedCategory);

  const handleDownload = (resource) => {
    if (resource.downloadUrl && resource.downloadUrl !== '#') {
      const link = document.createElement('a');
      link.href = resource.downloadUrl;
      link.download = resource.title.replace(/\s+/g, '_') + '.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('Download not available.');
    }
  };

  const handleView = async (resource) => {
    if (!resource.downloadUrl || resource.downloadUrl === '#') {
      alert('View not available.');
      return;
    }
    setViewLoadingId(resource.id);
    try {
      const res = await fetch(resource.downloadUrl, { method: 'HEAD' });
      setViewLoadingId(null);
      if (res.ok) {
        window.open(resource.downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        alert('File not found. Please contact support.');
      }
    } catch (err) {
      setViewLoadingId(null);
      alert('Could not open file. Please check your connection.');
    }
  };

  return (
    <div className="resources-page">
      <div className="resources-header">
        <h1>{t('resources.title')}</h1>
        <p>Access emergency guides, first aid information, and survival resources</p>
      </div>

      {/* Category Filter */}
      <div className="category-filter">
        <div className="filter-buttons">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`filter-btn ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
              aria-label={`Show ${category.label}`}
            >
              <span className="filter-icon">{category.icon}</span>
              <span className="filter-label">{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Resources Grid */}
      <div className="resources-grid">
        {filteredResources.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', padding: 40 }}>
            No resources found for this category.
          </div>
        ) : filteredResources.map((resource) => (
          <div key={resource.id} className="resource-card">
            <div className="resource-header">
              <div className="resource-icon">{resource.icon}</div>
              <div className="resource-meta">
                <span className="resource-type">{resource.type}</span>
                <span className="resource-size">{resource.size}</span>
              </div>
            </div>
            <div className="resource-content">
              <h3 className="resource-title">{resource.title}</h3>
              <p className="resource-description">{resource.description}</p>
            </div>
            <div className="resource-actions">
              <button
                className="btn btn-primary"
                onClick={() => handleDownload(resource)}
                aria-label={`Download ${resource.title}`}
              >
                <span className="btn-icon">⬇️</span>
                {t('resources.download') || 'Download'}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => handleView(resource)}
                aria-label={`View ${resource.title}`}
                disabled={viewLoadingId === resource.id}
              >
                <span className="btn-icon">👁️</span>
                {viewLoadingId === resource.id ? 'Loading...' : (t('resources.view') || 'View')}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Tips Section */}
      <div className="quick-tips-section">
        <h2>💡 Quick Emergency Tips</h2>
        <div className="tips-grid">
          <div className="tip-card">
            <div className="tip-icon">🩹</div>
            <h3>First Aid Basics</h3>
            <ul>
              <li>Check for breathing and consciousness</li>
              <li>Apply direct pressure to stop bleeding</li>
              <li>Keep the person warm and comfortable</li>
              <li>Call emergency services immediately</li>
            </ul>
          </div>
          <div className="tip-card">
            <div className="tip-icon">🏠</div>
            <h3>Emergency Preparedness</h3>
            <ul>
              <li>Keep emergency supplies ready</li>
              <li>Have a family emergency plan</li>
              <li>Know your evacuation routes</li>
              <li>Stay informed about local alerts</li>
            </ul>
          </div>
          <div className="tip-card">
            <div className="tip-icon">📱</div>
            <h3>Communication</h3>
            <ul>
              <li>Keep your phone charged</li>
              <li>Have backup communication methods</li>
              <li>Share your location with trusted contacts</li>
              <li>Use emergency apps and services</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Emergency Numbers */}
      <div className="emergency-numbers">
        <h2>📞 Emergency Contact Numbers</h2>
        <div className="numbers-grid">
          {/* Police */}
          <div className="number-card">
            <div className="number-icon">🚔</div>
            <h3>Police</h3>
            <a href="tel:999" className="number" style={{ fontWeight: 700, fontSize: 20, color: '#3182ce', textDecoration: 'none' }}>999 (Emergency)</a>
            <p className="description">For immediate police assistance</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <a href="tel:999" className="btn btn-primary" style={{ fontSize: 12, padding: '4px 12px' }}>Call Now</a>
              <a href="sms:999" className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }}>SMS Now</a>
            </div>
          </div>
          {/* Ambulance */}
          <div className="number-card">
            <div className="number-icon">🚑</div>
            <h3>Ambulance</h3>
            <a href="tel:999" className="number" style={{ fontWeight: 700, fontSize: 20, color: '#3182ce', textDecoration: 'none' }}>999 (Emergency)</a>
            <p className="description">For medical emergencies</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <a href="tel:999" className="btn btn-primary" style={{ fontSize: 12, padding: '4px 12px' }}>Call Now</a>
              <a href="sms:999" className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }}>SMS Now</a>
            </div>
          </div>
          {/* Fire Department */}
          <div className="number-card">
            <div className="number-icon">🚒</div>
            <h3>Fire Department</h3>
            <a href="tel:999" className="number" style={{ fontWeight: 700, fontSize: 20, color: '#3182ce', textDecoration: 'none' }}>999 (Emergency)</a>
            <p className="description">For fire and rescue services</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <a href="tel:999" className="btn btn-primary" style={{ fontSize: 12, padding: '4px 12px' }}>Call Now</a>
              <a href="sms:999" className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }}>SMS Now</a>
            </div>
          </div>
          {/* Coast Guard */}
          <div className="number-card">
            <div className="number-icon">🌊</div>
            <h3>Coast Guard</h3>
            <a href="tel:999" className="number" style={{ fontWeight: 700, fontSize: 20, color: '#3182ce', textDecoration: 'none' }}>999 (Emergency)</a>
            <p className="description">For maritime emergencies</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <a href="tel:999" className="btn btn-primary" style={{ fontSize: 12, padding: '4px 12px' }}>Call Now</a>
              <a href="sms:999" className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }}>SMS Now</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyResourcesPage; 