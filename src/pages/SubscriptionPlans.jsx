import { useState } from "react";
import "./SubscriptionPlans.css";
import { Pencil } from "lucide-react";

const SubscriptionPlans = () => {

  const [plans, setPlans] = useState([
    { id: 1, name: "Basic", price: "₹99", duration: "1 month", subs: 100, active: true },
    { id: 2, name: "Premium", price: "₹399", duration: "3 month", subs: 55, active: false },
    { id: 3, name: "Annual", price: "₹999", duration: "1 year", subs: 5, active: true }
  ]);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editPlan, setEditPlan] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    duration: "",
    description: ""
  });

  /* ================= CREATE PLAN ================= */

  const handleCreate = () => {

    const newPlan = {
      id: Date.now(),
      name: formData.name,
      price: formData.price,
      duration: formData.duration,
      subs: 0,
      active: true
    };

    setPlans([...plans, newPlan]);

    setFormData({
      name: "",
      price: "",
      duration: "",
      description: ""
    });

    setShowCreate(false);
  };

  /* ================= EDIT PLAN ================= */

  const handleEditClick = (plan) => {
    setEditPlan(plan);
    setShowEdit(true);
  };

  const handleEditSave = () => {

    const updatedPlans = plans.map((p) =>
      p.id === editPlan.id ? editPlan : p
    );

    setPlans(updatedPlans);
    setShowEdit(false);
  };

  /* ================= TOGGLE STATUS ================= */

  const toggleStatus = (id) => {

    const updatedPlans = plans.map((plan) =>
      plan.id === id ? { ...plan, active: !plan.active } : plan
    );

    setPlans(updatedPlans);
  };

  return (
    <div className="plans-page">

      <h1>Subscription Plans</h1>
      <p className="subtitle">Manage all subscription plans</p>

      <button
        className="create-btn"
        onClick={() => setShowCreate(true)}
      >
        + CREATE PLAN
      </button>

      {/* ================= TABLE ================= */}

      <table className="plans-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Duration</th>
            <th>Subscribers</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {plans.map((plan) => (
            <tr key={plan.id}>

              <td>{plan.name}</td>
              <td>{plan.price}</td>
              <td>{plan.duration}</td>
              <td>{plan.subs}</td>

              <td>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={plan.active}
                    onChange={() => toggleStatus(plan.id)}
                  />
                  <span className="slider"></span>
                </label>
              </td>

              <td>
                <button
                    className="edit-btn"
                    disabled={showCreate}
                    onClick={() => handleEditClick(plan)}
                    >
                    <Pencil size={18} />
                    </button>
              </td>

            </tr>
          ))}
        </tbody>
      </table>

      {/* ================= CREATE FORM ================= */}

      {showCreate && (

        <div className="form-card">

          <h3>Create Subscription Plan</h3>

          <div className="form-grid">

            <div>
              <label>Plan Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <label>Price</label>
              <input
                type="text"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
              />
            </div>

            <div>
              <label>Duration</label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: e.target.value })
                }
              />
            </div>

            <div className="full">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              ></textarea>
            </div>

          </div>

          <div className="form-buttons">

            <button
              className="cancel-btn"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>

            <button
              className="save-btn"
              onClick={handleCreate}
            >
              Save Plan
            </button>

          </div>

        </div>
      )}

      {/* ================= EDIT FORM ================= */}

      {showEdit && editPlan && (

        <div className="form-card">

          <h3>Edit Subscription Plan</h3>

          <div className="form-grid">

            <div>
              <label>Plan Name</label>
              <input
                value={editPlan.name}
                onChange={(e) =>
                  setEditPlan({ ...editPlan, name: e.target.value })
                }
              />
            </div>

            <div>
              <label>Price</label>
              <input
                value={editPlan.price}
                onChange={(e) =>
                  setEditPlan({ ...editPlan, price: e.target.value })
                }
              />
            </div>

            <div>
              <label>Duration</label>
              <input
                value={editPlan.duration}
                onChange={(e) =>
                  setEditPlan({ ...editPlan, duration: e.target.value })
                }
              />
            </div>

            <div className="full">
              <label>Description</label>
              <textarea></textarea>
            </div>

          </div>

          <div className="form-buttons">

            <button
              className="cancel-btn"
              onClick={() => setShowEdit(false)}
            >
              Cancel
            </button>

            <button
              className="save-btn"
              onClick={handleEditSave}
            >
              Save Plan
            </button>

          </div>

        </div>
      )}

    </div>
  );
};

export default SubscriptionPlans;