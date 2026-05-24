import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { turfService } from '../services/turfService';
import LoadingSpinner from '../components/common/LoadingSpinner';

const HomePage = () => {
  const [featuredTurfs, setFeaturedTurfs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTurfs = async () => {
      try {
        const response = await turfService.getAllTurfs();
        setFeaturedTurfs(response.data.turfs?.slice(0, 6) || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchTurfs();
  }, []);

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-24 text-center">
        <h1 className="text-5xl font-bold mb-4">Book Your Perfect Turf</h1>
        <p className="text-xl mb-8">Find and book the best sports turfs near you</p>
        <Link to="/turfs" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-bold text-lg hover:bg-gray-100">Find Turfs</Link>
      </section>
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div><div className="text-4xl font-bold text-primary-600">50+</div><div className="text-gray-600">Turfs</div></div>
            <div><div className="text-4xl font-bold text-primary-600">10K+</div><div className="text-gray-600">Customers</div></div>
            <div><div className="text-4xl font-bold text-primary-600">5+</div><div className="text-gray-600">Sports</div></div>
            <div><div className="text-4xl font-bold text-primary-600">24/7</div><div className="text-gray-600">Support</div></div>
          </div>
        </div>
      </section>
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Featured Turfs</h2>
          {loading ? <LoadingSpinner /> : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredTurfs.map(turf => (
                <Link key={turf._id} to={`/turf/${turf._id}`} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
                  <img src={turf.images?.[0]?.url || 'https://via.placeholder.com/400x250'} alt={turf.name} className="w-full h-48 object-cover" />
                  <div className="p-6">
                    <h3 className="text-xl font-semibold">{turf.name}</h3>
                    <p className="text-gray-600 text-sm">{turf.address?.city}</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-primary-600 font-bold">₹{turf.pricePerHour}/hr</span>
                      <span className="text-yellow-500">★ {turf.rating?.toFixed(1) || 'New'}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
export default HomePage;