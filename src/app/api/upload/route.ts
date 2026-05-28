import { NextRequest, NextResponse } from "next/server";
import { createUpload, getSettings, getUserByEmail } from "@/lib/storage";
import { Resend } from "resend";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    console.log("[API] Upload request started");

    // Get session to get real user ID
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      console.error("[API] No session found");
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    // Get user from database to get real ID
    const user = await getUserByEmail(session.user.email);

    if (!user) {
      console.error("[API] User not found in database");
      return NextResponse.json(
        { error: "Gebruiker niet gevonden" },
        { status: 404 },
      );
    }

    console.log("[API] User found:", { id: user.id, email: user.email });

    const body = await request.json();
    const { filename, fileType, data } = body;

    console.log("[API] Request data:", {
      filename,
      fileType,
      dataLength: data?.length,
      userId: user.id,
    });

    if (!filename || !data || !Array.isArray(data)) {
      console.error("[API] Invalid data:", {
        filename: !!filename,
        data: !!data,
        isArray: Array.isArray(data),
      });
      return NextResponse.json({ error: "Ongeldige data" }, { status: 400 });
    }

    if (data.length === 0) {
      console.error("[API] Empty data");
      return NextResponse.json(
        { error: "Bestand bevat geen data" },
        { status: 400 },
      );
    }

    // Process the data to add titel column if needed
    const processedData = data.map((row: Record<string, unknown>) => {
      const processedRow = { ...row };
      if (row["relatie"] && !row["titel"]) {
        processedRow["titel"] = "";
      }
      return processedRow;
    });

    console.log("[API] Creating upload in database...");

    // Create upload with real user ID
    const upload = await createUpload({
      userId: user.id,
      filename,
      fileData: processedData,
    });

    console.log("[API] Upload created:", upload.id);

    // Send emails
    try {
      if (!resend) {
        console.log("[API] Email not sent: RESEND_API_KEY not configured");
      } else {
        const settings = await getSettings();
        const reviewerEmail = settings.reviewerEmail;
        const uploaderEmail = settings.uploaderEmail;

        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://portal-elmar.vercel.app";
        const fromEmail = process.env.FROM_EMAIL || "info@akwebsolutions.nl";

        // Email to reviewer
        await resend.emails.send({
          from: fromEmail,
          to: reviewerEmail,
          subject: `Nieuwe upload klaar voor review: ${filename}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .header { background: #1a56db; padding: 30px; text-align: center; }
                .logo { max-width: 200px; margin-bottom: 15px; }
                .content { padding: 30px; }
                .info-box { background: #f8f9fa; border-left: 4px solid #1a56db; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .button { display: inline-block; padding: 14px 32px; background: #1a56db; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; font-size: 16px; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #dee2e6; }
              </style>
            </head>
            <body>
              <div style="padding: 20px; background-color: #f5f5f5;">
                <div class="container">
                  <div class="header">
                    <img src="https://elmarservices.com/wp-content/uploads/2024/12/LOGO-ELMAR-766x226-1-400x118.png" alt="Elmar Services" class="logo">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Nieuwe Upload</h1>
                  </div>
                  <div class="content">
                    <p>Hallo,</p>
                    <p>Er is een nieuwe upload beschikbaar voor review:</p>
                    <div class="info-box">
                      <p style="margin: 5px 0;"><strong>Bestand:</strong> ${filename}</p>
                      <p style="margin: 5px 0;"><strong>Type:</strong> ${(fileType || "CSV").toUpperCase()}</p>
                      <p style="margin: 5px 0;"><strong>Aantal rijen:</strong> ${processedData.length}</p>
                      <p style="margin: 5px 0;"><strong>Uploader:</strong> ${uploaderEmail}</p>
                      <p style="margin: 5px 0;"><strong>Upload tijd:</strong> ${new Date().toLocaleString("nl-NL")}</p>
                    </div>
                    <div style="text-align: center;">
                      <a href="${appUrl}/review/${upload.id}" class="button">Start Review</a>
                    </div>
                  </div>
                  <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} Elmar Services | CSV Portal</p>
                    <p><a href="${appUrl}" style="color: #1a56db;">Portal openen</a></p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        // Confirmation email to uploader and reviewer
        await resend.emails.send({
          from: fromEmail,
          to: [uploaderEmail, reviewerEmail],
          subject: `Upload bevestiging: ${filename}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .header { background: #1a56db; padding: 30px; text-align: center; }
                .logo { max-width: 200px; margin-bottom: 15px; }
                .content { padding: 30px; }
                .info-box { background: #f8f9fa; border-left: 4px solid #1a56db; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .button { display: inline-block; padding: 14px 32px; background: #1a56db; color: white !important; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; font-size: 16px; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #dee2e6; }
              </style>
            </head>
            <body>
              <div style="padding: 20px; background-color: #f5f5f5;">
                <div class="container">
                  <div class="header">
                    <img src="https://elmarservices.com/wp-content/uploads/2024/12/LOGO-ELMAR-766x226-1-400x118.png" alt="Elmar Services" class="logo">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Upload Succesvol</h1>
                  </div>
                  <div class="content">
                    <p>Beste gebruiker,</p>
                    <p>Je bestand is succesvol ge&uuml;pload en wordt binnenkort gereviewed:</p>
                    <div class="info-box">
                      <p style="margin: 5px 0;"><strong>Bestand:</strong> ${filename}</p>
                      <p style="margin: 5px 0;"><strong>Type:</strong> ${(fileType || "CSV").toUpperCase()}</p>
                      <p style="margin: 5px 0;"><strong>Aantal rijen:</strong> ${processedData.length}</p>
                      <p style="margin: 5px 0;"><strong>Status:</strong> Wachtend op review</p>
                    </div>
                    <p>Je ontvangt een nieuwe email zodra de review voltooid is.</p>
                    <div style="text-align: center;">
                      <a href="${appUrl}/dashboard" class="button">Bekijk Dashboard</a>
                    </div>
                  </div>
                  <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} Elmar Services | CSV Portal</p>
                    <p><a href="${appUrl}" style="color: #1a56db;">Portal openen</a></p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        console.log("[API] Emails sent successfully");
      }
    } catch (emailError) {
      console.error("[API] Email error:", emailError);
    }

    console.log("[API] Upload completed successfully");

    return NextResponse.json({
      success: true,
      uploadId: upload.id,
      message: `${(fileType || "CSV").toUpperCase()} bestand succesvol geüpload!`,
      fileType: fileType || "csv",
      rowCount: processedData.length,
    });
  } catch (error) {
    console.error("[API] Upload error:", error);
    console.error("[API] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });

    return NextResponse.json(
      {
        error: "Er is een fout opgetreden bij het uploaden",
      },
      { status: 500 },
    );
  }
}
