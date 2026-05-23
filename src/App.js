import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { SejalanProvider } from "./context/SejalanContext";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Gallery from "./pages/Gallery";
import "@/App.css";

function App() {
  return (
    <SejalanProvider>
      <div className="sj-app">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="*" element={<Welcome />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          position="top-center"
          theme="light"
          richColors
          toastOptions={{
            style: {
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              borderRadius: "16px",
            },
          }}
        />
      </div>
    </SejalanProvider>
  );
}

export default App;
