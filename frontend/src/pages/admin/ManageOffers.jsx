import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';

const ManageOffers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [recurringType, setRecurringType] = useState('none');
  const [selectedDays, setSelectedDays] = useState([]);
  const [userLimit, setUserLimit] = useState('');
  const [formData, setFormData] = useState({ 
    code: '', description: '', discountType: 'percentage', discountValue: '', 
    minBookingAmount: '', maxDiscount: '', validFrom: '', validTill: '', usageLimit: '' 
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const fetchOffers = useCallback(async () => {
    try { 
      setLoading(true); 
      const response = await api.get('/admin/offers'); 
      setOffers(response.data.data.offers); 
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!formData.code || !formData.discountValue) {
    toast.error('Please fill required fields');
    return;
  }
  
  // ✅ FIX: For "No Recurring", send 'none' instead of null
  const submitData = {
    ...formData,
    discountValue: Number(formData.discountValue),
    minBookingAmount: formData.minBookingAmount ? Number(formData.minBookingAmount) : 0,
    maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
    usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
    perUserLimit: userLimit ? parseInt(userLimit) : null,
    recurringType: recurringType === 'none' ? 'none' : recurringType,  // ✅ Send 'none' string
    recurringDays: recurringType === 'weekly' ? selectedDays : [],
  };
  
  console.log('Submitting data:', submitData); // Debug log
  
  try {
    if (editingOffer) {
      await api.put(`/admin/offers/${editingOffer._id}`, submitData);
      toast.success('Offer updated!');
    } else {
      await api.post('/admin/offers', submitData);
      toast.success('Offer created!');
    }
    fetchOffers(); 
    resetForm();
  } catch (err) { 
    console.error('Save error:', err.response?.data);
    toast.error(err.response?.data?.message || 'Failed to save offer'); 
  }
};

  const resetForm = () => {
  setShowForm(false); 
  setEditingOffer(null);
  setRecurringType('none');  // ✅ Set to 'none' string
  setSelectedDays([]);
  setUserLimit('');
  setFormData({ 
    code: '', description: '', discountType: 'percentage', discountValue: '', 
    minBookingAmount: '', maxDiscount: '', validFrom: '', validTill: '', usageLimit: '' 
  });
};

  const handleDelete = async (id) => {
    if (window.confirm('Delete this offer?')) { 
      try { await api.delete(`/admin/offers/${id}`); fetchOffers(); toast.success('Offer deleted'); } 
      catch (err) { toast.error('Failed to delete'); } 
    }
  };

  const handleToggle = async (id) => {
    try { await api.put(`/admin/offers/${id}/toggle`); fetchOffers(); } 
    catch (err) { toast.error('Failed to toggle'); }
  };

  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'No expiry';
    return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Manage Offers</h1>
            <p className="text-gray-500 text-xs md:text-sm mt-1">{offers.length} offers available</p>
          </div>
          <button 
            onClick={() => { resetForm(); setShowForm(!showForm); }} 
            className={`px-5 py-2 rounded-xl text-white font-medium transition-all ${
              showForm ? 'bg-gray-500 hover:bg-gray-600' : 'bg-primary-600 hover:bg-primary-700'
            }`}>
            {showForm ? '✕ Cancel' : '+ Create Offer'}
          </button>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6 border border-gray-100">
            <h2 className="text-xl font-bold mb-5">{editingOffer ? '✏️ Edit Offer' : '🎫 Create New Offer'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Offer Code *</label>
                  <input 
                    type="text" 
                    value={formData.code} 
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})} 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., SUMMER25"
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Discount Type</label>
                  <select 
                    value={formData.discountType} 
                    onChange={(e) => setFormData({...formData, discountType: e.target.value})} 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Description</label>
                <input 
                  type="text" 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl"
                  placeholder="Brief description of the offer"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Discount Value *</label>
                  <input 
                    type="number" 
                    value={formData.discountValue} 
                    onChange={(e) => setFormData({...formData, discountValue: e.target.value})} 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl"
                    placeholder={formData.discountType === 'percentage' ? 'e.g., 20' : 'e.g., 500'}
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Min. Booking Amount</label>
                  <input 
                    type="number" 
                    value={formData.minBookingAmount} 
                    onChange={(e) => setFormData({...formData, minBookingAmount: e.target.value})} 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl"
                    placeholder="Minimum amount required"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Max Discount (for %)</label>
                  <input 
                    type="number" 
                    value={formData.maxDiscount} 
                    onChange={(e) => setFormData({...formData, maxDiscount: e.target.value})} 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl"
                    placeholder="Maximum discount amount"
                  />
                </div>
              </div>

              {/* Recurring Offer Section */}
              <div className="border-t pt-4">
                <label className="block text-sm font-semibold mb-2 text-gray-700">🔄 Recurring Offer</label>
                <div className="flex gap-3 mb-3">
                  <button type="button" onClick={() => setRecurringType('none')} className={`px-4 py-2 rounded-lg text-sm ${recurringType === 'none' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>No Recurring</button>
                  <button type="button" onClick={() => setRecurringType('weekly')} className={`px-4 py-2 rounded-lg text-sm ${recurringType === 'weekly' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>Weekly</button>
                  <button type="button" onClick={() => setRecurringType('monthly')} className={`px-4 py-2 rounded-lg text-sm ${recurringType === 'monthly' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>Monthly</button>
                </div>
                
                {recurringType === 'weekly' && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-2">Select days when offer is active:</p>
                    <div className="flex flex-wrap gap-2">
                      {daysOfWeek.map(day => (
                        <button key={day} type="button" onClick={() => toggleDay(day)} className={`px-3 py-1.5 rounded-lg text-xs ${selectedDays.includes(day) ? 'bg-primary-600 text-white' : 'bg-white border'}`}>{day}</button>
                      ))}
                    </div>
                  </div>
                )}
                
                {recurringType === 'monthly' && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">This offer will be available on the same date every month</p>
                  </div>
                )}
              </div>

              {/* Per User Limit */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">👤 Per User Limit</label>
                <input 
                  type="number" 
                  value={userLimit} 
                  onChange={(e) => setUserLimit(e.target.value)} 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl"
                  placeholder="How many times can a user use this? (Leave empty for unlimited)"
                />
                <p className="text-xs text-gray-400 mt-1">Example: 1 = First booking only</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Valid From</label>
                  <input 
                    type="date" 
                    value={formData.validFrom} 
                    onChange={(e) => setFormData({...formData, validFrom: e.target.value})} 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Valid Till</label>
                  <input 
                    type="date" 
                    value={formData.validTill} 
                    onChange={(e) => setFormData({...formData, validTill: e.target.value})} 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Total Usage Limit</label>
                <input 
                  type="number" 
                  value={formData.usageLimit} 
                  onChange={(e) => setFormData({...formData, usageLimit: e.target.value})} 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl"
                  placeholder="Max uses across all users (optional)"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={resetForm} className="px-6 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="bg-primary-600 text-white px-8 py-2.5 rounded-xl hover:bg-primary-700">
                  {editingOffer ? 'Update Offer' : 'Create Offer'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Mobile Card View */}
        <div className="block lg:hidden space-y-3">
          {offers.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <div className="text-5xl mb-3">🎫</div>
              <p className="font-semibold text-lg">No Offers Created</p>
              <p className="text-sm text-gray-500 mt-1">Click "Create Offer" to get started</p>
            </div>
          ) : (
            offers.map((offer) => (
              <div key={offer._id} className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary-600 text-lg">{offer.code}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        offer.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {offer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {offer.description && <p className="text-xs text-gray-500 mt-1">{offer.description}</p>}
                  </div>
                  <button onClick={() => handleToggle(offer._id)} className="text-xs text-gray-400">
                    {offer.isActive ? '🔘' : '⚪'}
                  </button>
                </div>
                
                <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl p-3 mb-3">
                  <div className="text-center">
                    <span className="text-2xl font-bold text-primary-600">
                      {offer.discountType === 'percentage' ? `${offer.discountValue}%` : `₹${offer.discountValue}`}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">Discount</p>
                  </div>
                </div>
                
                <div className="space-y-1 text-xs">
                  {offer.minBookingAmount && <p className="text-gray-500">Min. Order: ₹{offer.minBookingAmount}</p>}
                  {offer.perUserLimit && <p className="text-gray-500">👤 Max {offer.perUserLimit} time(s) per user</p>}
                  {offer.recurringType === 'weekly' && (
  <p className="text-purple-600">🔄 Weekly on {offer.recurringDays?.join(', ')}</p>
)}
{offer.recurringType === 'monthly' && (
  <p className="text-purple-600">🔄 Monthly recurring</p>
)}                
                  {offer.usageLimit && <p className="text-gray-500">🎫 Total: {offer.usedCount || 0}/{offer.usageLimit} used</p>}
                  <p className="text-gray-400">Valid: {formatDate(offer.validFrom)} - {formatDate(offer.validTill)}</p>
                </div>
                
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <button 
    onClick={() => { 
      setEditingOffer(offer); 
      setFormData(offer); 
      setRecurringType(offer.recurringType || 'none'); 
      setSelectedDays(offer.recurringDays || []); 
      setUserLimit(offer.perUserLimit || ''); 
      setShowForm(true); 
    }}  
                    className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-600">
                    ✏️ Edit
                  </button>
                  <button onClick={() => handleDelete(offer._id)} 
                    className="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-600">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-xl shadow-md overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Discount</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Min Amount</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Recurring</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Per User</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Usage</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Valid Period</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {offers.map((offer) => (
                <tr key={offer._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4"><span className="font-mono font-bold text-primary-600">{offer.code}</span></td>
                  <td className="px-5 py-4 text-sm text-gray-600">{offer.description || '-'}</td>
                  <td className="px-5 py-4"><span className="font-semibold text-primary-600">{offer.discountType === 'percentage' ? `${offer.discountValue}%` : `₹${offer.discountValue}`}</span></td>
                  <td className="px-5 py-4 text-sm">{offer.minBookingAmount ? `₹${offer.minBookingAmount}` : '-'}</td>
                  <td className="px-5 py-4 text-xs">
  {offer.recurringType === 'weekly' ? `Weekly (${offer.recurringDays?.join(', ')})` : 
   offer.recurringType === 'monthly' ? 'Monthly' : 
   '-'}
</td>
                  <td className="px-5 py-4 text-xs">{offer.perUserLimit ? `${offer.perUserLimit} time(s)` : 'Unlimited'}</td>
                  <td className="px-5 py-4 text-xs">{offer.usageLimit ? `${offer.usedCount || 0}/${offer.usageLimit}` : '∞'}</td>
                  <td className="px-5 py-4 text-xs text-gray-500">{formatDate(offer.validFrom)} - {formatDate(offer.validTill)}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => handleToggle(offer._id)} className={`px-3 py-1 rounded-full text-xs font-medium ${offer.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {offer.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">

<button onClick={() => { 
  setEditingOffer(offer); 
  setFormData(offer); 
  setRecurringType(offer.recurringType || 'none');  // ✅ Default to 'none'
  setSelectedDays(offer.recurringDays || []); 
  setUserLimit(offer.perUserLimit || ''); 
  setShowForm(true); 
}} 
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                      <button onClick={() => handleDelete(offer._id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                    </div>
                  </td>
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