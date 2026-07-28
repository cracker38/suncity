import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PublicLayout from './components/PublicLayout';
import DashboardLayout from './components/DashboardLayout';
import { useAuth } from './lib/authStore';
import { ROLE_DASHBOARDS } from './lib/roleDashboards';

import Home from './pages/Home';
import About from './pages/About';
import Rooms from './pages/Rooms';
import RoomDetail from './pages/RoomDetail';
import Restaurant from './pages/Restaurant';
import Events from './pages/Events';
import Catering from './pages/Catering';
import Gallery from './pages/Gallery';
import Offers from './pages/Offers';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Contact from './pages/Contact';
import Book from './pages/Book';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

import {
  CustomerAssistant,
  CustomerBookings,
  CustomerFavorites,
  CustomerHome,
  CustomerInvoices,
  CustomerNotifications,
  CustomerPayments,
  CustomerProfile,
  CustomerReviews,
} from './pages/dashboards/CustomerPages';

import {
  ReceptionCheckIn,
  ReceptionGuests,
  ReceptionInvoices,
  ReceptionNotifications,
  ReceptionOccupancy,
  ReceptionOverview,
  ReceptionReservations,
  ReceptionRooms,
  ReceptionWalkIn,
} from './pages/dashboards/ReceptionDash';

import {
  RestaurantFeedback,
  RestaurantInventory,
  RestaurantMenu,
  RestaurantOrders,
  RestaurantOverview,
  RestaurantPromotions,
  RestaurantReports,
  RestaurantReservations,
  RestaurantSales,
} from './pages/dashboards/RestaurantDash';

import {
  EventsBookings,
  EventsCalendar,
  EventsConference,
  EventsCorporate,
  EventsEquipment,
  EventsHalls,
  EventsOverview,
  EventsPackages,
  EventsReports,
  EventsWeddings,
} from './pages/dashboards/EventsDash';

import {
  OpsCatering,
  OpsCleaning,
  OpsInspection,
  OpsLaundry,
  OpsLostFound,
  OpsMaintenance,
  OpsOverview,
  OpsQuotations,
  OpsReadiness,
  OpsReports,
  OpsStaff,
} from './pages/dashboards/OpsDash';

import {
  FinanceExpenses,
  FinanceExport,
  FinanceInvoices,
  FinanceOverview,
  FinancePayments,
  FinanceRefunds,
  FinanceReports,
  FinanceRevenue,
} from './pages/dashboards/FinanceDash';

import {
  AdminAi,
  AdminAudit,
  AdminBackups,
  AdminBookings,
  AdminCatering,
  AdminCms,
  AdminEvents,
  AdminFinance,
  AdminGallery,
  AdminHousekeeping,
  AdminOffers,
  AdminOverview,
  AdminReports,
  AdminRestaurant,
  AdminRoles,
  AdminRooms,
  AdminSecurity,
  AdminSettings,
  AdminSystem,
  AdminUsers,
} from './pages/dashboards/AdminDash';

import { AgentRequestsInbox } from './pages/dashboards/AgentRequests';

import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

function RoleLayout({ roleKey, accent }) {
  const cfg = ROLE_DASHBOARDS[roleKey];
  return (
    <DashboardLayout
      title={cfg.title}
      subtitle={cfg.subtitle}
      links={cfg.links}
      roles={[roleKey]}
      accent={accent}
    />
  );
}

function AppRoutes() {
  const refreshMe = useAuth((s) => s.refreshMe);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="rooms" element={<Rooms />} />
        <Route path="rooms/:slug" element={<RoomDetail />} />
        <Route path="restaurant" element={<Restaurant />} />
        <Route path="events" element={<Events />} />
        <Route path="catering" element={<Catering />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="offers" element={<Offers />} />
        <Route path="blog" element={<Blog />} />
        <Route path="blog/:slug" element={<BlogPost />} />
        <Route path="contact" element={<Contact />} />
        <Route path="book" element={<Book />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* 1. Customer Dashboard */}
      <Route path="/dashboard" element={<RoleLayout roleKey="customer" accent="customer" />}>
        <Route index element={<CustomerHome />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route path="bookings" element={<CustomerBookings />} />
        <Route path="invoices" element={<CustomerInvoices />} />
        <Route path="payments" element={<CustomerPayments />} />
        <Route path="reviews" element={<CustomerReviews />} />
        <Route path="favorites" element={<CustomerFavorites />} />
        <Route path="notifications" element={<CustomerNotifications />} />
        <Route path="assistant" element={<CustomerAssistant />} />
      </Route>

      {/* 2. Reception Dashboard */}
      <Route path="/reception" element={<RoleLayout roleKey="receptionist" accent="reception" />}>
        <Route index element={<ReceptionOverview />} />
        <Route path="reservations" element={<ReceptionReservations />} />
        <Route path="checkin" element={<ReceptionCheckIn />} />
        <Route path="rooms" element={<ReceptionRooms />} />
        <Route path="walkin" element={<ReceptionWalkIn />} />
        <Route path="guests" element={<ReceptionGuests />} />
        <Route path="invoices" element={<ReceptionInvoices />} />
        <Route path="occupancy" element={<ReceptionOccupancy />} />
        <Route path="agent-requests" element={<AgentRequestsInbox basePath="/reception" />} />
        <Route path="notifications" element={<ReceptionNotifications />} />
      </Route>

      {/* 3. Restaurant Manager Dashboard */}
      <Route path="/restaurant-desk" element={<RoleLayout roleKey="restaurant_manager" accent="restaurant" />}>
        <Route index element={<RestaurantOverview />} />
        <Route path="menu" element={<RestaurantMenu />} />
        <Route path="reservations" element={<RestaurantReservations />} />
        <Route path="orders" element={<RestaurantOrders />} />
        <Route path="inventory" element={<RestaurantInventory />} />
        <Route path="sales" element={<RestaurantSales />} />
        <Route path="reports" element={<RestaurantReports />} />
        <Route path="promotions" element={<RestaurantPromotions />} />
        <Route path="feedback" element={<RestaurantFeedback />} />
      </Route>

      {/* 4. Events Manager Dashboard */}
      <Route path="/events-desk" element={<RoleLayout roleKey="events_manager" accent="events" />}>
        <Route index element={<EventsOverview />} />
        <Route path="bookings" element={<EventsBookings />} />
        <Route path="conference" element={<EventsConference />} />
        <Route path="weddings" element={<EventsWeddings />} />
        <Route path="corporate" element={<EventsCorporate />} />
        <Route path="halls" element={<EventsHalls />} />
        <Route path="equipment" element={<EventsEquipment />} />
        <Route path="packages" element={<EventsPackages />} />
        <Route path="calendar" element={<EventsCalendar />} />
        <Route path="reports" element={<EventsReports />} />
      </Route>

      {/* 5. Service Operations Dashboard */}
      <Route path="/ops" element={<RoleLayout roleKey="service_ops" accent="ops" />}>
        <Route index element={<OpsOverview />} />
        <Route path="cleaning" element={<OpsCleaning />} />
        <Route path="inspection" element={<OpsInspection />} />
        <Route path="laundry" element={<OpsLaundry />} />
        <Route path="maintenance" element={<OpsMaintenance />} />
        <Route path="lost-found" element={<OpsLostFound />} />
        <Route path="readiness" element={<OpsReadiness />} />
        <Route path="catering" element={<OpsCatering />} />
        <Route path="quotations" element={<OpsQuotations />} />
        <Route path="staff" element={<OpsStaff />} />
        <Route path="reports" element={<OpsReports />} />
      </Route>

      {/* 6. Finance Officer Dashboard */}
      <Route path="/finance" element={<RoleLayout roleKey="finance" accent="finance" />}>
        <Route index element={<FinanceOverview />} />
        <Route path="payments" element={<FinancePayments />} />
        <Route path="invoices" element={<FinanceInvoices />} />
        <Route path="refunds" element={<FinanceRefunds />} />
        <Route path="revenue" element={<FinanceRevenue />} />
        <Route path="expenses" element={<FinanceExpenses />} />
        <Route path="reports" element={<FinanceReports />} />
        <Route path="export" element={<FinanceExport />} />
      </Route>

      {/* 7. System Administrator Dashboard */}
      <Route path="/admin" element={<RoleLayout roleKey="admin" accent="admin" />}>
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="roles" element={<AdminRoles />} />
        <Route path="rooms" element={<AdminRooms />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="restaurant" element={<AdminRestaurant />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="catering" element={<AdminCatering />} />
        <Route path="housekeeping" element={<AdminHousekeeping />} />
        <Route path="finance" element={<AdminFinance />} />
        <Route path="cms" element={<AdminCms />} />
        <Route path="gallery" element={<AdminGallery />} />
        <Route path="offers" element={<AdminOffers />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="agent-requests" element={<AgentRequestsInbox basePath="/admin" />} />
        <Route path="ai" element={<AdminAi />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="audit" element={<AdminAudit />} />
        <Route path="security" element={<AdminSecurity />} />
        <Route path="system" element={<AdminSystem />} />
        <Route path="backups" element={<AdminBackups />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
