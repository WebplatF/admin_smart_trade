import { useEffect, useState } from "react";
import Pagination from "../components/Pagination";
import { getUsers, updateUserStatus } from "../api/userApi";
import { Funnel } from "lucide-react";
import toast from "react-hot-toast";
import "./Users.css";

const Users = () => {

  const [currentPage, setCurrentPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  const [openFilter, setOpenFilter] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]);

  /* ================= FETCH ================= */

  const fetchUsers = async (page) => {

    setLoading(true);

    try {

      const res = await getUsers(page);

      const userData = res?.data?.data?.userList || [];
      const totalRecords = res?.data?.data?.totalRecords || 0;

      setUsers(userData);
      setTotalPages(Math.ceil(totalRecords / 10));

    } catch (error) {

      console.error(error);
      toast.error("Failed to load users");
      setUsers([]);

    } finally {
      setLoading(false);
    }
  };

  /* ================= STATUS ================= */

  const toggleStatus = async (user, index) => {

    const t = toast.loading("Updating status...");

    try {

      // 🔥 INVERT LOGIC FOR API
      const newStatus = user.status === false ? true : false;

      const res = await updateUserStatus({
        user_id: user.user_id,
        status: newStatus
      });

      // ❌ if API fails → don't change UI
      if (!res?.data?.status) {
        toast.error(res?.data?.message || "Update failed", { id: t });
        return;
      }

      // ✅ update UI only on success
      const updatedUsers = [...users];

      updatedUsers[index] = {
        ...updatedUsers[index],
        status: newStatus
      };

      setUsers(updatedUsers);

      toast.success("Status updated", { id: t });

    } catch (error) {

      console.error(error);
      toast.error("Update failed", { id: t });

    }
  };

  /* ================= SEARCH ================= */

  const searchedUsers = users.filter((user) =>
    user.name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  /* ================= SORT ================= */

  const sortedUsers = [...searchedUsers].sort((a, b) => {

    if (!sortField) return 0;

    const valA = a[sortField]?.toLowerCase() || "";
    const valB = b[sortField]?.toLowerCase() || "";

    return sortOrder === "asc"
      ? valA.localeCompare(valB)
      : valB.localeCompare(valA);

  });

  const applySort = (field, order) => {

    setSortField(field);
    setSortOrder(order);
    setOpenFilter(null);

  };

  return (

    <div className="users-page">

      {/* GLOBAL LOADER */}
      {loading && (
        <div className="global-loader">
          <div className="loader-box">
            <div className="loader-spinner"></div>
            <p>Loading users...</p>
          </div>
        </div>
      )}

      <h1>Users</h1>
      <p className="subtitle">Manage all registered users</p>

      <input
        type="text"
        placeholder="Search by name or email..."
        className="search-input"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <table className="users-table">

        <thead>
          <tr>

            <th>S.No</th>

            {/* NAME FILTER */}
            <th>
              <div className="filter-container">
                Full Name
                <Funnel
                  size={14}
                  className="filter-icon"
                  onClick={() =>
                    setOpenFilter(openFilter === "name" ? null : "name")
                  }
                />
                {openFilter === "name" && (
                  <div className="filter-dropdown">
                    <div onClick={() => applySort("name", "asc")}>Sort A → Z</div>
                    <div onClick={() => applySort("name", "desc")}>Sort Z → A</div>
                  </div>
                )}
              </div>
            </th>

            <th>Phone Number</th>

            {/* ✅ EMAIL (NO FILTER) */}
            <th>Email</th>

            <th>IP</th>
            <th>Status</th>

          </tr>
        </thead>

        <tbody>

          {sortedUsers.length > 0 ? (

            sortedUsers.map((user, index) => (

              <tr key={user.user_id || index}>

                <td>{index + 1}</td>
                <td>{user.name}</td>
                <td>{user.mobile}</td>
                <td>{user.email}</td>
                <td>{user.login_ip}</td>

                <td>
                  <label className="switch">
                    <input
                      type="checkbox"
                      // 🔥 CORE FIX
                      checked={!user.status}
                      onChange={() => toggleStatus(user, index)}
                    />
                    <span className="slider"></span>
                  </label>
                </td>

              </tr>

            ))

          ) : (

            <tr>
              <td colSpan="6" style={{ textAlign: "center" }}>
                No users found
              </td>
            </tr>

          )}

        </tbody>

      </table>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

    </div>
  );
};

export default Users;