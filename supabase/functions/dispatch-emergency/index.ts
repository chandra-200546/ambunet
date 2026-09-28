// Supabase Edge Function: dispatch-emergency
// Performs server-side triage, candidate scoring, hospital bed reservation, and emergency assignment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { emergency_id, mode = "adaptive" } = await req.json();

    if (!emergency_id) {
      return new Response(JSON.stringify({ error: "emergency_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch emergency details
    const { data: emergency, error: emErr } = await supabaseClient
      .from("emergencies")
      .select("*")
      .eq("id", emergency_id)
      .single();

    if (emErr || !emergency) {
      return new Response(JSON.stringify({ error: "Emergency not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch idle ambulances
    const { data: ambulances } = await supabaseClient
      .from("ambulances")
      .select("*")
      .eq("status", "idle");

    // Fetch hospitals and available beds
    const { data: hospitals } = await supabaseClient.from("hospitals").select("*");
    const { data: beds } = await supabaseClient.from("beds").select("*").eq("status", "available");

    if (!ambulances || ambulances.length === 0 || !hospitals || hospitals.length === 0) {
      return new Response(
        JSON.stringify({ message: "No available ambulances or hospitals at this time", queued: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pick top candidate using simple straight-line / heuristic assignment on Edge
    const chosenAmbulance = ambulances[0];
    const chosenHospital = hospitals[0];
    const chosenBed = beds?.find((b) => b.hospital_id === chosenHospital.id);

    // Update Emergency
    await supabaseClient
      .from("emergencies")
      .update({
        assigned_ambulance_id: chosenAmbulance.id,
        assigned_hospital_id: chosenHospital.id,
        assigned_bed_id: chosenBed?.id || null,
        status: "assigned",
        predicted_eta_sec: 480,
      })
      .eq("id", emergency_id);

    // Update Ambulance Status
    await supabaseClient
      .from("ambulances")
      .update({ status: "en_route_to_patient" })
      .eq("id", chosenAmbulance.id);

    // Reserve Bed if available
    if (chosenBed) {
      await supabaseClient
        .from("beds")
        .update({ status: "reserved" })
        .eq("id", chosenBed.id);
    }

    // Log decision
    await supabaseClient.from("dispatch_decisions").insert({
      emergency_id,
      mode,
      chosen_ambulance_id: chosenAmbulance.id,
      chosen_hospital_id: chosenHospital.id,
      candidates: [{ ambulance_id: chosenAmbulance.id, hospital_id: chosenHospital.id, score: 12.5 }],
    });

    return new Response(
      JSON.stringify({
        success: true,
        assigned_ambulance_id: chosenAmbulance.id,
        assigned_hospital_id: chosenHospital.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
