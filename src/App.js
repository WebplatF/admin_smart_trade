import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Login from "./auth/Login";
import AdminLayout from "./layout/AdminLayout";

import Users from "./pages/Users";
import SubscriptionPlans from "./pages/SubscriptionPlans";
import SubscriptionRequests from "./pages/SubscriptionRequest";

import Courses from "./pages/Courses";

import MediaLibrary from "./pages/MediaLibrary";
import HomePageBuilder from "./pages/HomePageBuilder";

import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <>
      {/* 🔥 GLOBAL TOASTER */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={10}
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "10px",
            background: "#1a1a2e",
            color: "#fff",
            fontSize: "13px",
            padding: "10px 14px",
          },
          success: {
            style: {
              background: "#27ae60",
            },
            iconTheme: {
              primary: "#fff",
              secondary: "#27ae60",
            },
          },
          error: {
            style: {
              background: "#e74c3c",
            },
            iconTheme: {
              primary: "#fff",
              secondary: "#e74c3c",
            },
          },
        }}
      />

      {/* ROUTES */}
      <Routes>

        {/* LOGIN */}
        <Route path="/" element={<Login />} />

        {/* ADMIN */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >

          {/* DEFAULT REDIRECT */}
          <Route index element={<Navigate to="courses" />} />

          {/* USERS */}
          <Route path="users" element={<Users />} />

          {/* SUBSCRIPTIONS */}
          <Route path="subscription-plans" element={<SubscriptionPlans />} />
          <Route path="requests" element={<SubscriptionRequests />} />

          {/* COURSES */}
          <Route path="courses" element={<Courses />} />

          {/* CREATE COURSE */}
          

          {/* MEDIA */}
          <Route path="media" element={<MediaLibrary />} />

          {/* BUILDER */}
          <Route path="builder" element={<HomePageBuilder />} />

        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </>
  );
}

export default App;