import axiosClient from "./axiosClient";

/* GET PLANS */

export const getPlans = () => {
  return axiosClient.get("/subscription_list");
};

/* CREATE PLAN */

export const createPlan = (data) => {
  return axiosClient.post("/admin/subscription/create", data);
};

/* EDIT PLAN */

export const editPlan = (data) => {
  return axiosClient.post("/admin/subscription/edit", data);
};

/* UPDATE STATUS */

export const updatePlanStatus = (data) => {
  return axiosClient.post("/admin/subscription/update_status", data);
};