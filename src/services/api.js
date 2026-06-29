import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL  || 'http://localhost:5000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if(token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => {

        if (response.data && response.data.status === 'success') {
            return response.data.data;
        }
        if (response.data && response.data.status === 'error') {
        return Promise.reject(response.data.error || { message: 'API validation failed' });
        }
        
        return response.data;
    },
    (error) => {
        if(error.response) {
            if (error.response.status === 401) {
                localStorage.removeItem('token');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
            return Promise.reject(error.response.data?.error || error.response.data || error)
        }
        return Promise.reject(error)
    }
)

export default api;