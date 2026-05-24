// frontend/src/services/slotService.js
import api from './api';

const slotService = {
  getSlotsByTurf: async (turfId, date = null) => {
    const url = date 
      ? `/admin/slots/turf/${turfId}?date=${date}`
      : `/admin/slots/turf/${turfId}`;
    const response = await api.get(url);
    return response.data;
  },

  generateSlots: async (turfId) => {
    const response = await api.post(`/admin/slots/generate/${turfId}`);
    return response.data;
  },

  updateSlotPrice: async (slotId, price) => {
    const response = await api.put(`/admin/slots/${slotId}`, { price });
    return response.data;
  },

  toggleSlotAvailability: async (slotId) => {
    const response = await api.put(`/admin/slots/toggle/${slotId}`);
    return response.data;
  },

  updatePriceByRange: async (turfId, startTime, endTime, price) => {
    const response = await api.put(`/admin/slots/update-range/${turfId}`, {
      startTime,
      endTime,
      price
    });
    return response.data;
  },

  deleteAllSlots: async (turfId) => {
    const response = await api.delete(`/admin/slots/delete-all/${turfId}`);
    return response.data;
  }
};

export default slotService;