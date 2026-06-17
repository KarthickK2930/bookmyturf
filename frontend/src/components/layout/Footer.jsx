import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="bg-gray-900 text-white pt-8 pb-4">
    <div className="max-w-7xl mx-auto px-4">
      
      {/* Logo - Full width on mobile */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-lg">⚽</span>
          </div>
          <span className="font-bold text-xl text-primary-400">BOOKMYTURFVNR</span>
        </div>
        <p className="text-gray-400 text-xs px-4">Your one-stop platform for booking premium sports turfs online.</p>
      </div>

      {/* Links - 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6 text-sm">
        
        {/* Quick Links */}
        <div className="text-center md:text-left">
          <h4 className="font-bold text-white mb-3 text-xs uppercase tracking-wider">Quick Links</h4>
          <ul className="space-y-1.5 text-gray-400 text-xs">
            <li><Link to="/" className="hover:text-primary-400">🏠 Home</Link></li>
            <li><Link to="/turfs" className="hover:text-primary-400">🏟️ Turfs</Link></li>
            <li><Link to="/about" className="hover:text-primary-400">ℹ️ About</Link></li>
            <li><Link to="/contact" className="hover:text-primary-400">📞 Contact</Link></li>
          </ul>
        </div>

        {/* Sports */}
        <div className="text-center md:text-left">
          <h4 className="font-bold text-white mb-3 text-xs uppercase tracking-wider">Sports</h4>
          <ul className="space-y-1.5 text-gray-400 text-xs">
            <li>⚽ Football</li>
            <li>🏏 Cricket</li>
            <li>🏐 Volleyball</li>
            <li>🏀 Basketball</li>
            <li>🎾 Tennis</li>
            <li>🏸 Badminton</li>
          </ul>
        </div>

        {/* Contact */}
        <div className="text-center md:text-left">
          <h4 className="font-bold text-white mb-3 text-xs uppercase tracking-wider">Contact</h4>
          <ul className="space-y-1.5 text-gray-400 text-xs">
            <li>📞 +91 98765 43210</li>
            <li>📧 info@bookmyturf.com</li>
            <li>📍 Mumbai, India</li>
          </ul>
        </div>

        {/* Follow Us - Social Media Icons */}
        <div className="text-center md:text-left">
          <h4 className="font-bold text-white mb-3 text-xs uppercase tracking-wider">Follow Us</h4>
          <div className="flex justify-center md:justify-start gap-3">
            {/* Facebook */}
            <a href="https://facebook.com/bookmyturf" target="_blank" rel="noopener noreferrer" 
              className="w-9 h-9 bg-[#1877F2] rounded-full flex items-center justify-center hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            {/* Instagram */}
            <a href="https://instagram.com/bookmyturf" target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] rounded-full flex items-center justify-center hover:scale-110 transition-transform">
              <svg className="w-5 h-5" fill="white" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            {/* Twitter/X */}
            <a href="https://twitter.com/bookmyturf" target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 bg-black rounded-full flex items-center justify-center hover:scale-110 transition-transform border border-gray-700">
              <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-800 pt-3 text-center">
        <p className="text-gray-500 text-xs">© 2026 BookMyTurfVNR. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;