import axios from 'axios';

const ACCURATE_BASE_URL = 'https://account.accurate.id';

export const accurateClient = axios.create({
  baseURL: ACCURATE_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add Session ID or Auth token if needed
accurateClient.interceptors.request.use((config) => {
  // You can implement session management here
  return config;
});
