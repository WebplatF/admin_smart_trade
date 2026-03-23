import axiosClient from "./axiosClient";

/* GET SUBSCRIPTION REQUEST LIST */

export const getSubscriptionRequests = () => {
  return axiosClient.get("/admin/subscription/list");
};

/* APPROVE / REJECT SUBSCRIPTION */

export const subscriptionAction = (data) => {
  return axiosClient.post("/admin/subscription/action", data);
};