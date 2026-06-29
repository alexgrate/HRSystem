import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import Login from "../pages/auth/Login";
import Shell from "../components/layout/Shell";
import DirectoryPage from "../pages/admin/DirectoryPage";
import WorkflowPage from "../pages/admin/WorkflowPage";

export default function AppRoutes() {
  const [activeTab, setActiveTab] = useState("directory");

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route 
            path="/app" 
            element={
              <ProtectedRoute>
                <Shell active={activeTab} onChange={setActiveTab}>
                  {activeTab === "directory" && <DirectoryPage />}
                  {activeTab === "workflow" && <WorkflowPage />}
                  {activeTab !== "directory" && (
                    <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-2xl">
                      Module <span className="font-semibold text-purple-600 capitalize">{activeTab}</span> is scheduled in future weeks!
                    </div>
                  )}
                </Shell>
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}