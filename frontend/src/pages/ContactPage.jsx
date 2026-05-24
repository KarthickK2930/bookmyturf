import React, { useState } from 'react';
const ContactPage = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = (e) => { e.preventDefault(); setSubmitted(true); setTimeout(() => setSubmitted(false), 3000); };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-12">Contact Us</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-white rounded-lg shadow-md p-8">
            {submitted && <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4">Message sent successfully!</div>}
            <form onSubmit={handleSubmit}>
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Name" className="w-full px-4 py-2 border rounded-lg mb-4" required />
              <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="Email" className="w-full px-4 py-2 border rounded-lg mb-4" required />
              <textarea value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} rows="4" placeholder="Message" className="w-full px-4 py-2 border rounded-lg mb-4" required />
              <button type="submit" className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700">Send Message</button>
            </form>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-8">
              <h3 className="font-semibold">Phone</h3><p className="text-gray-600">+91 98765 43210</p>
              <h3 className="font-semibold mt-4">Email</h3><p className="text-gray-600">info@bookmyturf.com</p>
              <h3 className="font-semibold mt-4">Address</h3><p className="text-gray-600">Mumbai, Maharashtra</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ContactPage;