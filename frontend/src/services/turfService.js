import api from './api';

export const turfService = {
  getAllTurfs: async (params = {}) => {
    const response = await api.get('/turfs', { params });
    return response.data;
  },
  getTurfById: async (id) => {
    const response = await api.get(`/turfs/${id}`);
    return response.data;
  },
  getAvailableSlots: async (params) => {
    const response = await api.get('/turfs/slots/available', { params });
    return response.data;
  },
};