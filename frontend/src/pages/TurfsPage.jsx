import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { turfService } from '../services/turfService';
import LoadingSpinner from '../components/common/LoadingSpinner';

const TurfsPage = () => {
  const [turfs, setTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ sport: '', rating: '' });

  const fetchTurfs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.sport) params.sport = filters.sport;
      if (filters.rating) params.rating = filters.rating;
      const response = await turfService.getAllTurfs(params);
      setTurfs(response.data.turfs);
    } catch (err) {
      console.error('Failed to load turfs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchTurfs(); }, [fetchTurfs]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-primary-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Find Your Perfect Turf</h1>
          <p className="text-primary-100 text-lg">Browse and book the best sports turfs</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-wrap gap-4">
            <select value={filters.sport} onChange={(e) => setFilters({ ...filters, sport: e.target.value })} className="px-4 py-2 border rounded-lg">
              <option value="">All Sports</option>
              <option value="Football">Football</option>
              <option value="Cricket">Cricket</option>
              <option value="Volleyball">Volleyball</option>
              <option value="Basketball">Basketball</option>
              <option value="Tennis">Tennis</option>
              <option value="Badminton">Badminton</option>
            </select>
            <select value={filters.rating} onChange={(e) => setFilters({ ...filters, rating: e.target.value })} className="px-4 py-2 border rounded-lg">
              <option value="">All Ratings</option>
              <option value="4">4+ Stars</option>
              <option value="3">3+ Stars</option>
            </select>
            <button onClick={() => setFilters({ sport: '', rating: '' })} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Clear</button>
          </div>
        </div>

        <div className="mb-4 text-gray-600">{turfs.length} turfs found</div>

        {loading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {turfs.map((turf) => (
              <Link key={turf._id} to={`/turf/${turf._id}`} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="relative">
                  <img src={turf.images?.[0]?.url || 'https://via.placeholder.com/400x250?text=Turf'} alt={turf.name} className="w-full h-48 object-cover" />
                  <div className="absolute top-2 right-2 bg-white px-3 py-1 rounded-full text-sm font-bold text-primary-600">₹{turf.pricePerHour}/hr</div>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold">{turf.name}</h3>
                    <span className="text-yellow-500">★ {turf.rating?.toFixed(1) || 'New'}</span>
                  </div>
                  <p className="text-gray-500 text-sm mb-3">📍 {turf.address?.city}, {turf.address?.state}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {turf.sports?.slice(0, 3).map(sport => (
                      <span key={sport} className="bg-primary-50 text-primary-700 text-xs px-2 py-1 rounded-full">{sport}</span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t text-sm">
                    <span className="text-gray-500">🕐 {turf.openingTime} - {turf.closingTime}</span>
                    <span className="text-primary-600 font-semibold">View Details →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TurfsPage;