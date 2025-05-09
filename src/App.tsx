import React from "react";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WebSocketProvider } from "./lib/socket";
import Index from "./pages/Index.tsx";
import About from "./pages/About.tsx";
import NotFound from "./pages/NotFound";

// Reusable component for defining routes
const AppRoute = ({ path, element }: { path: string; element: React.ReactNode }) => (
  <Route path={path} element={element} />
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WebSocketProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <AppRoute path="/" element={<Index />} />
            <AppRoute path="/about" element={<About />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </WebSocketProvider>
  </QueryClientProvider>
);

export default App;