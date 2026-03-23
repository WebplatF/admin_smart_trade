import axiosClient from "./axiosClient";

export const adminLogin = (data) => {
  return axiosClient.post("/auth/admin_login", data);
};