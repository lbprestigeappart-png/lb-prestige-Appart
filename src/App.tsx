import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import ClientSpace from "./pages/ClientSpace.tsx";
import AvisMerci from "./pages/AvisMerci.tsx";
import AdminLayout from "./components/admin/AdminLayout.tsx";
import Dashboard from "./pages/admin/Dashboard.tsx";
import Clients from "./pages/admin/Clients.tsx";
import Reservations from "./pages/admin/Reservations.tsx";
import Messages from "./pages/admin/Messages.tsx";
import Whatsapp from "./pages/admin/Whatsapp.tsx";
import Templates from "./pages/admin/Templates.tsx";
import Automations from "./pages/admin/Automations.tsx";
import Reviews from "./pages/admin/Reviews.tsx";
import Payments from "./pages/admin/Payments.tsx";
import Access from "./pages/admin/Access.tsx";
import Wifi from "./pages/admin/Wifi.tsx";
import Kitchen from "./pages/admin/Kitchen.tsx";
import Parking from "./pages/admin/Parking.tsx";
import Rules from "./pages/admin/Rules.tsx";
import Contacts from "./pages/admin/Contacts.tsx";
import Documents from "./pages/admin/Documents.tsx";
import Banner from "./pages/admin/Banner.tsx";
import Notifications from "./pages/admin/Notifications.tsx";
import SettingsPage from "./pages/admin/Settings.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/client/:token" element={<ClientSpace />} />
            <Route path="/avis/merci" element={<AvisMerci />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="reservations" element={<Reservations />} />
              <Route path="messages" element={<Messages />} />
              <Route path="whatsapp" element={<Whatsapp />} />
              <Route path="templates" element={<Templates />} />
              <Route path="automations" element={<Automations />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="payments" element={<Payments />} />
              <Route path="access" element={<Access />} />
              <Route path="wifi" element={<Wifi />} />
              <Route path="kitchen" element={<Kitchen />} />
              <Route path="parking" element={<Parking />} />
              <Route path="rules" element={<Rules />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="documents" element={<Documents />} />
              <Route path="banner" element={<Banner />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
