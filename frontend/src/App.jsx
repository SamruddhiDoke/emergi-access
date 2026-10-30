import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import PublicLayout from './layouts/PublicLayout';
import AppShell from './layouts/AppShell';
import { ProtectedRoute, SplashScreen } from './routes/ProtectedRoute';
import { PageSkeleton } from './components/ui/Feedback';

import Landing from './pages/Landing';
import { About, HowItWorks, Security, NotFound } from './pages/PublicPages';
import PatientLogin from './features/auth/PatientLogin';
import ProfessionalLogin from './features/auth/ProfessionalLogin';
import PatientRegister from './features/auth/PatientRegister';
import ProfessionalRegister from './features/auth/ProfessionalRegister';

const PatientDashboard = lazy(() => import('./features/patient/PatientDashboard'));
const MedicalProfile = lazy(() => import('./features/patient/MedicalProfile'));
const EditMedical = lazy(() => import('./features/patient/EditMedical'));
const QrCardPage = lazy(() => import('./features/patient/QrCardPage'));
const Contacts = lazy(() => import('./features/patient/Contacts'));
const PatientAccessHistory = lazy(() => import('./features/patient/AccessHistory'));
const PatientAuthorizations = lazy(() => import('./features/patient/Authorizations'));
const PatientSettings = lazy(() => import('./features/patient/AccountSettings'));

const ProDashboard = lazy(() => import('./features/professional/ProDashboard'));
const ProHistory = lazy(() => import('./features/professional/ProHistory'));
const Scanner = lazy(() => import('./features/emergency/ScannerPage'));
const AccessRequest = lazy(() => import('./features/emergency/AccessRequest'));
const ActiveAccess = lazy(() => import('./features/emergency/ActiveAccess'));

const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard'));
const AdminPatients = lazy(() => import('./features/admin/AdminPatients'));
const AdminProfessionals = lazy(() => import('./features/admin/AdminProfessionals'));
const AdminAuthorizations = lazy(() => import('./features/admin/AdminAuthorizations'));
const AuditLogs = lazy(() => import('./features/admin/AuditLogs'));
const Suspicious = lazy(() => import('./features/admin/Suspicious'));
const Analytics = lazy(() => import('./features/admin/Analytics'));
const AdminSettings = lazy(() => import('./features/admin/AdminSettings'));

const page = (el) => <Suspense fallback={<PageSkeleton />}>{el}</Suspense>;

export default function App() {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
    <Suspense fallback={<SplashScreen />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route path="about" element={<About />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="security" element={<Security />} />
        </Route>

        <Route path="login" element={<PatientLogin />} />
        <Route path="register" element={<PatientRegister />} />
        <Route path="pro/login" element={<ProfessionalLogin />} />
        <Route path="pro/register" element={<ProfessionalRegister />} />

        <Route element={<ProtectedRoute roles={['PATIENT']} />}>
          <Route path="patient" element={<AppShell />}>
            <Route index element={page(<PatientDashboard />)} />
            <Route path="profile" element={page(<MedicalProfile />)} />
            <Route path="profile/edit" element={page(<EditMedical />)} />
            <Route path="qr" element={page(<QrCardPage />)} />
            <Route path="contacts" element={page(<Contacts />)} />
            <Route path="access-history" element={page(<PatientAccessHistory />)} />
            <Route path="authorizations" element={page(<PatientAuthorizations />)} />
            <Route path="settings" element={page(<PatientSettings />)} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['PARAMEDIC', 'DOCTOR', 'SPECIALIST']} />}>
          <Route path="pro" element={<AppShell />}>
            <Route index element={page(<ProDashboard />)} />
            <Route path="scan" element={page(<Scanner />)} />
            <Route path="access/new" element={page(<AccessRequest />)} />
            <Route path="access/:id" element={page(<ActiveAccess />)} />
            <Route path="history" element={page(<ProHistory />)} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['ADMIN']} />}>
          <Route path="admin" element={<AppShell />}>
            <Route index element={page(<AdminDashboard />)} />
            <Route path="patients" element={page(<AdminPatients />)} />
            <Route path="professionals" element={page(<AdminProfessionals />)} />
            <Route path="verification" element={page(<AdminProfessionals verificationQueue />)} />
            <Route path="requests" element={page(<AdminAuthorizations mode="requests" />)} />
            <Route path="authorizations" element={page(<AdminAuthorizations mode="active" />)} />
            <Route path="audit" element={page(<AuditLogs />)} />
            <Route path="security" element={page(<Suspicious />)} />
            <Route path="analytics" element={page(<Analytics />)} />
            <Route path="settings" element={page(<AdminSettings />)} />
          </Route>
        </Route>

        <Route element={<PublicLayout />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}
