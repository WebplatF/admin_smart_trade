import { useState } from "react";
import "./SubscriptionRequest.css";
import { Eye, Check, X } from "lucide-react";

const SubscriptionRequests = () => {

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [confirmType, setConfirmType] = useState(null);

  const requests = [
    {
      user: "John",
      email: "john22@gmail.com",
      plan: "Basic",
      date: "02-01-2026",
      status: "Pending"
    },
    {
      user: "John",
      email: "john22@gmail.com",
      plan: "Premium",
      date: "02-01-2026",
      status: "Rejected"
    },
    {
      user: "John",
      email: "john22@gmail.com",
      plan: "Annual",
      date: "02-01-2026",
      status: "Approved"
    }
  ];

  return (
    <div className="requests-page">

      <h1>Subscription Requests</h1>
      <p className="subtitle">Review and manage payment requests</p>

      <table className="requests-table">

        <thead>
          <tr>
            <th>User</th>
            <th>Plan</th>
            <th>Submitted</th>
            <th>Status</th>
            <th>Renewal date</th>
            <th></th>
          </tr>
        </thead>

        <tbody>

          {requests.map((req, index) => (

            <tr key={index}>

              <td>
                <div className="user-cell">
                  {req.user}
                  <span>{req.email}</span>
                </div>
              </td>

              <td>{req.plan}</td>

              <td>{req.date}</td>

              <td>
                <span className={`status ${req.status.toLowerCase()}`}>
                  {req.status}
                </span>
              </td>

              <td>{req.date}</td>

              <td className="actions">

                {/* VIEW RECEIPT */}
                <button onClick={() => setReceiptOpen(true)}>
                  <Eye size={18}/>
                </button>

                {/* APPROVE */}
                {req.status === "Pending" && (
                  <button
                    className="approve"
                    onClick={() => setConfirmType("approve")}
                  >
                    <Check size={18}/>
                  </button>
                )}

                {/* REJECT */}
                {req.status === "Pending" && (
                  <button
                    className="reject"
                    onClick={() => setConfirmType("reject")}
                  >
                    <X size={18}/>
                  </button>
                )}

              </td>

            </tr>

          ))}

        </tbody>

      </table>


      {/* RECEIPT MODAL */}

      {receiptOpen && (
        <div className="modal-overlay">

          <div className="receipt-modal">

            <button
              className="close"
              onClick={() => setReceiptOpen(false)}
            >
              ×
            </button>

            <div className="receipt-box">
              Payment Receipt
            </div>

          </div>

        </div>
      )}



      {/* APPROVE / REJECT DIALOG */}

      {confirmType && (

        <div className="modal-overlay">

          <div className="confirm-modal">

            <h3>
              {confirmType === "approve"
                ? "Approve Request"
                : "Reject Request"}
            </h3>

            <p>
              {confirmType === "approve"
                ? "This will activate the user's subscription."
                : "This will reject the subscription request."}
            </p>

            <div className="modal-buttons">

              <button
                className="cancel"
                onClick={() => setConfirmType(null)}
              >
                Cancel
              </button>

              <button
                className={`confirm ${
                  confirmType === "approve"
                    ? "green"
                    : "red"
                }`}
                onClick={() => setConfirmType(null)}
              >
                Confirm
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default SubscriptionRequests;