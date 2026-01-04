import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { guestName, guestEmail, attending, eventDate, eventLocation } = await request.json();

    // Validate required fields
    if (!guestName || !guestEmail || !attending) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate email HTML based on response
    const emailHtml = generateEmailHtml(guestName, attending, eventDate, eventLocation);
    const subject = attending === 'yes' 
      ? '✨ Thank you for confirming your presence!' 
      : attending === 'no'
      ? 'Thank you for letting us know'
      : 'Thank you for your response';

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: guestEmail,
      subject: subject,
      html: emailHtml,
      text: generatePlainTextEmail(guestName, attending, eventDate, eventLocation),
      replyTo: process.env.RESEND_REPLY_TO_EMAIL || process.env.RESEND_FROM_EMAIL,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

function generateEmailHtml(
  guestName: string, 
  attending: string,
  eventDate?: string,
  eventLocation?: string
): string {
  const isAttending = attending === 'yes';
  const isMaybe = attending === 'maybe';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RSVP Confirmation</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #fafafa;
      color: #1a1a1a;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding: 40px 20px 20px;
      background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%);
    }
    .header img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .content {
      padding: 40px 30px;
      line-height: 1.6;
    }
    .greeting {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #1a1a1a;
      letter-spacing: 0.02em;
    }
    .message {
      font-size: 16px;
      color: #4a4a4a;
      margin-bottom: 30px;
    }
    .status-badge {
      display: inline-block;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
    }
    .status-yes {
      background-color: #d4f1dd;
      color: #1a6b3a;
      border: 2px solid #b8e5c7;
    }
    .status-maybe {
      background-color: #fff4d1;
      color: #8b6914;
      border: 2px solid #ffe49e;
    }
    .status-no {
      background-color: #fee;
      color: #991b1b;
      border: 2px solid #fdd;
    }
    .event-details {
      background-color: #f9f9f9;
      border-left: 4px solid #1a1a1a;
      padding: 20px;
      margin: 30px 0;
      border-radius: 4px;
    }
    .event-details h3 {
      margin: 0 0 15px 0;
      font-size: 18px;
      color: #1a1a1a;
    }
    .event-details p {
      margin: 8px 0;
      color: #4a4a4a;
      font-size: 15px;
    }
    .event-details strong {
      color: #1a1a1a;
      font-weight: 600;
    }
    .footer {
      padding: 30px;
      text-align: center;
      background-color: #f9f9f9;
      border-top: 1px solid #efefef;
      font-size: 14px;
      color: #6a6a6a;
    }
    .footer p {
      margin: 5px 0;
    }
    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      background-color: #1a1a1a;
      color: #ffffff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      transition: background-color 0.3s;
    }
    .divider {
      height: 1px;
      background-color: #e5e5e5;
      margin: 30px 0;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 20px;
        border-radius: 8px;
      }
      .content {
        padding: 30px 20px;
      }
      .greeting {
        font-size: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/savethedate.png" alt="Save the Date" style="max-width: 300px; width: 100%;" />
    </div>
    
    <div class="content">
      <div class="greeting">Dear ${guestName},</div>
      
      ${isAttending ? `
        <div class="message">
          <p>🎉 <strong>Thank you so much for confirming your presence!</strong></p>
          <p>We're absolutely thrilled that you'll be joining us on our special day. Your presence means the world to us.</p>
        </div>
        
        <div style="text-align: center;">
          <span class="status-badge status-yes">✓ Attending</span>
        </div>
        
        ${eventDate || eventLocation ? `
          <div class="event-details">
            <h3>📅 Event Details</h3>
            ${eventDate ? `<p><strong>Date:</strong> ${eventDate}</p>` : ''}
            ${eventLocation ? `<p><strong>Location:</strong> ${eventLocation}</p>` : ''}
          </div>
        ` : ''}
        
        <div class="message">
          <p><strong>What to expect next:</strong></p>
          <ul style="padding-left: 20px; color: #4a4a4a;">
            <li>You'll receive more details about the venue and schedule closer to the date</li>
            <li>If you need to update your RSVP, you can do so using the link in your original invitation</li>
            <li>Feel free to reach out if you have any questions</li>
          </ul>
        </div>
      ` : isMaybe ? `
        <div class="message">
          <p>Thank you for your response. We understand that plans can be uncertain!</p>
          <p>We've noted that you might be able to attend. We hope you can make it, and we'll keep you updated with all the details.</p>
        </div>
        
        <div style="text-align: center;">
          <span class="status-badge status-maybe">? Maybe</span>
        </div>
        
        <div class="message">
          <p>Please let us know as soon as your plans are confirmed. You can update your RSVP anytime using the link in your original invitation.</p>
        </div>
      ` : `
        <div class="message">
          <p>Thank you for letting us know.</p>
          <p>We're sorry you won't be able to join us, but we completely understand. You'll be missed on our special day.</p>
        </div>
        
        <div style="text-align: center;">
          <span class="status-badge status-no">✗ Unable to Attend</span>
        </div>
        
        <div class="message">
          <p>If your plans change, you can always update your RSVP using the link in your original invitation. We'd love to have you there if circumstances allow!</p>
        </div>
      `}
      
      <div class="divider"></div>
      
      <div class="message" style="text-align: center; color: #6a6a6a; font-size: 15px;">
        <p>With love and gratitude,</p>
        <p style="font-weight: 600; color: #1a1a1a; font-size: 18px; margin-top: 10px;">The Happy Couple 💕</p>
      </div>
    </div>
    
    <div class="footer">
      <p>This is an automated confirmation email.</p>
      <p>If you have any questions, please reply to this email.</p>
      <p style="margin-top: 15px; font-size: 12px;">
        You received this email because you submitted an RSVP for our wedding.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function generatePlainTextEmail(
  guestName: string,
  attending: string,
  eventDate?: string,
  eventLocation?: string
): string {
  const isAttending = attending === 'yes';
  const isMaybe = attending === 'maybe';

  let message = `Dear ${guestName},\n\n`;

  if (isAttending) {
    message += `Thank you so much for confirming your presence!\n\n`;
    message += `We're absolutely thrilled that you'll be joining us on our special day. Your presence means the world to us.\n\n`;
    message += `Status: Attending\n\n`;
    
    if (eventDate || eventLocation) {
      message += `EVENT DETAILS\n`;
      if (eventDate) message += `Date: ${eventDate}\n`;
      if (eventLocation) message += `Location: ${eventLocation}\n`;
      message += `\n`;
    }
    
    message += `WHAT TO EXPECT NEXT:\n`;
    message += `- You'll receive more details about the venue and schedule closer to the date\n`;
    message += `- If you need to update your RSVP, you can do so using the link in your original invitation\n`;
    message += `- Feel free to reach out if you have any questions\n\n`;
  } else if (isMaybe) {
    message += `Thank you for your response. We understand that plans can be uncertain!\n\n`;
    message += `We've noted that you might be able to attend. We hope you can make it, and we'll keep you updated with all the details.\n\n`;
    message += `Status: Maybe\n\n`;
    message += `Please let us know as soon as your plans are confirmed. You can update your RSVP anytime using the link in your original invitation.\n\n`;
  } else {
    message += `Thank you for letting us know.\n\n`;
    message += `We're sorry you won't be able to join us, but we completely understand. You'll be missed on our special day.\n\n`;
    message += `Status: Unable to Attend\n\n`;
    message += `If your plans change, you can always update your RSVP using the link in your original invitation. We'd love to have you there if circumstances allow!\n\n`;
  }

  message += `With love and gratitude,\n`;
  message += `The Happy Couple\n\n`;
  message += `---\n`;
  message += `This is an automated confirmation email.\n`;
  message += `If you have any questions, please reply to this email.\n`;
  message += `You received this email because you submitted an RSVP for our wedding.\n`;

  return message;
}
