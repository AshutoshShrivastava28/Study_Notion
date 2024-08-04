import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "http://localhost:4000/api/v1",
});

export const apiConnector = (method, url, bodyData, headers, params) => {
  const trimmedMethod = method.trim().toLowerCase();
  const trimmedUrl = url.trim();

  const requestConfig = {
    method: trimmedMethod,
    url: trimmedUrl,
    data: bodyData || null,
    headers: headers || null,
    params: params || null,
  };

  // Log the request configuration
  console.log("Request Config:", requestConfig);

  return axiosInstance(requestConfig);
};
