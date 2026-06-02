import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { turfService } from '../services/turfService';

const ALL_SPORTS = [
  { label: 'Football', emoji: '⚽', value: 'Football' },
  { label: 'Cricket', emoji: '🏏', value: 'Cricket' },
  { label: 'Volleyball', emoji: '🏐', value: 'Volleyball' },
  { label: 'Basketball', emoji: '🏀', value: 'Basketball' },
  { label: 'Tennis', emoji: '🎾', value: 'Tennis' },
  { label: 'Badminton', emoji: '🏸', value: 'Badminton' },
];

const SkeletonCard = () => (
  <div className="bg-white rounded-xl shadow-md overflow-hidden">
    <div className="skeleton h-44 w-full" />
    <div className="p-4 space-y-2">
      <div className="skeleton h-5 w-3/4" />
      <div className="skeleton h-4 w-1/2" />
    </div>
  </div>
);

const formatTime = (time24) => {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const TurfCard = ({ turf }) => (
  <Link to={`/turf/${turf._id}`}
    className="bg-white rounded-xl shadow-md overflow-hidden block group active:scale-[0.98] transition-transform">
    <div className="relative h-60">
      <img
        src={turf.images?.[0]?.url || 'https://images.unsplash.com/photo-1508098682722-e99c643e7f0b?w=400&h=250&fit=crop'}
        alt={turf.name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-2 left-3 flex flex-wrap gap-1">
        {turf.sports?.slice(0, 3).map(s => (
          <span key={s} className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full">{s}</span>
        ))}
      </div>
    </div>
    <div className="p-4">
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-bold text-gray-900 text-base">{turf.name}</h3>
        <span className="text-yellow-500 text-sm font-bold">★ {turf.rating?.toFixed(1) || 'New'}</span>
      </div>
      <p className="text-gray-500 text-xs">📍{turf.address?.street}, {turf.address?.city}, {turf.address?.state}</p>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">🕐 {formatTime(turf.openingTime)} – {formatTime(turf.closingTime)}</span>
        <span className="text-primary-600 font-semibold text-sm">Book →</span>
      </div>
    </div>
  </Link>
);

const TurfsPage = () => {
  const [turfs, setTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ sport: '', rating: '' });
  const [searchParams] = useSearchParams();

  const fetchTurfs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.sport) params.sport = filters.sport;
      if (filters.rating) params.rating = filters.rating;
      const response = await turfService.getAllTurfs(params);
      setTurfs(response.data.turfs || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchTurfs(); }, [fetchTurfs]);
  useEffect(() => {
    const sport = searchParams.get('sport');
    if (sport) setFilters(f => ({ ...f, sport }));
  }, [searchParams]);

  // Only show sports that exist in turfs
  const availableSports = ALL_SPORTS.filter(sport =>
    turfs.some(turf => turf.sports?.includes(sport.value))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Original font style */}
      <div className="bg-gradient-to-r from-primary-800 to-primary-600 text-white py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-display text-5xl mb-1">FIND YOUR PERFECT TURF</h1>
          <p className="text-green-200 text-base">Browse, filter, and book in seconds</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filter bar */}
        <div className="bg-white rounded-xl h-16 shadow-sm p-4 mb-6">
          {/* Sport pills - Horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
            <button
              onClick={() => setFilters(f => ({ ...f, sport: '' }))}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${!filters.sport ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600'}`}>
              All
            </button>
            {availableSports.map(s => (
              <button key={s.value}
                onClick={() => setFilters(f => ({ ...f, sport: f.sport === s.value ? '' : s.value }))}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${filters.sport === s.value ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600'}`}>
                <span>{s.emoji}</span> {s.label}
              </button>
            ))}
          </div>

        
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-gray-500">
          {loading ? 'Loading...' : `${turfs.length} turf${turfs.length !== 1 ? 's' : ''} found`}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : turfs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-8">
            {turfs.map(turf => <TurfCard key={turf._id} turf={turf} />)}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏟️</div>
            <h3 className="text-xl font-bold text-gray-600 mb-2">No Turfs Found</h3>
            <p className="text-gray-400">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TurfsPage;