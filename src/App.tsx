
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import CreateListing from "./pages/CreateListing"; // Import the new page
import NotFound from "./pages/NotFound";
import { auth } from "./lib/firebase"; // Import Firebase auth
import { onAuthStateChanged } from "firebase/auth"; // Import onAuthStateChanged

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
        <BrowserRouter>
          <AnimatedRoutes isAuthenticated={isAuthenticated} />
        </BrowserRouter>
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
        <Route path="/messages" element={
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
