import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

interface LeadData {
  email: string;
  company: string;
  message: string;
  timestamp?: string;
}

async function sendTelegramNotification(lead: LeadData) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("Telegram credentials not configured");
    return false;
  }

  const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const text = `
🚨 *Nuevo Lead en n0hacks*

📧 *Email:* ${lead.email}
🏢 *Empresa/Rol:* ${lead.company}
💬 *Mensaje:* ${lead.message}
⏰ *Hora:* ${lead.timestamp || new Date().toLocaleString("es-ES")}

[Ver dashboard](#)
  `.trim();

  try {
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      console.error("Telegram API error:", await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending Telegram notification:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const lead: LeadData = {
      email: body.email?.trim(),
      company: body.company?.trim(),
      message: body.message?.trim(),
      timestamp: new Date().toLocaleString("es-ES"),
    };

    // Validate required fields
    if (!lead.email || !lead.company || !lead.message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Send Telegram notification
    const notificationSent = await sendTelegramNotification(lead);

    // Store lead (simple file storage for now - could be DB)
    try {
      const leadsFile = `${process.cwd()}/leads.json`;
      const fs = require("fs").promises;

      let leads: LeadData[] = [];
      try {
        const content = await fs.readFile(leadsFile, "utf-8");
        leads = JSON.parse(content);
      } catch {
        leads = [];
      }

      leads.push(lead);
      await fs.writeFile(leadsFile, JSON.stringify(leads, null, 2));
    } catch (storageError) {
      console.error("Error storing lead:", storageError);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Lead received",
        notificationSent: notificationSent,
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
