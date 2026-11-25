import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppStoreProvider } from './store/AppStore';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { InventoryList } from './pages/inventory/InventoryList';
import { UserAssignmentDetail, UserAssignments } from './pages/Assignments';
import { MaintenancePage } from './pages/Maintenance';
import { SettingsPage } from './pages/settings/SettingsPage';
import { settingConfigs } from './pages/settings/settingsConfig';
import { PageBody, PageHeader } from './components/layout/PageHeader';
import { EmptyState } from './components/ui/EmptyState';
import { CompassIcon } from 'lucide-react';

export function App() {
  return (
    <AppStoreProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="assets/:id?" element={<InventoryList kind="asset" />} />
            <Route path="licenses/:id?" element={<InventoryList kind="license" />} />
            <Route path="components/:id?" element={<InventoryList kind="component" />} />
            <Route path="accessories/:id?" element={<InventoryList kind="accessory" />} />
            <Route path="assignments" element={<UserAssignments />} />
            <Route path="assignments/:userId" element={<UserAssignmentDetail />} />
            <Route path="my-assignments" element={<UserAssignmentDetail self />} />
            <Route path="maintenance" element={<MaintenancePage />} />
            <Route path="settings" element={<Navigate to="/settings/companies" replace />} />
            {settingConfigs.map((c) =>
            <Route key={c.route} path={`settings/${c.route}`} element={<SettingsPage config={c} />} />
            )}
            <Route
              path="*"
              element={
              <>
                  <PageHeader title="Page not found" backTo="/dashboard" backLabel="Dashboard" />
                  <PageBody><EmptyState icon={CompassIcon} title="There is nothing at this address" description="Use the menu to find what you were looking for." /></PageBody>
                </>
              } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppStoreProvider>);

}
