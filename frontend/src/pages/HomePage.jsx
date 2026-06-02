import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { turfService } from '../services/turfService';

const ALL_SPORTS = [
  { label: 'Football', emoji: '⚽', value: 'Football' },
  { label: 'Cricket', emoji: '🏏', value: 'Cricket' },
  { label: 'Volleyball', emoji: '🏐', value: 'Volleyball' },
  { label: 'Basketball', emoji: '🏀', value: 'Basketball' },
  { label: 'Tennis', emoji: '🎾', value: 'Tennis' },
  { label: 'Badminton', emoji: '🏸', value: 'Badminton' },
];

const BALLS = ['⚽', '🏏', '🏐', '🏀', '🎾', '🏸'];

const BouncingBall = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % BALLS.length), 1200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-end justify-center h-16 mb-4">
      <span className="text-5xl animate-bounce-ball select-none">{BALLS[idx]}</span>
    </div>
  );
};


const TurfCard = ({ turf }) => (
  <Link to={`/turf/${turf._id}`} className="bg-white rounded-xl shadow-md overflow-hidden block group active:scale-[0.98] transition-transform">
    <div className="relative h-60">
      <img
        src={turf.images?.[0]?.url || 'https://images.unsplash.com/photo-1508098682722-e99c643e7f0b?w=400&h=250&fit=crop'}
        alt={turf.name}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-2 left-3 flex flex-wrap gap-1">
        {turf.sports?.slice(0, 3).map(s => (
          <span key={s} className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full">{s}</span>
        ))}
      </div>
    </div>
    <div className="p-4">
      <h3 className="font-bold text-gray-900 text-base">{turf.name}</h3>
      <p className="text-gray-500 text-xs mt-1">📍{turf.address?.street}, {turf.address?.city}, {turf.address?.state}</p>
      <div className="flex items-center justify-between mt-3">
        {/* <span className="text-primary-600 font-bold text-lg">₹{turf.pricePerHour || '--'}/hr</span> */}
        <span className="text-yellow-500 text-sm">★ {turf.rating?.toFixed(1) || 'New'}</span>
      </div>
    </div>
  </Link>
);

const HomePage = () => {
  const [turfs, setTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSport, setActiveSport] = useState('');
  const { user, isAuthenticated } = useSelector(s => s.auth);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTurfs = async () => {
      try {
        const response = await turfService.getAllTurfs();
        setTurfs(response.data.turfs || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchTurfs();
  }, []);

  const handleSportFilter = (sport) => {
    const newSport = activeSport === sport ? '' : sport;
    setActiveSport(newSport);
    navigate(`/turfs${newSport ? `?sport=${newSport}` : ''}`);
  };

  // Calculate stats from actual data
  const totalSports = [...new Set(turfs.flatMap(t => t.sports || []))].length;
  const totalLocations = [...new Set(turfs.map(t => t.address?.city).filter(Boolean))].length;

  // ✅ ONLY show sports that exist in at least one turf
  const availableSports = ALL_SPORTS.filter(sport => 
    turfs.some(turf => turf.sports?.includes(sport.value))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HERO */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 text-center relative z-10">
		          <BouncingBall />
          

          {isAuthenticated && (
            <p className="text-green-200 text-sm mb-2">👋 Welcome back, {user?.name?.split(' ')[0]}!</p>
          )}
          
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3 leading-tight">
            {isAuthenticated ? 'READY TO PLAY?':''}
          </h1>
          <p className="text-green-100 text-base md:text-lg mb-6 max-w-md mx-auto">
            Premium sports turf for Football, Cricket & more. Book your slot in seconds!
          </p>

          {/* Sport Chips - Only show available sports */}
          {availableSports.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {availableSports.map(s => (
                <button key={s.value} onClick={() => handleSportFilter(s.value)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all ${
                    activeSport === s.value 
                      ? 'bg-white text-primary-700 border-white' 
                      : 'border-white/40 text-white hover:border-white'
                  }`}>
                  <span>{s.emoji}</span> {s.label}
                </button>
              ))}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/turfs"
              className="bg-white text-primary-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-green-50 transition-colors shadow-lg">
              🏟️ View All Turfs
            </Link>
            {!isAuthenticated && (
              <Link to="/login"
                className="bg-accent text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors shadow-lg">
                🔐 Login to Book
              </Link>
            )}
          </div>
        </div>

        <svg className="w-full block" viewBox="0 0 1440 40" fill="none" preserveAspectRatio="none" style={{marginBottom: '-1px', height: '30px'}}>
          <path d="M0 40 Q360 0 720 20 Q1080 40 1440 10 L1440 40 Z" fill="#f9fafb"/>
        </svg>
      </section>

      {/* STATS */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl mb-1">🏟️</div>
              <div className="font-bold text-2xl text-primary-600">{turfs.length}</div>
              <div className="text-gray-500 text-xs">Turfs</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl mb-1">⚽</div>
              <div className="font-bold text-2xl text-primary-600">{totalSports}</div>
              <div className="text-gray-500 text-xs">Sports</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <div className="text-2xl mb-1">📍</div>
              <div className="font-bold text-2xl text-primary-600">{totalLocations}</div>
              <div className="text-gray-500 text-xs">Locations</div>
            </div>
          </div>
        </div>
      </section>

      {/* OUR TURFS */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-extrabold text-gray-900">🏟️ Our Turfs</h2>
            {turfs.length > 3 && (
              <Link to="/turfs" className="text-primary-600 font-semibold text-sm">View All →</Link>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
                  <div className="h-40 bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : turfs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {turfs.map(turf => (
                <TurfCard key={turf._id} turf={turf} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">🏟️</div>
              <p className="text-gray-500">No turfs available yet.</p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default HomePage;