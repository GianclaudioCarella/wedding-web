import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    console.log('=== Email API called ===');
    const { guestName, guestEmail, attending, eventDate, eventLocation, locale = 'en' } = await request.json();
    console.log('Request data:', { guestName, guestEmail, attending, locale });

    // Validate required fields
    if (!guestName || !guestEmail || !attending) {
      console.error('Missing required fields:', { guestName, guestEmail, attending });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check API key
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured!');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    console.log('Using from email:', process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev');

    // Get translations
    const t = getTranslations(locale);

    // Generate email HTML
    const emailHtml = generateEmailHtml(guestName, eventDate, eventLocation, locale);
    const subject = t.subject;

    console.log('Sending email with subject:', subject);

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: guestEmail,
      subject: subject,
      html: emailHtml,
      text: generatePlainTextEmail(guestName, eventDate, eventLocation, locale),
      replyTo: process.env.RESEND_REPLY_TO_EMAIL || process.env.RESEND_FROM_EMAIL,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Email sent successfully! ID:', data?.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

type Locale = 'en' | 'es' | 'pt';

interface EmailTranslations {
  subject: string;
  dear: string;
  thankYou: string;
  thrilled: string;
  attending: string;
  eventDetailsTitle: string;
  date: string;
  location: string;
  whatToExpect: string;
  expectItem1: string;
  expectItem2: string;
  expectItem3: string;
  withLove: string;
  couple: string;
  automated: string;
  questions: string;
  received: string;
}

function getTranslations(locale: string): EmailTranslations {
  const translations: Record<Locale, EmailTranslations> = {
    en: {
      subject: '✨ Thank you for confirming your presence!',
      dear: 'Dear',
      thankYou: 'Thank you so much for confirming your presence!',
      thrilled: "We're absolutely thrilled that you'll be joining us on our special day. Your presence means the world to us.",
      attending: 'Attending',
      eventDetailsTitle: 'Event Details',
      date: 'Date',
      location: 'Location',
      whatToExpect: 'What to expect next:',
      expectItem1: "You'll receive more details about the venue and schedule closer to the date",
      expectItem2: 'If you need to update your RSVP, you can do so using the link in your original invitation',
      expectItem3: 'Feel free to reach out if you have any questions',
      withLove: 'With love,',
      couple: 'Gian & Cat 💕',
      automated: 'This is an automated confirmation email.',
      questions: 'If you have any questions, please reply to this email.',
      received: 'You received this email because you submitted an RSVP for our wedding.',
    },
    es: {
      subject: '✨ ¡Gracias por confirmar tu presencia!',
      dear: 'Querido/a',
      thankYou: '¡Muchas gracias por confirmar tu presencia!',
      thrilled: 'Estamos absolutamente encantados de que nos acompañes en nuestro día especial. Tu presencia significa mucho para nosotros.',
      attending: 'Confirmado',
      eventDetailsTitle: 'Detalles del Evento',
      date: 'Fecha',
      location: 'Lugar',
      whatToExpect: 'Qué esperar:',
      expectItem1: 'Recibirás más detalles sobre el lugar y el programa más cerca de la fecha',
      expectItem2: 'Si necesitas actualizar tu confirmación, puedes hacerlo usando el enlace de tu invitación original',
      expectItem3: 'No dudes en contactarnos si tienes alguna pregunta',
      withLove: 'Con amor,',
      couple: 'Gian & Cat 💕',
      automated: 'Este es un correo de confirmación automático.',
      questions: 'Si tienes alguna pregunta, responde a este correo.',
      received: 'Recibiste este correo porque confirmaste tu asistencia a nuestra boda.',
    },
    pt: {
      subject: '✨ Obrigado por confirmar sua presença!',
      dear: 'Querido/a',
      thankYou: 'Muito obrigado por confirmar sua presença!',
      thrilled: 'Estamos absolutamente felizes por você se juntar a nós no nosso dia especial. Sua presença significa muito para nós.',
      attending: 'Confirmado',
      eventDetailsTitle: 'Detalhes do Evento',
      date: 'Data',
      location: 'Local',
      whatToExpect: 'O que esperar:',
      expectItem1: 'Você receberá mais detalhes sobre o local e programação mais perto da data',
      expectItem2: 'Se precisar atualizar sua confirmação, pode fazer usando o link no seu convite original',
      expectItem3: 'Sinta-se à vontade para entrar em contato se tiver alguma dúvida',
      withLove: 'Com amor,',
      couple: 'Gian & Cat 💕',
      automated: 'Este é um email de confirmação automático.',
      questions: 'Se tiver alguma dúvida, responda a este email.',
      received: 'Você recebeu este email porque confirmou presença no nosso casamento.',
    },
  };

  return translations[locale as Locale] || translations.en;
}

function generateEmailHtml(
  guestName: string,
  eventDate?: string,
  eventLocation?: string,
  locale: string = 'en'
): string {
  const t = getTranslations(locale);
  
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
      background-color: #d4f1dd;
      color: #1a6b3a;
      border: 2px solid #b8e5c7;
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
      <div class="greeting">${t.dear} ${guestName},</div>
      
      <div class="message">
        <p>🎉 <strong>${t.thankYou}</strong></p>
        <p>${t.thrilled}</p>
      </div>
      
      ${eventDate || eventLocation ? `
        <div class="event-details">
          <h3>📅 ${t.eventDetailsTitle}</h3>
          ${eventDate ? `<p><strong>${t.date}:</strong> ${eventDate}</p>` : ''}
          ${eventLocation ? `<p><strong>${t.location}:</strong> ${eventLocation}</p>` : ''}
        </div>
      ` : ''}
      
      <div class="message">
        <p><strong>${t.whatToExpect}</strong></p>
        <ul style="padding-left: 20px; color: #4a4a4a;">
          <li>${t.expectItem1}</li>
          <li>${t.expectItem2}</li>
          <li>${t.expectItem3}</li>
        </ul>
      </div>
      
      <div class="divider"></div>
      
      <div class="message" style="text-align: center; color: #6a6a6a; font-size: 15px;">
        <p>${t.withLove}</p>
        <p style="font-weight: 600; color: #1a1a1a; font-size: 18px; margin-top: 10px;">${t.couple}</p>
      </div>
    </div>
    
    <div class="footer">
      <p>${t.automated}</p>
      <p>${t.questions}</p>
      <p style="margin-top: 15px; font-size: 12px;">
        ${t.received}
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function generatePlainTextEmail(
  guestName: string,
  eventDate?: string,
  eventLocation?: string,
  locale: string = 'en'
): string {
  const t = getTranslations(locale);
  
  let message = `${t.dear} ${guestName},\n\n`;
  
  message += `${t.thankYou}\n\n`;
  message += `${t.thrilled}\n\n`;
  message += `Status: ${t.attending}\n\n`;
  
  if (eventDate || eventLocation) {
    message += `${t.eventDetailsTitle.toUpperCase()}\n`;
    if (eventDate) message += `${t.date}: ${eventDate}\n`;
    if (eventLocation) message += `${t.location}: ${eventLocation}\n`;
    message += `\n`;
  }
  
  message += `${t.whatToExpect.toUpperCase()}\n`;
  message += `- ${t.expectItem1}\n`;
  message += `- ${t.expectItem2}\n`;
  message += `- ${t.expectItem3}\n\n`;
  
  message += `${t.withLove}\n`;
  message += `${t.couple}\n\n`;
  message += `---\n`;
  message += `${t.automated}\n`;
  message += `${t.questions}\n`;
  message += `${t.received}\n`;

  return message;
}
