import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';

const ManageTurfs = () => {
  const [turfs, setTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTurf, setEditingTurf] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  
  const [formData, setFormData] = useState({
    name: '', description: '', sports: [], amenities: [],
    openingTime: '00:00', closingTime: '23:59', pricePerHour: '', images: [],
    address: { street: '', city: '', state: '', pincode: '' }
  });

  const fetchTurfs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/turfs');
      if (response.data?.data?.turfs) setTurfs(response.data.data.turfs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTurfs(); }, [fetchTurfs]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleSport = (sport) => {
    setFormData(prev => ({ ...prev, sports: prev.sports.includes(sport) ? prev.sports.filter(s => s !== sport) : [...prev.sports, sport] }));
  };

  const addImage = () => {
    if (!imageUrl) { toast.error('Please enter image URL'); return; }
    setFormData(prev => ({ ...prev, images: [...prev.images, { url: imageUrl, caption: imageCaption || prev.name }] }));
    setImageUrl(''); setImageCaption('');
  };

  const removeImage = (index) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.description || formData.sports.length === 0) {
      toast.error('Please fill all required fields'); return;
    }
    try {
      setSubmitting(true);
      const submitData = { ...formData,  };
      if (editingTurf) await api.put(`/admin/turfs/${editingTurf._id}`, submitData);
      else await api.post('/admin/turfs', submitData);
      toast.success(editingTurf ? 'Turf updated!' : 'Turf created!');
      fetchTurfs(); resetForm();
    } catch (err) { toast.error('Failed to save turf'); }
    finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setShowForm(false); setEditingTurf(null); setImageUrl(''); setImageCaption('');
    setFormData({ name: '', description: '', sports: [], amenities: [], openingTime: '00:00', closingTime: '23:59', pricePerHour: '', images: [], address: { street: '', city: '', state: '', pincode: '' } });
  };

  const handleEdit = (turf) => {
    setEditingTurf(turf);
    setFormData({
      name: turf.name || '', description: turf.description || '', sports: turf.sports || [],
      amenities: turf.amenities || [], openingTime: turf.openingTime || '00:00', closingTime: turf.closingTime || '23:59',
      images: turf.images || [],
      address: { street: turf.address?.street || '', city: turf.address?.city || '', state: turf.address?.state || '', pincode: turf.address?.pincode || '' }
    });
    setShowForm(true);
  };

  const handleDelete = async (turfId) => {
    if (window.confirm('Delete this turf?')) {
      try { await api.delete(`/admin/turfs/${turfId}`); toast.success('Turf deleted'); fetchTurfs(); }
      catch (err) { toast.error('Failed to delete'); }
    }
  };

  const sportsList = ['Football', 'Cricket', 'Volleyball', 'Basketball', 'Tennis', 'Badminton'];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Manage Turfs</h1>
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">{showForm ? 'Cancel' : '+ Add New Turf'}</button>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold mb-6">{editingTurf ? 'Edit Turf' : 'Add New Turf'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-sm font-medium mb-2">Turf Name *</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" required /></div>
              </div>
              <div><label className="block text-sm font-medium mb-2">Description *</label><textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" rows="4" required /></div>
              
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">🏞️ Images</h3>
                <div className="flex gap-3 mb-3">
                  <input type="text" placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg" />
                  <input type="text" placeholder="Caption" value={imageCaption} onChange={(e) => setImageCaption(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg" />
                  <button type="button" onClick={addImage} className="bg-blue-500 text-white px-4 py-2 rounded-lg">Add</button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative border rounded-lg p-2">
                      <img src={img.url} alt={img.caption} className="w-full h-24 object-cover rounded" />
                      <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-xs">×</button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Sports *</label>
                <div className="flex flex-wrap gap-2">
                  {sportsList.map(sport => (
                    <button key={sport} type="button" onClick={() => toggleSport(sport)} className={`px-4 py-2 rounded-lg ${formData.sports.includes(sport) ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}>{sport}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-2">Opening Time</label><input type="time" name="openingTime" value={formData.openingTime} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-2">Closing Time</label><input type="time" name="closingTime" value={formData.closingTime} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" /></div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">📍 Address</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><input type="text" name="address.street" value={formData.address.street} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" placeholder="Street" /></div>
                  <input type="text" name="address.city" value={formData.address.city} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" placeholder="City" />
                  <input type="text" name="address.state" value={formData.address.state} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" placeholder="State" />
                  <input type="text" name="address.pincode" value={formData.address.pincode} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg" placeholder="Pincode" />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button type="button" onClick={resetForm} className="px-6 py-2 border rounded-lg">Cancel</button>
                <button type="submit" disabled={submitting} className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50">{submitting ? 'Saving...' : editingTurf ? 'Update Turf' : 'Create Turf'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {turfs.map((turf) => (
            <div key={turf._id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-48 bg-gray-200"><img src={turf.images?.[0]?.url || 'https://via.placeholder.com/400x250'} alt={turf.name} className="w-full h-full object-cover" /></div>
              <div className="p-5">
                <h3 className="text-xl font-semibold mb-2">{turf.name}</h3>
                <p className="text-gray-600 text-sm mb-3">{turf.description?.substring(0, 100)}...</p>
                <div className="flex flex-wrap gap-1 mb-3">{turf.sports?.map(s => <span key={s} className="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded">{s}</span>)}</div>
                <div className="flex justify-between items-center text-sm mb-3"><span>🕐 {turf.openingTime} - {turf.closingTime}</span><span className="text-gray-500">{turf.address?.city}</span></div>
                <div className="flex gap-2 pt-3 border-t">
                  <button onClick={() => handleEdit(turf)} className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm">Edit</button>
                  <button onClick={() => handleDelete(turf._id)} className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default ManageTurfs;