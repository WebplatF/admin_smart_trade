import { useState, useEffect } from "react";
import "./SubscriptionRequest.css";
import { Eye, Check, X } from "lucide-react";
import axiosClient from "../api/axiosClient";
import toast from "react-hot-toast";

const SubscriptionRequests = () => {

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);

  const [confirmType, setConfirmType] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  /* ================= FETCH ================= */

  const fetchRequests = async () => {

    setLoading(true);

    try {

      const res = await axiosClient.get("/admin/subscription/list");

      const data = res?.data?.data?.user_list || [];

      setRequests(data);

    } catch (error) {

      console.error(error);
      toast.error("Failed to load requests");

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  /* ================= ACTION ================= */

  const handleAction = async () => {

    setActionLoading(true);

    const t = toast.loading(
      confirmType === "approve" ? "Approving..." : "Rejecting..."
    );

    try {

      await axiosClient.post("/admin/subscription/action", {
        subscrption_id: selectedId,
        action: confirmType === "approve" ? "Approved" : "Rejected"
      });

      toast.success(
        confirmType === "approve" ? "Approved ✅" : "Rejected ❌",
        { id: t }
      );

      setConfirmType(null);
      setSelectedId(null);

      fetchRequests();

    } catch (error) {

      console.error(error);
      toast.error("Action failed", { id: t });

    } finally {
      setActionLoading(false);
    }
  };

  return (

    <div className="requests-page">

      {/* GLOBAL LOADER */}
      {loading && (
        <div className="global-loader">
          <div className="loader-box">
            <div className="loader-spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      )}

      <h1>Subscription Requests</h1>
      <p className="subtitle">Review and manage payment requests</p>

      <table className="requests-table">

        <thead>
          <tr>
            <th>User</th>
            <th>Plan</th>
            <th>Requested Date</th>
            <th>Start Date</th>
            <th>Status</th>
            <th>Renew Date</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          {requests.length > 0 ? (

            requests.map((req) => {

              const status = (req.status || "Pending").toLowerCase();

              return (

                <tr key={req.id}>

                  <td>
                    <div className="user-cell">
                      {req.user_name}
                    </div>
                  </td>

                  <td>{req.plan_name || "-"}</td>
                  <td>{req.requested_date || "-"}</td>
                  <td>{req.start_date || "-"}</td>

                  <td>
                    <span className={`status ${status}`}>
                      {req.status || "Pending"}
                    </span>
                  </td>

                  <td>{req.renew_date || "-"}</td>

                  <td className="actions">

                    {/* VIEW RECEIPT */}
                    <button
                      onClick={async () => {

                        const t = toast.loading("Loading receipt...");

                        try {

                          if (!req.image_path) {
                            setReceiptImage(null);
                            setReceiptOpen(true);
                            toast.dismiss(t);
                            return;
                          }

                          const res = await axiosClient.get(
                            `/common/wasabi_file?path=${req.image_path}`
                          );

                          const imageUrl = res?.data?.data?.wasabi_url;

                          setReceiptImage(imageUrl || null);
                          setReceiptOpen(true);

                          toast.dismiss(t);

                        } catch (error) {

                          console.error(error);
                          setReceiptImage(null);
                          setReceiptOpen(true);

                          toast.error("Failed to load receipt", { id: t });
                        }

                      }}
                    >
                      <Eye size={18} />
                    </button>

                    {/* APPROVE */}
                    {status === "pending" && (
                      <button
                        className="approve"
                        onClick={() => {
                          setSelectedId(req.id);
                          setConfirmType("approve");
                        }}
                      >
                        <Check size={18} />
                      </button>
                    )}

                    {/* REJECT */}
                    {status === "pending" && (
                      <button
                        className="reject"
                        onClick={() => {
                          setSelectedId(req.id);
                          setConfirmType("reject");
                        }}
                      >
                        <X size={18} />
                      </button>
                    )}

                  </td>

                </tr>

              );

            })

          ) : (

            <tr>
              <td colSpan="7" style={{ textAlign: "center" }}>
                No subscription requests
              </td>
            </tr>

          )}

        </tbody>

      </table>

      {/* RECEIPT MODAL */}
      {receiptOpen && (
        <div className="modal-overlay">
          <div className="receipt-modal">
            <button className="close" onClick={() => setReceiptOpen(false)}>×</button>
            <div className="receipt-box">
              {receiptImage
                ? <img src={receiptImage} alt="Receipt" className="receipt-image" />
                : "No Receipt Available"}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmType && (
        <div className="modal-overlay">
          <div className="confirm-modal">

            <h3>
              {confirmType === "approve" ? "Approve Request" : "Reject Request"}
            </h3>

            <p>
              {confirmType === "approve"
                ? "This will activate the user's subscription."
                : "This will reject the subscription request."}
            </p>

            <div className="modal-buttons">

              <button
                className="cancel"
                onClick={() => {
                  setConfirmType(null);
                  setSelectedId(null);
                }}
              >
                Cancel
              </button>

              <button
                className={`confirm ${confirmType === "approve" ? "green" : "red"}`}
                onClick={handleAction}
                disabled={actionLoading}
              >
                {actionLoading ? "Processing..." : "Confirm"}
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default SubscriptionRequests;