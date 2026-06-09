// services/emailService.js
const https = require('https');

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'noreply@bookmyturf.com';
const REPLY_EMAIL = process.env.BREVO_REPLY_EMAIL || 'support@bookmyturf.com';

const formatTime = (time) => {
  if (!time) return '';
  if (time === '23:59') return '11:59 PM';
  const [h, m] = time.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
};

// Core email sender using Brevo REST API
const sendViaBrevo = (emailData) => {
  return new Promise((resolve) => {
    if (!BREVO_API_KEY || BREVO_API_KEY === 'your_brevo_api_key_here' || BREVO_API_KEY === '') {
      console.log('⚠️ Brevo API key not configured. Email not sent.');
      console.log('📧 Would have sent to:', emailData.to);
      console.log('📧 Subject:', emailData.subject);
      resolve(true);
      return;
    }

    const recipientName = emailData.name && emailData.name.trim() !== '' ? emailData.name : 'User';

    const payload = JSON.stringify({
      sender: { name: 'BookMyTurf', email: SENDER_EMAIL },
      to: [{ email: emailData.to, name: recipientName }],
      replyTo: { email: REPLY_EMAIL, name: 'BookMyTurf Support' },
      subject: emailData.subject,
      htmlContent: emailData.html
    });

    console.log('📧 Sending email to:', emailData.to, 'Name:', recipientName);

    const options = {
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 201 || res.statusCode === 200) {
            const json = JSON.parse(responseBody);
            console.log('✅ Email sent! ID:', json.messageId);
            resolve(true);
          } else {
            const json = JSON.parse(responseBody);
            console.error('❌ Brevo API error:', json.code, json.message);
            resolve(false);
          }
        } catch (e) {
          console.error('❌ Parse error:', responseBody);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      resolve(false);
    });

    req.write(payload);
    req.end();
  });
};

const sendViaConsole = (emailData) => {
  console.log('=========================================');
  console.log('📧 EMAIL (TEST MODE - Not actually sent)');
  console.log(`   To: ${emailData.to}`);
  console.log(`   Subject: ${emailData.subject}`);
  console.log('=========================================');
  return Promise.resolve(true);
};

const sendBookingConfirmation = async (booking, user, turf) => {
  const bookingDate = new Date(booking.date).toLocaleDateString('en-IN', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  });
  
  const bookingTime = `${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`;
  
  const paymentBreakdown = `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; margin: 15px 0; border-radius: 12px;">
      <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">Payment Breakdown</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #475569;">
        <tr>
          <td style="padding: 6px 0;">Slot Rate:</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #1e293b;">₹${Math.round(booking.originalAmount / booking.totalHours)}/hr × ${booking.totalHours}hr(s)</td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">Subtotal:</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #1e293b;">₹${booking.originalAmount}</td>
        </tr>
        ${booking.discount > 0 ? `
        <tr style="color: #16a34a;">
          <td style="padding: 6px 0;">Discount (${booking.voucherCode}):</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 500;">-₹${booking.discount}</td>
        </tr>
        ` : ''}
        <tr style="border-top: 1px solid #e2e8f0;">
          <td style="padding: 10px 0 0 0; font-weight: 700; color: #0f172a;">Total Paid:</td>
          <td style="padding: 10px 0 0 0; text-align: right; font-weight: 700; color: #16a34a; font-size: 16px;">₹${booking.totalAmount}</td>
        </tr>
        ${booking.paymentStatus === 'advance_paid' ? `
        <tr>
          <td style="padding: 6px 0 0 0; color: #d97706; font-size: 13px;">Remaining Balance:</td>
          <td style="padding: 6px 0 0 0; text-align: right; color: #d97706; font-weight: 600; font-size: 13px;">₹${booking.remainingAmount} (Pay at venue)</td>
        </tr>
        ` : ''}
      </table>
    </div>
  `;

  const emailContent = {
    to: user.email,
    name: user.name || 'User',
    subject: `🎉 Booking Confirmed! ${booking.bookingNumber || 'BOOK'}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);">
          
          <!-- Hero Section -->
          <div style="background-color: #0f172a; background-image: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 48px 32px; text-align: center; border-bottom: 4px solid #16a34a;">
            <div style="display: inline-block; background-color: rgba(22, 163, 74, 0.15); color: #4ade80; padding: 8px 16px; border-radius: 30px; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 16px;">
              Reservation Confirmed
            </div>
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;">Your turf is ready.</h1>
            <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 15px;">Get your gear sorted, it's game time!</p>
          </div>
          
          <!-- Body Content -->
          <div style="padding: 32px;">
            <p style="margin: 0 0 24px 0; font-size: 16px; color: #334155; line-height: 1.5;">Hello <strong>${user.name || 'Player'}</strong>,</p>
            <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">Your booking at <strong>${turf.name}</strong> is locked in. We have shared the reference and access details below.</p>
            
            <!-- Ticket Design -->
            <div style="background-color: #fafafa; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
              <div style="background-color: #f1f5f9; padding: 12px 16px; border-bottom: 1px dashed #cbd5e1; text-align: center;">
                <span style="font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 1px; text-transform: uppercase;">BOOKING PASS ID</span>
                <div style="font-family: monospace; font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 4px;">
                  ${booking.bookingNumber || booking._id?.slice(-8)}
                </div>
              </div>
              
              <div style="padding: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="width: 70px; vertical-align: top; padding-right: 16px;">
                      <img src="${turf.images?.[0]?.url || 'https://images.unsplash.com/photo-1508098682722-e99c643e7f0b?w=100&h=100&fit=crop'}" alt="Turf" style="width: 70px; height: 70px; border-radius: 10px; object-fit: cover;">
                    </td>
                    <td style="vertical-align: top;">
                      <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: #0f172a;">${turf.name}</h4>
                      <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.4;">📍 ${turf.address?.street || ''}, ${turf.address?.city || ''}</p>
                    </td>
                  </tr>
                </table>
              </div>
            </div>
            
            <!-- Details Block -->
            <div style="margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">Session Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 50%; padding: 6px 8px 6px 0; vertical-align: top;">
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Sport</div>
                    <div style="font-size: 14px; font-weight: 600; color: #0f172a;">⚽ ${booking.sport}</div>
                  </td>
                  <td style="width: 50%; padding: 6px 0 6px 8px; vertical-align: top;">
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Date</div>
                    <div style="font-size: 14px; font-weight: 600; color: #0f172a;">📅 ${bookingDate}</div>
                  </td>
                </tr>
                <tr>
                  <td style="width: 50%; padding: 12px 8px 6px 0; vertical-align: top;">
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Time Slot</div>
                    <div style="font-size: 14px; font-weight: 600; color: #0f172a;">⏰ ${bookingTime}</div>
                  </td>
                  <td style="width: 50%; padding: 12px 0 6px 8px; vertical-align: top;">
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Duration</div>
                    <div style="font-size: 14px; font-weight: 600; color: #0f172a;">⏱️ ${booking.totalHours} hr(s)</div>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Payment -->
            ${paymentBreakdown}
            
            <!-- Venue Instructions -->
            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 24px; font-size: 13px; line-height: 1.5; color: #78350f;">
              <p style="margin: 0 0 6px 0; font-weight: 700; color: #92400e; font-size: 14px;">Important Instructions</p>
              <ul style="margin: 0; padding-left: 18px; color: #78350f;">
                <li style="margin-bottom: 4px;">Arrive at least 10 minutes prior to your schedule.</li>
                <li style="margin-bottom: 4px;">Ensure proper sporting footwear and gear are used.</li>
                ${booking.paymentStatus === 'advance_paid' ? `<li>Please settle the remaining amount of <strong>₹${booking.remainingAmount}</strong> directly at the front desk before entering.</li>` : '<li>No further payments are required. See you on the turf!</li>'}
              </ul>
            </div>
            
            <!-- CTAs -->
            <div style="text-align: center; margin: 32px 0 16px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://bookmyturf.com'}/profile" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 4px;">My Bookings</a>
              <a href="${process.env.FRONTEND_URL || 'https://bookmyturf.com'}/turf/${turf._id}" style="display: inline-block; background-color: #f1f5f9; color: #334155; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 4px; border: 1px solid #e2e8f0;">Venue Details</a>
            </div>

            <!-- Support -->
            <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; text-align: center; font-size: 13px; color: #64748b;">
              <p style="margin: 0 0 8px 0;">Need immediate help? Reach out to support:</p>
              <a href="mailto:support@bookmyturf.com" style="color: #16a34a; text-decoration: none; font-weight: 600; margin-right: 12px;">support@bookmyturf.com</a>
              <a href="tel:+919876543210" style="color: #16a34a; text-decoration: none; font-weight: 600;">+91 98765 43210</a>
            </div>

          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
            <p style="margin: 0 0 6px 0;">⚽ <strong>BookMyTurf</strong> — Your Sports Booking Partner</p>
            <p style="margin: 0;">© 2026 BookMyTurf. All rights reserved.</p>
            <p style="margin: 8px 0 0 0; font-size: 10px; color: #cbd5e1;">This is an automated system message. Please do not reply directly.</p>
          </div>
          
        </div>
      </body>
      </html>
    `
  };

  if (BREVO_API_KEY && BREVO_API_KEY !== 'your_brevo_api_key_here' && BREVO_API_KEY !== '') {
    return await sendViaBrevo(emailContent);
  } else {
    return await sendViaConsole(emailContent);
  }
};

const sendOTPEmail = async (email, otp, name) => {
  const emailContent = {
    to: email,
    name: name || 'User',
    subject: '🔐 Password Reset OTP - BookMyTurf',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset OTP</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;">
        <div style="max-width: 500px; margin: 40px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <div style="background-color: #1e293b; padding: 40px 32px; text-align: center; border-bottom: 4px solid #3b82f6;">
            <div style="font-size: 40px; margin-bottom: 12px;">🔐</div>
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Verification Code</h1>
            <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 14px;">Secure account recovery request</p>
          </div>
          
          <div style="padding: 32px; text-align: center;">
            <p style="margin: 0 0 12px 0; font-size: 15px; color: #334155;">Hello <strong>${name || 'User'}</strong>,</p>
            <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.5;">We received a request to access or reset credentials for your BookMyTurf account. Enter the verification code below to authorize this action.</p>
            
            <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 20px; border-radius: 12px; display: inline-block; min-width: 200px; margin-bottom: 24px;">
              <div style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #2563eb; line-height: 1;">
                ${otp}
              </div>
            </div>
            
            <p style="margin: 0 0 20px 0; color: #b45309; font-size: 13px; font-weight: 600;">⏰ This code will remain active for 10 minutes.</p>
            
            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 12px; border-radius: 8px; text-align: left;">
              <p style="margin: 0; font-size: 12px; color: #78350f; line-height: 1.4;">⚠️ <strong>Not you?</strong> If you did not make this request, you can safely ignore this email. Your security settings remain unaffected.</p>
            </div>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
            <p style="margin: 0;">© 2026 BookMyTurf. All rights reserved.</p>
          </div>
          
        </div>
      </body>
      </html>
    `
  };

  if (BREVO_API_KEY && BREVO_API_KEY !== 'your_brevo_api_key_here' && BREVO_API_KEY !== '') {
    return await sendViaBrevo(emailContent);
  } else {
    return await sendViaConsole(emailContent);
  }
};

const sendCustomEmail = async (to, subject, html, name = '') => {
  const emailContent = { 
    to, 
    name: name || 'User', 
    subject, 
    html 
  };
  
  if (BREVO_API_KEY && BREVO_API_KEY !== 'your_brevo_api_key_here' && BREVO_API_KEY !== '') {
    return await sendViaBrevo(emailContent);
  } else {
    return await sendViaConsole(emailContent);
  }
};

const sendCancellationConfirmation = async (booking, user, turf, refundAmount = null) => {
  const bookingDate = new Date(booking.date).toLocaleDateString('en-IN', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  });
  
  const emailContent = {
    to: user.email,
    name: user.name || 'User',
    subject: `❌ Booking Cancelled - ${booking.bookingNumber || booking._id?.slice(-8)}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Cancellation</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <div style="background-color: #1e293b; padding: 40px 32px; text-align: center; border-bottom: 4px solid #ef4444;">
            <div style="font-size: 40px; margin-bottom: 12px;">🛑</div>
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Reservation Cancelled</h1>
            <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 14px;">The slot is released and booking has been ended</p>
          </div>
          
          <div style="padding: 32px;">
            <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">Hello <strong>${user.name || 'User'}</strong>,</p>
            <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.5;">This email confirms that your booking has been cancelled at your request.</p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; margin-bottom: 24px;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Cancelled Reservation</p>
              <p style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">${turf.name}</p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">${bookingDate} @ ${formatTime(booking.startTime)}</p>
            </div>
            
            ${refundAmount ? `
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
              <p style="margin: 0 0 4px 0; font-weight: 700; color: #166534; font-size: 14px;">💰 Refund Information</p>
              <p style="margin: 0; font-size: 15px; color: #14532d;">Amount to be refunded: <strong>₹${refundAmount}</strong></p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #166534; line-height: 1.4;">The refund will clear to your original payment account within 5-7 business days.</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin-top: 32px;">
              <a href="${process.env.FRONTEND_URL || 'https://bookmyturf.com'}/profile" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">View Profile</a>
            </div>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
            <p style="margin: 0;">© 2026 BookMyTurf. All rights reserved.</p>
          </div>
          
        </div>
      </body>
      </html>
    `
  };
  
  if (BREVO_API_KEY && BREVO_API_KEY !== 'your_brevo_api_key_here' && BREVO_API_KEY !== '') {
    return await sendViaBrevo(emailContent);
  } else {
    return await sendViaConsole(emailContent);
  }
};

const sendBookingReminder = async (booking, user, turf) => {
  const bookingDate = new Date(booking.date).toLocaleDateString('en-IN', { 
    weekday: 'long', day: 'numeric', month: 'long' 
  });
  
  const hoursUntil = Math.ceil((new Date(booking.date) - new Date()) / (1000 * 60 * 60));
  
  const emailContent = {
    to: user.email,
    name: user.name || 'User',
    subject: `⏰ Reminder: Your booking at ${turf.name} starts in ${hoursUntil} hours!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Reminder</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <div style="background-color: #1e293b; padding: 40px 32px; text-align: center; border-bottom: 4px solid #f59e0b;">
            <div style="font-size: 40px; margin-bottom: 12px;">⏰</div>
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Upcoming Match</h1>
            <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 14px;">Your game starts in just ${hoursUntil} hours!</p>
          </div>
          
          <div style="padding: 32px;">
            <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">Hello <strong>${user.name || 'User'}</strong>,</p>
            <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.5;">This is a friendly reminder that you have a booking scheduled at <strong>${turf.name}</strong>.</p>
            
            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Scheduled Time</p>
              <p style="margin: 0; font-size: 16px; font-weight: 700; color: #78350f;">📅 ${bookingDate} at ${formatTime(booking.startTime)}</p>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #92400e;">⏱️ ${booking.totalHours} hour(s) | ⚽ ${booking.sport}</p>
            </div>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #1e293b; text-transform: uppercase;">Pre-Game Checklist</p>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #475569;">
                <tr>
                  <td style="padding: 4px 0; vertical-align: top; width: 24px; color: #16a34a;">✓</td>
                  <td style="padding: 4px 0; vertical-align: top;">Please arrive 10 minutes early to check-in and warm up.</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; vertical-align: top; width: 24px; color: #16a34a;">✓</td>
                  <td style="padding: 4px 0; vertical-align: top;">Carry your reference code or pass for venue verification.</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; vertical-align: top; width: 24px; color: #16a34a;">✓</td>
                  <td style="padding: 4px 0; vertical-align: top;">Ensure appropriate non-marking sports shoes/gear.</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin-top: 32px;">
              <a href="${process.env.FRONTEND_URL || 'https://bookmyturf.com'}/turf/${turf._id}" style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">Get Directions</a>
            </div>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
            <p style="margin: 0;">© 2026 BookMyTurf. All rights reserved.</p>
          </div>
          
        </div>
      </body>
      </html>
    `
  };
  
  if (BREVO_API_KEY && BREVO_API_KEY !== 'your_brevo_api_key_here' && BREVO_API_KEY !== '') {
    return await sendViaBrevo(emailContent);
  } else {
    return await sendViaConsole(emailContent);
  }
};

module.exports = { 
  sendBookingConfirmation, 
  sendOTPEmail, 
  sendCustomEmail,
  sendCancellationConfirmation,
  sendBookingReminder
};