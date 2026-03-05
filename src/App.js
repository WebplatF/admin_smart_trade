import { Routes, Route } from "react-router-dom";
import Login from "./auth/Login";
import AdminLayout from "./layout/AdminLayout";

import Users from "./pages/Users";
import SubscriptionPlans from "./pages/SubscriptionPlans";
import SubscriptionRequests from "./pages/SubscriptionRequest";

function App() {
  return (
    <Routes>

      <Route path="/" element={<Login />} />

      <Route path="/admin" element={<AdminLayout />}>

        <Route path="users" element={<Users />} />

        <Route path="subscription-plans" element={<SubscriptionPlans />} />

        <Route path="requests" element={<SubscriptionRequests />} />

      </Route>

    </Routes>
  );
}

export default App;