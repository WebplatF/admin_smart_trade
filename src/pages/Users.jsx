import { useState } from "react";
import Pagination from "../components/Pagination";
import "./Users.css";

const Users = () => {
  const [currentPage, setCurrentPage] = useState(1);

  const [userStatus, setUserStatus] = useState(
    Array(8).fill(true) // true = active
  );

  const toggleStatus = (index) => {
    const updatedStatus = [...userStatus];
    updatedStatus[index] = !updatedStatus[index];
    setUserStatus(updatedStatus);
  };

  return (
    <div className="users-page">
      <h1>Users</h1>
      <p className="subtitle">Manage all registered users</p>

      <input
        type="text"
        placeholder="Search..."
        className="search-input"
      />

      <table className="users-table">
        <thead>
          <tr>
            <th>S.No</th>
            <th>Full Name</th>
            <th>Phone Number</th>
            <th>Email</th>
            <th>IP</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {[...Array(8)].map((_, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>Odin</td>
              <td>8858465652</td>
              <td>user@email.com</td>
              <td>#0012345</td>
              <td>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={userStatus[index]}
                    onChange={() => toggleStatus(index)}
                  />
                  <span className="slider"></span>
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination
        currentPage={currentPage}
        totalPages={5}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default Users;