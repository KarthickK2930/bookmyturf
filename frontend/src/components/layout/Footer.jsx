import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="bg-gray-900 text-white py-8">
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-xl font-bold mb-4">BookMyTurf</h3>
          <p className="text-gray-400 text-sm">Your one-stop platform for booking sports turfs online.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-4">Quick Links</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link to="/" className="hover:text-white">Home</Link></li>
            <li><Link to="/turfs" className="hover:text-white">Find Turfs</Link></li>
            <li><Link to="/about" className="hover:text-white">About</Link></li>
            <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-4">Sports</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>Football</li><li>Cricket</li><li>Volleyball</li><li>Basketball</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-4">Contact</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>📞 +91 98765 43210</li>
            <li>📧 info@bookmyturf.com</li>
            <li>📍 Mumbai, India</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-500 text-sm">
        &copy; 2026 BookMyTurf. All rights reserved.
      </div>
    </div>
  </footer>
);
export default Footer;