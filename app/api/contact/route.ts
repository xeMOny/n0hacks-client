import { NextRequest, NextResponse } from "next/server";

interface ContactData {
  email: string;
  company: string;
  message: string;
}

async function sendEmail(data: ContactData) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "info@n0hacks.com";
  const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

  if (!RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY not configured - emails will not be sent");
    console.log("Lead received:", data);
    return true; // Pretend success for UX
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: CONTACT_EMAIL,
        subject: `🚨 Nuevo Lead de n0hacks - ${data.company}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">🚨 Nuevo Lead Recibido</h2>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>📧 Email:</strong> ${data.email}</p>
              <p><strong>🏢 Empresa/Rol:</strong> ${data.company}</p>
              <p><strong>💬 Mensaje:</strong></p>
              <p style="white-space: pre-wrap; background: white; padding: 10px; border-radius: 4px;">
                ${data.message}
              </p>
            </div>
            <p style="color: #6b7280; font-size: 12px;">
              ⏰ Recibido: ${new Date().toLocaleString("es-ES")}
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Resend API error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const data: ContactData = {
      email: body.email?.trim(),
      company: body.company?.trim(),
      message: body.message?.trim(),
    };

    // Validación
    if (!data.email || !data.company || !data.message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400 }
      );
    }

    // Enviar email
    await sendEmail(data);

    return NextResponse.json(
      {
        success: true,
        message: "Lead received successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
