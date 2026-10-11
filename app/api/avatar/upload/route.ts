import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getUploadTicket, storeLocalAvatar } from "@/lib/services/avatar.service";

export async function POST() {
  const { user } = await requireAuth();
  const ticket = await getUploadTicket({ id: user.id, role: user.role });
  return NextResponse.json(ticket);
}

export async function PUT(request: Request) {
  const { user } = await requireAuth();
  const data = Buffer.from(await request.arrayBuffer());
  const result = await storeLocalAvatar(user.id, data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 413 });
  }
  return NextResponse.json({ ok: true });
}
