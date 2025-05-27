import React from "react";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WebSocketProvider } from "./lib/socket";
import { ModuleRegistryProvider } from "./context/ModuleRegistry";
import Home from "./pages/Home";
import Index from "./pages/Index.tsx";
import About from "./pages/About.tsx";
import NotFound from "./pages/NotFound";
import "./styles/ModuleRegistry.css";

// Import module components
import StickyPlayerModule from "./modules/StickyPlayerModule";
import StemVisualizerModule from "./modules/StemVisualizerModule";
import NotificationLogModule from "./modules/NotificationLogModule";
import DebugConsoleModule from "./modules/DebugConsoleModule";
import ModuleSelector from "./components/ModuleSelector";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WebSocketProvider>
      <TooltipProvider>
        <ModuleRegistryProvider>
          {/* Module registry will be used from within the pages */}
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {/* Module selector */}
            <div className="fixed top-4 right-4 z-50">
              <ModuleSelector />
            </div>
            
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/alchemy/session" element={<Index />} />
              <Route path="/about" element={<About />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ModuleRegistryProvider>
      </TooltipProvider>
    </WebSocketProvider>
  </QueryClientProvider>
);

export default App;