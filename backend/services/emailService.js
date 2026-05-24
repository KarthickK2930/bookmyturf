const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendBookingConfirmation = async (booking, user, turf) => {
  const mailOptions = {
    from: `"BookMyTurf" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: '✅ Booking Confirmed - BookMyTurf',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">🏟️ Booking Confirmed!</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
          <p>Hello <strong>${user.name || 'User'}</strong>,</p>
          <p>Your turf booking has been confirmed. Here are the details:</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb;">
            <h3 style="margin-top: 0; color: #16a34a;">📋 Booking Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #6b7280;">Booking ID</td><td style="font-weight: bold;">${booking._id}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Turf</td><td style="font-weight: bold;">${turf.name}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Sport</td><td style="font-weight: bold;">${booking.sport}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Date</td><td style="font-weight: bold;">${new Date(booking.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Time</td><td style="font-weight: bold;">${booking.startTime} - ${booking.endTime}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Duration</td><td style="font-weight: bold;">${booking.totalHours} hour(s)</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Amount Paid</td><td style="font-weight: bold; color: #16a34a;">₹${booking.paymentStatus === 'full_paid' ? booking.totalAmount : booking.advanceAmount}</td></tr>
              ${booking.paymentStatus === 'advance_paid' ? `<tr><td style="padding: 8px 0; color: #6b7280;">Balance at Venue</td><td style="font-weight: bold; color: #ef4444;">₹${booking.remainingAmount}</td></tr>` : ''}
            </table>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4 style="margin-top: 0;">📍 Venue Address</h4>
            <p style="margin: 5px 0;">${turf.address?.street}, ${turf.address?.city}, ${turf.address?.state} - ${turf.address?.pincode}</p>
            <p style="margin: 5px 0;">🕐 Timings: ${turf.openingTime} - ${turf.closingTime}</p>
          </div>
          
          <p>Please arrive 10 minutes before your slot time.</p>
          <p>For any queries, contact us at <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a></p>
          
          <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px;">Thank you for choosing BookMyTurf!</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Booking confirmation email sent to:', user.email);
    return true;
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    return false;
  }
};

module.exports = { sendBookingConfirmation };