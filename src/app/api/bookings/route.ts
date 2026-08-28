import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bookingItems } from "@/lib/booking";
import { logApiEvent } from "@/lib/operational-telemetry";
import { createSupabaseServerClient } from "@/lib/supabase/server";
const schema = z.object({
  draft: z
    .object({
      service: z.enum(["move", "remove"]),
      pickup: z.string().min(5).max(500),
      destination: z.string().max(500),
      date: z.string().min(1),
      timeWindow: z.string().min(1),
      rooms: z.array(z.string().min(1).max(120)).max(20).default([]),
      moveInventory: z.array(z.string().min(1).max(120)).max(50).default([]),
      description: z.string().max(5000),
      access: z.string().max(1000),
      categories: z.array(z.string().max(120)).max(30),
      name: z.string().min(1).max(200),
      email: z.string().email(),
      phone: z.string().min(7).max(30),
    })
    .passthrough(),
  idempotencyKey: z.string().uuid(),
});
export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const body = schema.parse(await request.json());
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      logApiEvent({
        request,
        event: "booking.create",
        outcome: "rejected",
        status: 401,
        startedAt,
      });
      return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    }
    const d = body.draft;
    const stops = [
      {
        line1: d.pickup,
        order: 0,
        type: d.service === "move" ? "pickup" : "service",
      },
      ...(d.service === "move"
        ? [{ line1: d.destination, order: 1, type: "destination" }]
        : []),
    ];
    const { data, error } = await supabase.rpc("submit_customer_booking", {
      p_payload: {
        ...d,
        stops,
        items: bookingItems(d),
      },
      p_idempotency_key: body.idempotencyKey,
    });
    if (error) throw error;
    logApiEvent({
      request,
      event: "booking.create",
      outcome: "success",
      status: 200,
      startedAt,
    });
    return NextResponse.json(data?.[0]);
  } catch (error) {
    logApiEvent({
      request,
      event: "booking.create",
      outcome: "failed",
      status: 400,
      startedAt,
      error,
    });
    return NextResponse.json({ error: "BOOKING_FAILED" }, { status: 400 });
  }
}
