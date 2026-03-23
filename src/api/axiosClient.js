import axios from "axios";

const axiosClient = axios.create({
  baseURL: "https://webplatf.site/api",
  timeout: 120000, // 2 minutes
  headers: {
    apikey: "uB0cD4oO2VmUzexweYg2Gc2FJY7GHVdGehDrbald4j4="
  },
  maxContentLength: Infinity,
  maxBodyLength: Infinity
});

axiosClient.interceptors.request.use((config) => {

  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;

});

axiosClient.interceptors.response.use(

  (response) => response,

  (error) => {

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/";
    }

    return Promise.reject(error);

  }

);

export default axiosClient;