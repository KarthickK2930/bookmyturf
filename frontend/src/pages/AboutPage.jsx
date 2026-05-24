import React from 'react';
const AboutPage = () => (
  <div className="min-h-screen bg-white">
    <div className="bg-primary-600 text-white py-20 text-center">
      <h1 className="text-4xl font-bold mb-4">About BookMyTurf</h1>
      <p className="text-xl">Your trusted platform for sports turf booking</p>
    </div>
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
          <p className="text-gray-600 text-lg">We make sports turf booking as easy as booking a movie ticket. Connect with the best turf facilities in your city.</p>
        </div>
        <div>
          <h2 className="text-3xl font-bold mb-6">Why Choose Us?</h2>
          <ul className="space-y-3 text-gray-600">
            <li>✓ Easy online booking in minutes</li>
            <li>✓ Real-time slot availability</li>
            <li>✓ Multiple sports options</li>
            <li>✓ Secure online payments</li>
            <li>✓ Instant booking confirmation</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);
export default AboutPage;