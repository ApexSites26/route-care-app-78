import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StaffMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  role: string;
}

interface NotificationSettings {
  id: string;
  company_id: string;
  reminder_enabled: boolean;
  reminder_time: string;
  manager_email: string;
}

interface Company {
  id: string;
  name: string;
}

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "School Taxi <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
      text,
    }),
  });
  return response.json();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];
    const todayFormatted = new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    
    // Get all companies with reminder notifications enabled
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*, companies:company_id(id, name)")
      .eq("reminder_enabled", true);

    if (settingsError) {
      console.error("Error fetching notification settings:", settingsError);
      throw settingsError;
    }

    if (!settings || settings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No companies with reminders enabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results: Array<{ 
      company: string; 
      managerEmailSent: boolean;
      staffEmailsSent: number;
      missingStaff: string[];
    }> = [];

    for (const setting of settings as (NotificationSettings & { companies: Company })[]) {
      const companyId = setting.company_id;
      const companyName = setting.companies?.name || "Your Company";

      // Get all active staff (drivers and escorts) with their emails
      const { data: staff, error: staffError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, role")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .in("role", ["driver", "escort"]);

      if (staffError) {
        console.error(`Error fetching staff for company ${companyId}:`, staffError);
        continue;
      }

      if (!staff || staff.length === 0) {
        continue;
      }

      // Get today's driver entries
      const { data: driverEntries } = await supabase
        .from("driver_entries")
        .select("user_id")
        .eq("company_id", companyId)
        .eq("entry_date", today);

      // Get today's escort entries
      const { data: escortEntries } = await supabase
        .from("escort_entries")
        .select("user_id")
        .eq("company_id", companyId)
        .eq("entry_date", today);

      const submittedDrivers = new Set(driverEntries?.map((e) => e.user_id) || []);
      const submittedEscorts = new Set(escortEntries?.map((e) => e.user_id) || []);

      // Find missing submissions
      const missingStaff: StaffMember[] = (staff as StaffMember[]).filter((s) => {
        if (s.role === "driver") {
          return !submittedDrivers.has(s.user_id);
        } else if (s.role === "escort") {
          return !submittedEscorts.has(s.user_id);
        }
        return false;
      });

      if (missingStaff.length === 0) {
        results.push({ 
          company: companyName, 
          managerEmailSent: false,
          staffEmailsSent: 0, 
          missingStaff: [] 
        });
        continue;
      }

      // Send reminder emails to each staff member who has an email
      let staffEmailsSent = 0;
      for (const member of missingStaff) {
        if (member.email) {
          const staffEmailResult = await sendEmail(
            member.email,
            `Reminder: Submit your daily form for ${todayFormatted}`,
            `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e40af;">Daily Form Reminder</h2>
                <p>Hi ${member.full_name.split(" ")[0]},</p>
                <p>This is a friendly reminder that you haven't submitted your daily form yet for <strong>${todayFormatted}</strong>.</p>
                <p style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                  Please log in to the School Taxi app and complete your daily form as soon as possible.
                </p>
                <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
                  This is an automated reminder from ${companyName}.
                </p>
              </div>
            `,
            `Hi ${member.full_name.split(" ")[0]},\n\nThis is a friendly reminder that you haven't submitted your daily form yet for ${todayFormatted}.\n\nPlease log in to the School Taxi app and complete your daily form as soon as possible.\n\nThis is an automated reminder from ${companyName}.`
          );
          console.log(`Reminder email sent to ${member.email}:`, staffEmailResult);
          staffEmailsSent++;
        }
      }

      // Format missing staff list for manager email
      const missingListHtml = missingStaff
        .map((s) => `<li>${s.full_name} <span style="color: #666;">(${s.role})</span>${s.email ? ' ✉️' : ' <span style="color: #ef4444;">no email</span>'}</li>`)
        .join("");

      const missingList = missingStaff
        .map((s) => `• ${s.full_name} (${s.role})${s.email ? '' : ' - no email'}`)
        .join("\n");

      // Send summary email to manager
      const managerEmailResult = await sendEmail(
        setting.manager_email,
        `[${companyName}] ${missingStaff.length} staff member(s) haven't submitted today`,
        `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">Daily Submission Report</h2>
            <p>The following staff members haven't submitted their daily form yet:</p>
            <ul style="background: #f8fafc; padding: 16px 16px 16px 32px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              ${missingListHtml}
            </ul>
            <p style="margin-top: 16px;">
              <strong>${staffEmailsSent}</strong> staff member(s) were sent reminder emails directly.
              ${missingStaff.length - staffEmailsSent > 0 ? `<br><span style="color: #ef4444;">${missingStaff.length - staffEmailsSent} staff member(s) don't have email addresses on file.</span>` : ''}
            </p>
            <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
              This is an automated reminder from your School Taxi Timesheet system.
            </p>
          </div>
        `,
        `Daily Submission Report\n\nThe following staff members haven't submitted their daily form yet:\n\n${missingList}\n\n${staffEmailsSent} staff member(s) were sent reminder emails directly.\n\nThis is an automated reminder from your School Taxi Timesheet system.`
      );
      console.log(`Manager email sent to ${setting.manager_email}:`, managerEmailResult);

      results.push({
        company: companyName,
        managerEmailSent: true,
        staffEmailsSent,
        missingStaff: missingStaff.map((s) => s.full_name),
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        date: today,
        results 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in check-submissions function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
