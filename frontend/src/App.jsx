import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Pages
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/uam/UsersPage';
import RolesPage from './pages/uam/RolesPage';
import PermissionsPage from './pages/uam/PermissionsPage';
import OrganizationsPage from './pages/orgs/OrganizationsPage';
import CompaniesPage from './pages/orgs/CompaniesPage';
import DepartmentsPage from './pages/orgs/DepartmentsPage';
import OrgOverviewPage from './pages/orgs/OrgOverviewPage';
import LeadsPage from './pages/leads/LeadsPage';
import QuotationPage from './pages/quotations/QuotationPage';
import Unauthorized from './pages/Unauthorized';
import ClosedSalesPage from './pages/leads/ClosedSalesPage';
import PerformancePage from './pages/PerformancePage';
import DesignPage from './pages/design/DesignPage';
import MyProjectsPage from './pages/design/MyProjectsPage';
import CompletedModelsPage from './pages/design/CompletedModelsPage';
import AuditLogsPage from './pages/uam/AuditLogsPage';

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#0d1326',
              color: '#e2e8f0',
              border: '1px solid rgba(129,140,248,0.2)',
              borderRadius: '10px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.875rem'
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#0d1326' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0d1326' } }
          }}
        />

        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* UAM - Users */}
          <Route path="/uam/users" element={
            <ProtectedRoute module="uam" screen="users-list" action="canView">
              <UsersPage />
            </ProtectedRoute>
          } />

          {/* UAM - Roles */}
          <Route path="/uam/roles" element={
            <ProtectedRoute module="roles" screen="roles-list" action="canView">
              <RolesPage />
            </ProtectedRoute>
          } />

          {/* UAM - Permissions (for a specific role) */}
          <Route path="/uam/permissions" element={
            <ProtectedRoute module="permissions" screen="permissions-list" action="canView">
              <RolesPage />
            </ProtectedRoute>
          } />

          <Route path="/uam/permissions/:roleId" element={
            <ProtectedRoute module="permissions" screen="permissions-list" action="canView">
              <PermissionsPage />
            </ProtectedRoute>
          } />

          {/* Organizations - Super Admin Only */}
          <Route path="/organizations" element={
            <ProtectedRoute superAdminOnly={true}>
              <OrganizationsPage />
            </ProtectedRoute>
          } />

          {/* Audit Logs */}
          <Route path="/audit-logs" element={
            <ProtectedRoute module="uam" screen="audit-logs-list" action="canView">
              <AuditLogsPage />
            </ProtectedRoute>
          } />

          {/* Companies */}
          <Route path="/companies" element={
            <ProtectedRoute module="companies" screen="companies-list" action="canView">
              <CompaniesPage />
            </ProtectedRoute>
          } />

          {/* Departments */}
          <Route path="/departments" element={
            <ProtectedRoute module="departments" screen="departments-list" action="canView">
              <DepartmentsPage />
            </ProtectedRoute>
          } />

          {/* Org Overview */}
          <Route path="/org-overview" element={
            <ProtectedRoute module="dashboard" screen="org-overview" action="canView">
              <OrgOverviewPage />
            </ProtectedRoute>
          } />

          {/* Leads */}
          <Route path="/leads" element={
            <ProtectedRoute module="leads" screen="leads-list" action="canView">
              <LeadsPage />
            </ProtectedRoute>
          } />

          {/* Quotation */}
          <Route path="/quotation" element={
            <ProtectedRoute module="quotations" screen="quotations-list" action="canView">
              <QuotationPage />
            </ProtectedRoute>
          } />

          {/* Performance */}
          <Route path="/performance" element={
            <ProtectedRoute module="performance" screen="performance-view" action="canView">
              <PerformancePage />
            </ProtectedRoute>
          } />

          {/* Closed Sales */}
          <Route path="/closed-sales" element={
            <ProtectedRoute module="closed_sales" screen="closed-sales-list" action="canView">
              <ClosedSalesPage />
            </ProtectedRoute>
          } />

          {/* Design Orders */}
          <Route path="/design" element={
            <ProtectedRoute module="design" screen="design-list" action="canView">
              <DesignPage />
            </ProtectedRoute>
          } />

          {/* My Projects */}
          <Route path="/my-projects" element={
            <ProtectedRoute module="design" screen="my-projects-list" action="canView">
              <MyProjectsPage />
            </ProtectedRoute>
          } />

          {/* Completed Design Models */}
          <Route path="/completed-models" element={
            <ProtectedRoute module="design" screen="completed-models-list" action="canView">
              <CompletedModelsPage />
            </ProtectedRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
