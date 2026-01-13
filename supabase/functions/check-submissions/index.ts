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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split("T")[0];
    
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

    const results: Array<{ company: string; emailsSent: number; missingStaff: string[] }> = [];

    for (const setting of settings as (NotificationSettings & { companies: Company })[]) {
      const companyId = setting.company_id;
      const companyName = setting.companies?.name || "Your Company";

      // Get all active staff (drivers and escorts)
      const { data: staff, error: staffError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, role")
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
        results.push({ company: companyName, emailsSent: 0, missingStaff: [] });
        continue;
      }

      // Format missing staff list for email
      const missingList = missingStaff
        .map((s) => `• ${s.full_name} (${s.role})`)
        .join("\n");

      const missingListHtml = missingStaff
        .map((s) => `<li>${s.full_name} <span style="color: #666;">(${s.role})</span></li>`)
        .join("");

      // Send email to manager using fetch to Resend API
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "School Taxi <onboarding@resend.dev>",
          to: [setting.manager_email],
          subject: `[${companyName}] ${missingStaff.length} staff member(s) haven't submitted today`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e40af;">Daily Submission Reminder</h2>
              <p>The following staff members haven't submitted their daily form yet:</p>
              <ul style="background: #f8fafc; padding: 16px 16px 16px 32px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                ${missingListHtml}
              </ul>
              <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
                This is an automated reminder from your School Taxi Timesheet system.
              </p>
            </div>
          `,
          text: `Daily Submission Reminder\n\nThe following staff members haven't submitted their daily form yet:\n\n${missingList}\n\nThis is an automated reminder from your School Taxi Timesheet system.`,
        }),
      });

      const emailResult = await emailResponse.json();
      console.log(`Email sent to ${setting.manager_email} for company ${companyName}:`, emailResult);

      results.push({
        company: companyName,
        emailsSent: 1,
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
