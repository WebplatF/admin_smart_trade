import { useEffect, useState } from "react";
import Pagination from "../components/Pagination";
import { getUsers, updateUserStatus } from "../api/userApi";
import { Funnel } from "lucide-react";
import toast from "react-hot-toast";
import "./Users.css";

const Users = () => {

  const [currentPage, setCurrentPage] = useState(1);
  const [allUsers, setAllUsers] = useState([]); // 🔥 FULL DATA
  const [users, setUsers] = useState([]); // 🔥 PAGINATED DATA
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");

  const [openFilter, setOpenFilter] = useState(null);
  const [loading, setLoading] = useState(false);

  const PER_PAGE = 10;

  /* ================= FETCH ================= */
  const fetchUsers = async () => {
    setLoading(true);

    try {
      const res = await getUsers(); // 🔥 ignore page (backend broken)

      const data = res?.data?.data?.userList || [];

      setAllUsers(data);

    } catch (error) {
      console.error(error);
      toast.error("Failed to load users");
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    fetchUsers();
  }, []);

  /* ================= SEARCH ================= */
  const filteredUsers = allUsers.filter((user) =>
    user.name?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  );

  /* ================= SORT ================= */
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortField) return 0;

    const valA = a[sortField]?.toLowerCase() || "";
    const valB = b[sortField]?.toLowerCase() || "";

    return sortOrder === "asc"
      ? valA.localeCompare(valB)
      : valB.localeCompare(valA);
  });

  /* ================= PAGINATION (🔥 CORE FIX) ================= */
  useEffect(() => {

    const start = (currentPage - 1) * PER_PAGE;
    const paginated = sortedUsers.slice(start, start + PER_PAGE);

    setUsers(paginated);
    setTotalPages(Math.ceil(sortedUsers.length / PER_PAGE) || 1);

  }, [sortedUsers, currentPage]);

  /* ================= RESET PAGE ON SEARCH ================= */
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  /* ================= STATUS ================= */
  const toggleStatus = async (user, index) => {
    const t = toast.loading("Updating status...");

    try {
      const newStatus = user.status === false ? true : false;

      const res = await updateUserStatus({
        user_id: user.user_id,
        status: newStatus
      });

      if (!res?.data?.status) {
        toast.error(res?.data?.message || "Update failed", { id: t });
        return;
      }

      // update full data
      const updated = [...allUsers];
      const realIndex = allUsers.findIndex(u => u.id === user.id);

      if (realIndex !== -1) {
        updated[realIndex].status = newStatus;
      }

      setAllUsers(updated);

      toast.success("Status updated", { id: t });

    } catch (error) {
      console.error(error);
      toast.error("Update failed", { id: t });
    }
  };

  /* ================= SORT HANDLER ================= */
  const applySort = (field, order) => {
    setSortField(field);
    setSortOrder(order);
    setOpenFilter(null);
  };

  return (
    <div className="users-page">

      {/* LOADER */}
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

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search by name or email..."
        className="search-input"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* TABLE */}
      <table className="users-table">
        <thead>
          <tr>
            <th>S.No</th>

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
            <th>Email</th>
            <th>IP</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {users.length > 0 ? (
            users.map((user, index) => (
              <tr key={user.id}>

                {/* 🔥 CORRECT SERIAL */}
                <td>{(currentPage - 1) * PER_PAGE + index + 1}</td>

                <td>{user.name || "-"}</td>
                <td>{user.mobile || "-"}</td>
                <td>{user.email || "-"}</td>
                <td>{Array.isArray(user.login_ip) ? user.login_ip.join(", ") : "-"}</td>

                <td>
                  <label className="switch">
                    <input
                      type="checkbox"
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

      {/* PAGINATION */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

    </div>
  );
};

export default Users;