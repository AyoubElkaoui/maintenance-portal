import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSettings } from '@/lib/storage';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, action, opmerkingen, to } = await request.json();

    if (!resend) {
      console.log('Email not sent: RESEND_API_KEY not configured');
      return NextResponse.json({ success: true, message: 'Email not sent - API key not configured' });
    }

    const fromEmail = process.env.FROM_EMAIL || 'info@akwebsolutions.nl';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://maintenance-portal-sand.vercel.app';

    // Get recipient from request body or fall back to settings
    let recipient = to;
    if (!recipient) {
      const settings = await getSettings();
      recipient = settings.reviewerEmail;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: #1a56db; padding: 30px; text-align: center;">
            <img src="${appUrl}/elmar-logo.png" alt="Elmar Maintenance" style="max-width: 200px; margin-bottom: 10px;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Factuur ${action}</h1>
          </div>
          <div style="padding: 30px;">
            <p><strong>Factuur ID:</strong> ${invoiceId}</p>
            <p><strong>Actie:</strong> ${action}</p>
            ${opmerkingen ? `<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin: 15px 0;"><strong>Opmerkingen:</strong><br>${opmerkingen}</div>` : ''}
          </div>
          <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #dee2e6;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Elmar Maintenance</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: fromEmail,
      to: recipient,
      subject: `Factuur ${action}`,
      html: emailHtml,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
