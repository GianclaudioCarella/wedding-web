// Test script for Resend email
// Run with: node test-email.js

const { Resend } = require('resend');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  console.log('🚀 Testing Resend email...\n');
  
  // Check if API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ Error: RESEND_API_KEY not found in .env.local');
    return;
  }

  console.log('✓ API Key found');
  console.log(`✓ From email: ${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}\n`);

  const testData = {
    from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    to: 'gianclaudio.gc@gmail.com', // Change this to your email
    subject: '✨ Test - RSVP Confirmation',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background-color: #fafafa; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
          .title { font-size: 24px; font-weight: bold; color: #1a1a1a; margin-bottom: 20px; }
          .message { font-size: 16px; color: #4a4a4a; line-height: 1.6; }
          .badge { background: #d4f1dd; color: #1a6b3a; padding: 10px 20px; border-radius: 6px; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="title">🎉 Test Email - RSVP System</div>
          <div class="message">
            <p>This is a test email from your Wedding RSVP system.</p>
            <div class="badge">✓ Configuration is working!</div>
            <p>If you received this email, your Resend integration is set up correctly.</p>
            <p><strong>Next steps:</strong></p>
            <ul>
              <li>Update the test email address in test-email.js</li>
              <li>Test a real RSVP submission on your website</li>
              <li>Customize the email template in /api/send-rsvp-email/route.ts</li>
            </ul>
          </div>
        </div>
      </body>
      </html>
    `
  };

  console.log('📧 Sending test email to:', testData.to);
  console.log('⚠️  Change the "to" email in test-email.js to receive the test!\n');

  try {
    const { data, error } = await resend.emails.send(testData);

    if (error) {
      console.error('❌ Error sending email:', error);
      console.error('\nTroubleshooting:');
      console.error('1. Check if your API key is correct');
      console.error('2. If using custom domain, verify it in Resend dashboard');
      console.error('3. Try using onboarding@resend.dev as RESEND_FROM_EMAIL');
      return;
    }

    console.log('✅ Email sent successfully!');
    console.log('📬 Email ID:', data.id);
    console.log('\n🔍 Check your email inbox (and spam folder)');
    console.log('🌐 Monitor at: https://resend.com/emails\n');

  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

testEmail();
