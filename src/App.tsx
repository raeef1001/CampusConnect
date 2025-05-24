import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Listings from "./pages/Listings";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import CreateListing from "./pages/CreateListing";
import EditListing from "./pages/EditListing";
import ListingDetails from "./pages/ListingDetails";
import Admin from "./pages/Admin";
import AdminSetup from "./pages/AdminSetup";
<<<<<<< HEAD
import CartPage from "./pages/Cart"; // Import CartPage
import ModerationPage from "./pages/ModerationPage"; // New import for moderation page
import NotFound from "./pages/NotFound";
import { auth } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { CartProvider } from "./context/CartContext"; // Import CartProvider
=======
import CartPage from "./pages/Cart";
import CheckoutPage from "./pages/Checkout";
import MyBidsPage from "./pages/MyBids";
import ReceivedBidsPage from "./pages/ReceivedBids";
import IncomingOrdersPage from "./pages/IncomingOrders";
import OutgoingOrdersPage from "./pages/OutgoingOrders";
import ModerationPage from "./pages/ModerationPage";
import Services from "./pages/Services";
import CreateService from "./pages/CreateService";
import ServiceDetails from "./pages/ServiceDetails";
import ServiceRequests from "./pages/ServiceRequests";
import NotFound from "./pages/NotFound";
import { auth } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { CartProvider } from "./context/CartContext";
<<<<<<< HEAD
import { cacheWarmingService } from "./services/cacheWarmingService";
=======
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
>>>>>>> 66aed01a985e70dd3ba017237bc35502a5f8136a

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });

    // Clean up the subscription on unmount
    return () => unsubscribe();
  }, []);

  // Show loading state if authentication status is still being determined
  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
<<<<<<< HEAD
        <CartProvider> {/* Wrap with CartProvider */}
=======
        <CartProvider>
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AnimatedRoutes isAuthenticated={isAuthenticated} />
          </BrowserRouter>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

interface AnimatedRoutesProps {
  isAuthenticated: boolean | null;
}

const AnimatedRoutes = ({ isAuthenticated }: AnimatedRoutesProps) => {
  const location = useLocation();

  const pageVariants = {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 },
  };

  const pageTransition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.25,
  };

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <motion.div
            key="landing"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            <Landing />
          </motion.div>
        } />
        <Route path="/auth" element={
          <motion.div
            key="auth"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {!isAuthenticated ? <Auth /> : <Navigate to="/dashboard" />}
          </motion.div>
        } />
        <Route path="/dashboard" element={
          <motion.div
            key="dashboard"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <Dashboard /> : <Navigate to="/auth" />}
          </motion.div>
        } />
        <Route path="/listings" element={
          <motion.div
            key="listings"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <Listings /> : <Navigate to="/auth" />}
          </motion.div>
        } />
        <Route path="/notifications" element={
          <motion.div
            key="notifications"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <Notifications /> : <Navigate to="/auth" />}
          </motion.div>
        } />
        <Route path="/messages/:chatId?" element={
          <motion.div
            key="messages"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <Messages /> : <Navigate to="/auth" />}
          </motion.div>
        } />
        <Route path="/profile" element={
          <motion.div
            key="profile"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <Profile /> : <Navigate to="/auth" />}
          </motion.div>
        } />
        <Route path="/settings" element={
          <motion.div
            key="settings"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <Settings /> : <Navigate to="/auth" />}
          </motion.div>
        } />
        <Route path="/create-listing" element={
          <motion.div
            key="create-listing"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <CreateListing /> : <Navigate to="/auth" />}
          </motion.div>
        } />
        <Route path="/listings/:id" element={
          <motion.div
            key="listing-details"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <ListingDetails /> : <Navigate to="/auth" />}
          </motion.div>
        } />
        <Route path="/listings/:id/edit" element={
          <motion.div
            key="edit-listing"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <EditListing /> : <Navigate to="/auth" />}
          </motion.div>
        } />
<<<<<<< HEAD
        <Route path="/admin" element={isAuthenticated ? <Admin /> : <Navigate to="/auth" />}>
=======
        <Route path="/cart" element={
          <motion.div
            key="cart-page"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <CartPage /> : <Navigate to="/auth" />}
          </motion.div>
        } />
        <Route path="/checkout" element={
          <motion.div
            key="checkout"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <CheckoutPage /> : <Navigate to="/auth" />}
          </motion.div>
        } />
        <Route path="/admin" element={
          <motion.div
            key="admin"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <Admin /> : <Navigate to="/auth" />}
          </motion.div>
        }>
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
          <Route path="moderation" element={<ModerationPage />} />
        </Route>
        <Route path="/admin-setup" element={
          <motion.div
            key="admin-setup"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <AdminSetup /> : <Navigate to="/auth" />}
          </motion.div>
        } />
<<<<<<< HEAD
        <Route path="/cart" element={
          <motion.div
            key="cart-page"
=======
        <Route path="/bids/my-bids" element={
          <motion.div
            key="my-bids"
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
<<<<<<< HEAD
            {isAuthenticated ? <CartPage /> : <Navigate to="/auth" />}
=======
            {isAuthenticated ? <MyBidsPage /> : <Navigate to="/auth" />}
          </motion.div>
        } />
        <Route path="/bids/received" element={
          <motion.div
            key="received-bids"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <ReceivedBidsPage /> : <Navigate to="/auth" />}
          </motion.div>
        } />
        <Route path="/orders/outgoing" element={
          <motion.div
            key="outgoing-orders"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <OutgoingOrdersPage /> : <Navigate to="/auth" />}
          </motion.div>
        } />
        <Route path="/orders/incoming" element={
          <motion.div
            key="incoming-orders"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <IncomingOrdersPage /> : <Navigate to="/auth" />}
>>>>>>> f4fe690e00dd5322027e4ca7da1a28e707a1b779
          </motion.div>
        } />
        <Route path="/services" element={
          <motion.div
            key="services"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <Services /> : <Navigate to="/auth" />}
          </motion.div>
        } />
        <Route path="/services/create" element={
          <motion.div
            key="create-service"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <CreateService /> : <Navigate to="/auth" />}
          </motion.div>
        } />
        <Route path="/services/:id" element={
          <motion.div
            key="service-details"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <ServiceDetails /> : <Navigate to="/auth" />}
          </motion.div>
        } />
        <Route path="/service-requests" element={
          <motion.div
            key="service-requests"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            {isAuthenticated ? <ServiceRequests /> : <Navigate to="/auth" />}
          </motion.div>
        } />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={
          <motion.div
            key="not-found"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
          >
            <NotFound />
          </motion.div>
        } />
      </Routes>
    </AnimatePresence>
  );
};
