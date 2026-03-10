import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';

// Auth pages
import { LoginPage } from './pages/auth/Login';
import { RegisterPage } from './pages/auth/Register';
import { VerifyEmailPage } from './pages/auth/VerifyEmail';
import { ForgotPasswordPage } from './pages/auth/ForgotPassword';
import { ResetPasswordPage } from './pages/auth/ResetPassword';

// Main pages
import { HomePage } from './pages/Home';
import { JobsPage } from './pages/jobs/JobsPage';
import { JobDetailPage } from './pages/jobs/JobDetailPage';
import { CreateJobPage } from './pages/jobs/CreateJobPage';
import { MyJobsPage } from './pages/jobs/MyJobsPage';
import { EditJobPage } from './pages/jobs/EditJobPage';
import { MyBidsPage } from './pages/bids/MyBidsPage';
import { ProvidersPage } from './pages/profile/ProvidersPage';
import { ProviderProfilePage } from './pages/profile/ProviderProfilePage';
import { MyProfilePage } from './pages/profile/MyProfilePage';
import { CreateProfilePage } from './pages/profile/CreateProfilePage';
import { ServicesPage } from './pages/services/ServicesPage';
import { ConversationsPage } from './pages/conversations/ConversationsPage';

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-7xl font-bold text-gray-200">404</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 text-gray-500">The page you're looking for doesn't exist.</p>
      <a href="/" className="mt-6 text-violet-600 hover:underline font-medium">Go back home →</a>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Auth routes (no layout) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Main app with layout */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/providers" element={<ProvidersPage />} />
        <Route path="/providers/:userId" element={<ProviderProfilePage />} />

        {/* Client protected routes */}
        <Route element={<ProtectedRoute roles={['client']} />}>
          <Route path="/jobs/create" element={<CreateJobPage />} />
          <Route path="/jobs/my" element={<MyJobsPage />} />
          <Route path="/jobs/:id/edit" element={<EditJobPage />} />
        </Route>

        {/* Provider protected routes */}
        <Route element={<ProtectedRoute roles={['provider']} />}>
          <Route path="/bids/my" element={<MyBidsPage />} />
          <Route path="/profile/me" element={<MyProfilePage />} />
          <Route path="/profile/create" element={<CreateProfilePage />} />
        </Route>

        {/* Authenticated routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/conversations" element={<ConversationsPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
