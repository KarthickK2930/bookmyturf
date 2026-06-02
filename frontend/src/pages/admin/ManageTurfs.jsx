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
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', description: '', sports: [], amenities: [],
    openingTime: '00:00', closingTime: '23:59', images: [],
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

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('image', files[i]);
        const response = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (response.data.success) {
          uploadedUrls.push(response.data.url);
        }
      }
      if (uploadedUrls.length > 0) {
        const newImages = uploadedUrls.map(url => ({ url: url, caption: '' }));
        setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
        toast.success(`${uploadedUrls.length} image(s) uploaded!`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.description || formData.sports.length === 0) {
      toast.error('Please fill all required fields'); return;
    }
    try {
      setSubmitting(true);
      const submitData = { ...formData };
      if (editingTurf) await api.put(`/admin/turfs/${editingTurf._id}`, submitData);
      else await api.post('/admin/turfs', submitData);
      toast.success(editingTurf ? 'Turf updated!' : 'Turf created!');
      fetchTurfs(); resetForm();
    } catch (err) { toast.error('Failed to save turf'); }
    finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setShowForm(false); setEditingTurf(null); setImageUrl(''); setImageCaption('');
    setFormData({ name: '', description: '', sports: [], amenities: [], openingTime: '00:00', closingTime: '23:59', images: [], address: { street: '', city: '', state: '', pincode: '' } });
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
    <div className="p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Manage Turfs</h1>
            <p className="text-gray-500 text-xs md:text-sm mt-1">{turfs.length} turfs available</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(!showForm); }} 
            className="bg-primary-600 text-white px-5 py-2 rounded-lg hover:bg-primary-700 text-sm w-full sm:w-auto">
            {showForm ? '✕ Cancel' : '+ Add New Turf'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6 border border-gray-100">
            <h2 className="text-xl md:text-2xl font-bold mb-5">{editingTurf ? '✏️ Edit Turf' : '➕ Add New Turf'}</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Turf Name *</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500" required />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Description *</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500" rows="4" required />
              </div>
              
              {/* Images Section */}
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold mb-3 text-gray-700">🏞️ Images</h3>
                
                <div className="mb-3">
                  <label className="block w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-primary-400 transition-colors bg-gray-50">
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                    <div className="text-3xl mb-1">📸</div>
                    <p className="text-sm text-gray-600">Click to upload images</p>
                    <p className="text-xs text-gray-400">JPEG, PNG, GIF (Max 5MB)</p>
                  </label>
                </div>

                {uploading && (
                  <div className="mb-3 bg-blue-50 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin"></div>
                      <span className="text-sm text-blue-600">Uploading images...</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <input type="text" placeholder="Or paste image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} 
                    className="flex-1 px-3 py-2 border rounded-xl text-sm" />
                  <input type="text" placeholder="Caption" value={imageCaption} onChange={(e) => setImageCaption(e.target.value)} 
                    className="sm:w-32 px-3 py-2 border rounded-xl text-sm" />
                  <button type="button" onClick={addImage} 
                    className="bg-blue-500 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-600">Add URL</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative border rounded-xl p-2 group bg-gray-50">
                      <img src={img.url} alt={img.caption || 'Turf'} className="w-full h-32 object-cover rounded-lg" />
                      <p className="text-xs text-gray-500 mt-1 truncate">{img.caption || 'No caption'}</p>
                      <button type="button" onClick={() => removeImage(index)} 
                        className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                    </div>
                  ))}
                </div>
                {formData.images.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-2">No images added yet</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Sports *</label>
                <div className="flex flex-wrap gap-2">
                  {sportsList.map(sport => (
                    <button key={sport} type="button" onClick={() => toggleSport(sport)} 
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${formData.sports.includes(sport) ? 'bg-primary-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {sport}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Opening Time</label>
                  <input type="time" name="openingTime" value={formData.openingTime} onChange={handleInputChange} 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Closing Time</label>
                  <input type="time" name="closingTime" value={formData.closingTime} onChange={handleInputChange} 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl" />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold mb-3 text-gray-700">📍 Address</h3>
                <div className="space-y-3">
                  <input type="text" name="address.street" value={formData.address.street} onChange={handleInputChange} 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl" placeholder="Street Address" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="text" name="address.city" value={formData.address.city} onChange={handleInputChange} 
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl" placeholder="City" />
                    <input type="text" name="address.state" value={formData.address.state} onChange={handleInputChange} 
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl" placeholder="State" />
                    <input type="text" name="address.pincode" value={formData.address.pincode} onChange={handleInputChange} 
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl" placeholder="Pincode" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={resetForm} 
                  className="px-6 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={submitting} 
                  className="bg-primary-600 text-white px-8 py-2.5 rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors">
                  {submitting ? 'Saving...' : editingTurf ? 'Update Turf' : 'Create Turf'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {turfs.map((turf) => (
            <div key={turf._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="h-48 bg-gray-200 relative">
                <img src={turf.images?.[0]?.url || 'https://via.placeholder.com/400x250'} alt={turf.name} className="w-full h-full object-cover" />
                {turf.images?.length > 1 && (
                  <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    +{turf.images.length - 1} more
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold mb-1">{turf.name}</h3>
                <p className="text-gray-500 text-xs mb-2">{turf.address?.city}, {turf.address?.state}</p>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{turf.description?.substring(0, 80)}...</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {turf.sports?.slice(0, 3).map(s => <span key={s} className="bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded-full">{s}</span>)}
                  {turf.sports?.length > 3 && <span className="text-xs text-gray-400">+{turf.sports.length - 3}</span>}
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                  <span>🕐 {turf.openingTime} - {turf.closingTime}</span>
                  <span>⭐ {turf.rating || 'New'}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(turf)} 
                    className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors">Edit</button>
                  <button onClick={() => handleDelete(turf._id)} 
                    className="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 text-sm font-medium transition-colors">Delete</button>
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