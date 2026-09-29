import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import UploadPage from "@/pages/UploadPage";
import ReviewApprovePage from "@/pages/ReviewApprovePage";
import AuditExportPage from "@/pages/AuditExportPage";
import GovernanceConsolePage from "@/pages/GovernanceConsolePage";
import ManagerDashboardPage from "@/pages/ManagerDashboardPage";
import type { PersonaId } from "@/lib/mockData";

// Which persona "owns" each route in this prototype. The PersonaSwitcher
// in the header lets you jump between personas; each destination route
// below picks a sensible default persona for that screen. Wire this to
// real auth/session state once this leaves the prototype stage.
function routePersona(pathname: string): PersonaId {
  if (pathname.startsWith("/governance")) return "priya";
  if (pathname.startsWith("/dashboard")) return "daniel";
  return "maya";
}

function AppRoutes() {
  const location = useLocation();
  const persona = routePersona(location.pathname);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/upload" replace />} />
      <Route path="/upload" element={<UploadPage activePersona={persona} />} />
      <Route path="/review" element={<ReviewApprovePage activePersona={persona} />} />
      <Route path="/audit" element={<AuditExportPage activePersona={persona} />} />
      <Route path="/governance" element={<GovernanceConsolePage activePersona={persona} />} />
      <Route path="/dashboard" element={<ManagerDashboardPage activePersona={persona} />} />
      <Route path="*" element={<Navigate to="/upload" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
