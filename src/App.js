import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './i18n';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/UI/LoadingSpinner';
import NotificationContainer from './components/UI/NotificationContainer';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleBasedRoute from './routes/RoleBasedRoute';
const HomePage = React.lazy(() => import('./pages/HomePage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const SignUpPage = React.lazy(() => import('./pages/SignUpPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const RequestFormPage = React.lazy(() => import('./pages/RequestFormPage'));
const VolunteerViewPage = React.lazy(() => import('./pages/VolunteerViewPage'));
const SheltersPage = React.lazy(() => import('./pages/SheltersPage'));
const DonationBoardPage = React.lazy(() => import('./pages/DonationBoardPage'));
const ChatPage = React.lazy(() => import('./pages/ChatPage'));
const AdminPanelPage = React.lazy(() => import('./pages/AdminPanelPage'));
const EmergencyResourcesPage = React.lazy(() => import('./pages/EmergencyResourcesPage'));
const PanicButtonPage = React.lazy(() => import('./pages/PanicButtonPage'));
const ActiveVolunteersPage = React.lazy(() => import('./pages/ActiveVolunteersPage'));
const RequestsHelpedPage = React.lazy(() => import('./pages/RequestsHelpedPage'));
const EmergencySheltersPage = React.lazy(() => import('./pages/EmergencySheltersPage'));
const SupportPage = React.lazy(() => import('./pages/SupportPage'));
const MyRequestsPage = React.lazy(() => import('./pages/MyRequestsPage'));

function App() {
  const { t } = useTranslation();

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  return (
    <AuthProvider>
      <AppProvider>
        <LanguageProvider>
          <Router>
            <div className="App">
              {/* Skip link for accessibility */}
              <a href="#main-content" className="skip-link">
                {t('common.skipToMain')}
              </a>

              {/* Notification container for global notifications */}
              <NotificationContainer />

              {/* Main application content */}
              <main id="main-content">
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignUpPage />} />
                    <Route path="/resources" element={<EmergencyResourcesPage />} />
                    <Route path="/panic" element={<PanicButtonPage />} />
                    <Route path="/active-volunteers" element={<ActiveVolunteersPage />} />
                    <Route path="/requests-helped" element={<RequestsHelpedPage />} />
                    <Route path="/emergency-shelters" element={<EmergencySheltersPage />} />
                    <Route path="/support" element={<SupportPage />} />

                    {/* Protected routes with layout */}
                    <Route
                      path="/my-requests"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <MyRequestsPage />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <DashboardPage />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/request"
                      element={
                        <RoleBasedRoute allowedRoles={['requester']}>
                          <Layout>
                            <RequestFormPage />
                          </Layout>
                        </RoleBasedRoute>
                      }
                    />
                    <Route
                      path="/volunteer"
                      element={
                        <RoleBasedRoute allowedRoles={['volunteer']}>
                          <Layout>
                            <VolunteerViewPage />
                          </Layout>
                        </RoleBasedRoute>
                      }
                    />
                    <Route
                      path="/shelters"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <SheltersPage />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/donations"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <DonationBoardPage />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/chat"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <ChatPage />
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <RoleBasedRoute allowedRoles={['admin']}>
                          <Layout>
                            <AdminPanelPage />
                          </Layout>
                        </RoleBasedRoute>
                      }
                    />
                    {/* Catch all route - redirect to home */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </main>
            </div>
          </Router>
        </LanguageProvider>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
