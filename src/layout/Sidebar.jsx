import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

import usersIcon from "../assets/icons/users.png";
import plansIcon from "../assets/icons/Mask group (1).png";
import requestsIcon from "../assets/icons/Mask group (2).png";
import coursesIcon from "../assets/icons/book-open.png";
import mediaIcon from "../assets/icons/Mask group (3).png";
import builderIcon from "../assets/icons/Mask group (4).png";
import logoutIcon from "../assets/icons/Mask group (5).png";

const Sidebar = () => {

  const navigate = useNavigate();

  const handleLogout = () => {

    localStorage.removeItem("token");

    navigate("/", { replace: true });

  };

  const menuItems = [
    {
      name: "Users",
      path: "/admin/users",
      icon: usersIcon
    },
    {
      name: "Subscription plans",
      path: "/admin/subscription-plans",
      icon: plansIcon
    },
    {
      name: "Subscription requests",
      path: "/admin/requests",
      icon: requestsIcon
    },
    {
      name: "Courses",
      path: "/admin/courses",
      icon: coursesIcon
    },
    {
      name: "Media Library",
      path: "/admin/media",
      icon: mediaIcon
    },
    {
      name: "Home Page Builder",
      path: "/admin/builder",
      icon: builderIcon
    }
  ];

  return (

    <div className="sidebar">

      <div className="sidebar-top">

        <h2 className="logo">Smart Trade</h2>

        <div className="menu">

          {menuItems.map((item, index) => (

            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "menu-item active" : "menu-item"
              }
            >
              <img src={item.icon} alt={item.name} className="menu-icon" />
              <span>{item.name}</span>
            </NavLink>

          ))}

        </div>

      </div>

      {/* SIGN OUT */}

      <div className="signout">

        <button
          className="signout-btn"
          onClick={handleLogout}
        >
          <img
            src={logoutIcon}
            className="signout-icon"
            alt="logout"
          />
          <span>Sign Out</span>
        </button>

      </div>

    </div>

  );

};

export default Sidebar;