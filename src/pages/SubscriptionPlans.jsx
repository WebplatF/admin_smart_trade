import { useState, useEffect } from "react";
import "./SubscriptionPlans.css";
import { SquarePen } from "lucide-react";
import {
  getPlans,
  createPlan,
  editPlan,
  updatePlanStatus
} from "../api/subscriptionApi";
import toast from "react-hot-toast";

const SubscriptionPlans = () => {

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [editPlanData, setEditPlanData] = useState(null);

  const [formData, setFormData] = useState({
    plan_name: "",
    amount: "",
    duration: "",
    validity: ""
  });

  /* ================= FETCH ================= */

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await getPlans();
      const data =
        res?.data?.data?.subscription_list ||
        res?.data?.data ||
        [];
      setPlans(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  /* ================= CREATE ================= */

  const handleCreate = async () => {

    if (!formData.plan_name || !formData.amount || !formData.duration || !formData.validity) {
      toast.error("All fields required");
      return;
    }

    const t = toast.loading("Creating plan...");

    try {

      await createPlan(formData);

      toast.success("Plan created 🎉", { id: t });

      setFormData({
        plan_name: "",
        amount: "",
        duration: "",
        validity: ""
      });

      setShowCreate(false);
      fetchPlans();

    } catch (error) {

      console.error(error);
      toast.error(error.response?.data?.message || "Create failed", { id: t });

    }
  };

  /* ================= EDIT ================= */

  const handleEditClick = (plan) => {
    setEditPlanData({
      plan_id: plan.plan_id || plan.id,
      plan_name: plan.plan_name,
      amount: plan.amount,
      duration: plan.duration,
      validity: plan.validity
    });
    setShowEdit(true);
  };

  const handleEditSave = async () => {

    const t = toast.loading("Updating plan...");

    try {

      await editPlan(editPlanData);

      toast.success("Updated ✨", { id: t });

      setShowEdit(false);
      setEditPlanData(null);
      fetchPlans();

    } catch (error) {

      console.error(error);
      toast.error(error.response?.data?.message || "Update failed", { id: t });

    }
  };

  /* ================= STATUS (FIXED LOGIC) ================= */

  const toggleStatus = async (plan, index) => {

    const t = toast.loading("Updating status...");

    try {

      // API logic reversed → UI fixed
      const newStatus = !Boolean(plan.status);

      await updatePlanStatus({
        plan_id: plan.plan_id || plan.id,
        status: newStatus
      });

      const updated = [...plans];
      updated[index].status = newStatus;
      setPlans(updated);

      toast.success("Status updated", { id: t });

    } catch (error) {

      console.error(error);
      toast.error("Failed", { id: t });

    }
  };

  return (

    <div className="plans-page">

      {/* LOADER */}
      {loading && (
        <div className="global-loader">
          <div className="loader-box">
            <div className="loader-spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      )}

      <h1>Subscription Plans</h1>
      <p className="subtitle">Manage all subscription plans</p>

      <button
        className="create-btn"
        onClick={() => setShowCreate(true)}
        disabled={showEdit}
      >
        + CREATE PLAN
      </button>

      {/* TABLE */}
      <table className="plans-table">

        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Duration</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          {plans.length > 0 ? (

            plans.map((plan, index) => (

              <tr key={plan.plan_id || plan.id}>

                <td>{plan.plan_name}</td>

                <td>₹{plan.amount}</td>

                <td>{plan.duration} {plan.validity}</td>

                <td>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={!Boolean(plan.status)}   
                      onChange={() => toggleStatus(plan, index)}
                    />
                    <span className="slider"></span>
                  </label>
                </td>

                <td>
                  <span
                    className="edit-icon"
                    onClick={() => handleEditClick(plan)}
                  >
                  <SquarePen />
                  </span>
                </td>

              </tr>

            ))

          ) : (

            <tr>
              <td colSpan="5" style={{ textAlign: "center" }}>
                No plans found
              </td>
            </tr>

          )}

        </tbody>

      </table>

      {/* CREATE FORM */}
      {showCreate && (
        <div className="form-card">
          <div className="form-header">Create Subscription Plan</div>

          <div className="form-grid">

            <input placeholder="Plan Name"
              value={formData.plan_name}
              onChange={(e)=>setFormData({...formData, plan_name:e.target.value})}/>

            <input placeholder="Price"
              value={formData.amount}
              onChange={(e)=>setFormData({...formData, amount:e.target.value})}/>

            <select
              value={formData.duration}
              onChange={(e)=>setFormData({...formData, duration:e.target.value})}>
              <option value="">Duration</option>
              {[...Array(12)].map((_,i)=>(
                <option key={i} value={i+1}>{i+1}</option>
              ))}
            </select>

            <select
              value={formData.validity}
              onChange={(e)=>setFormData({...formData, validity:e.target.value})}>
              <option value="">Validity</option>
              <option value="Months">Months</option>
              <option value="Years">Years</option>
            </select>

          </div>

          <div className="form-buttons">
            <button className="cancel-btn" onClick={()=>setShowCreate(false)}>Cancel</button>
            <button className="save-btn" onClick={handleCreate}>Save</button>
          </div>
        </div>
      )}

      {/* EDIT FORM */}
      {showEdit && editPlanData && (
        <div className="form-card">
          <div className="form-header">Edit Subscription Plan</div>

          <div className="form-grid">

            <input
              value={editPlanData.plan_name}
              onChange={(e)=>setEditPlanData({...editPlanData, plan_name:e.target.value})}
            />

            <input
              value={editPlanData.amount}
              onChange={(e)=>setEditPlanData({...editPlanData, amount:e.target.value})}
            />

            <select
              value={editPlanData.duration}
              onChange={(e)=>setEditPlanData({...editPlanData, duration:e.target.value})}>
              {[...Array(12)].map((_,i)=>(
                <option key={i} value={i+1}>{i+1}</option>
              ))}
            </select>

            <select
              value={editPlanData.validity}
              onChange={(e)=>setEditPlanData({...editPlanData, validity:e.target.value})}>
              <option value="Months">Months</option>
              <option value="Years">Years</option>
            </select>

          </div>

          <div className="form-buttons">
            <button className="cancel-btn" onClick={()=>{setShowEdit(false); setEditPlanData(null);}}>
              Cancel
            </button>
            <button className="save-btn" onClick={handleEditSave}>
              Save
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default SubscriptionPlans;