import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:5001/api', // Your backend API base URL
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchAutosuggestions = (prefix) => {
  // Corrected endpoint to include the '/search' prefix
  return apiClient.get(`/search/autosuggest?q=${prefix}`);
};

export const fetchSearchResults = (params) => {
    return apiClient.get('/srp/search', { params });
};

export const refineQuery = (query) => {
    return apiClient.get(`/refine?q=${encodeURIComponent(query)}`);
};

export default apiClient;
