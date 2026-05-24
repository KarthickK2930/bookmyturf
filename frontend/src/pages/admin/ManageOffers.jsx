import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';

const ManageOffers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [formData, setFormData] = useState({ code: '', description: '', discountType: 'percentage', discountValue: '', minBookingAmount: '', maxDiscount: '', validFrom: '', validTill: '', usageLimit: '' });

  const fetchOffers = useCallback(async () => {
    try { setLoading(true); const response = await api.get('/admin/offers'); setOffers(response.data.data.offers); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingOffer) await api.put(`/admin/offers/${editingOffer._id}`, formData);
      else await api.post('/admin/offers', formData);
      toast.success(editingOffer ? 'Offer updated!' : 'Offer created!');
      fetchOffers(); resetForm();
    } catch (err) { toast.error('Failed to save offer'); }
  };

  const resetForm = () => {
    setShowForm(false); setEditingOffer(null);
    setFormData({ code: '', description: '', discountType: 'percentage', discountValue: '', minBookingAmount: '', maxDiscount: '', validFrom: '', validTill: '', usageLimit: '' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this offer?')) { try { await api.delete(`/admin/offers/${id}`); fetchOffers(); } catch (err) { toast.error('Failed to delete'); } }
  };

  const handleToggle = async (id) => {
    try { await api.put(`/admin/offers/${id}/toggle`); fetchOffers(); } catch (err) { toast.error('Failed to toggle'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Manage Offers</h1>
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">{showForm ? 'Cancel' : 'Create Offer'}</button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Code</label><input type="text" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border rounded-lg" required /></div>
                <div><label className="block text-sm font-medium mb-1">Discount Type</label><select value={formData.discountType} onChange={(e) => setFormData({...formData, discountType: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Description</label><input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-1">Discount Value</label><input type="number" value={formData.discountValue} onChange={(e) => setFormData({...formData, discountValue: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required /></div>
                <div><label className="block text-sm font-medium mb-1">Min Amount</label><input type="number" value={formData.minBookingAmount} onChange={(e) => setFormData({...formData, minBookingAmount: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Max Discount</label><input type="number" value={formData.maxDiscount} onChange={(e) => setFormData({...formData, maxDiscount: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-1">Valid From</label><input type="date" value={formData.validFrom} onChange={(e) => setFormData({...formData, validFrom: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Valid Till</label><input type="date" value={formData.validTill} onChange={(e) => setFormData({...formData, validTill: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Usage Limit</label><input type="number" value={formData.usageLimit} onChange={(e) => setFormData({...formData, usageLimit: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={resetForm} className="px-6 py-2 border rounded-lg">Cancel</button>
                <button type="submit" className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">{editingOffer ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {offers.map((offer) => (
                <tr key={offer._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold">{offer.code}</td>
                  <td className="px-4 py-3">{offer.discountType === 'percentage' ? `${offer.discountValue}%` : `₹${offer.discountValue}`}</td>
                  <td className="px-4 py-3 text-sm">{offer.validFrom ? new Date(offer.validFrom).toLocaleDateString() : '-'} - {offer.validTill ? new Date(offer.validTill).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3"><button onClick={() => handleToggle(offer._id)} className={`px-2 py-1 rounded-full text-xs ${offer.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{offer.isActive ? 'Active' : 'Inactive'}</button></td>
                  <td className="px-4 py-3"><button onClick={() => { setEditingOffer(offer); setFormData(offer); setShowForm(true); }} className="text-blue-600 mr-2">Edit</button><button onClick={() => handleDelete(offer._id)} className="text-red-600">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default ManageOffers;