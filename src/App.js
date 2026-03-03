import { Routes, Route } from "react-router-dom";
import Login from "./auth/Login";
import AdminLayout from "./layout/AdminLayout";
import Users from "./pages/Users";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route path="users" element={<Users />} />
      </Route>
    </Routes>
  );
}

export default App;