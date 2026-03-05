import { NavLink } from "react-router-dom";
import "./Sidebar.css";
import usersIcon from "../assets/icons/users.png";
import plansIcon from "../assets/icons/Mask group (1).png";
import requestsIcon from "../assets/icons/Mask group (2).png";
import coursesIcon from "../assets/icons/book-open.png";
import settingsIcon from "../assets/icons/settings.png";

const Sidebar = () => {
    return (
      <div className="sidebar">
        <h2 className="logo">Smart Trade</h2>
  
        <NavLink to="/admin/users" className="menu-item">
          <img src={usersIcon} alt="Users" className="menu-icon" />
          Users
        </NavLink>
  
        <NavLink to="/admin/subscription-plans" className="menu-item">
          <img src={plansIcon} alt="Plans" className="menu-icon" />
          Subscription Plans
        </NavLink>
  
        <NavLink to="/admin/requests" className="menu-item">
          <img src={requestsIcon} alt="Requests" className="menu-icon" />
          Subscription Requests
        </NavLink>
  
        <NavLink to="/admin/courses" className="menu-item">
          <img src={coursesIcon} alt="Courses" className="menu-icon" />
          Courses
        </NavLink>
  
        <NavLink to="/admin/settings" className="menu-item">
          <img src={settingsIcon} alt="Settings" className="menu-icon" />
          Settings
        </NavLink>
      </div>
    );
  };
  
  export default Sidebar;