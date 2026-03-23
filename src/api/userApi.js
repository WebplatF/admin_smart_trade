import axiosClient from "./axiosClient";

export const getUsers = (page = 1) => {
  return axiosClient.get(`/admin/user_list?page=${page}`);
};

export const updateUserStatus = (data) => {
  return axiosClient.post("/admin/user_action", data);
};