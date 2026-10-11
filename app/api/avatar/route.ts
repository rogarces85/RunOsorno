import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  readLocalAvatar,
  resolveAvatarSource,
} from "@/lib/services/avatar.service";
import { svgAvatar } from "@/lib/utils/avatar";

const querySchema = z.object({
  userId: z.uuid("ID inválido"),
});

function svgResponse(name: string): NextResponse {
  return new NextResponse(svgAvatar(name), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({
    userId: request.nextUrl.searchParams.get("userId"),
  });
  if (!parsed.success) {
    return new NextResponse("Solicitud inválida", { status: 400 });
  }
  const source = await resolveAvatarSource(parsed.data.userId);
  if (source.kind === "none") {
    return new NextResponse("Usuario no encontrado", { status: 404 });
  }
  if (source.kind === "svg") {
    return svgResponse(source.name);
  }
  if (source.kind === "redirect") {
    return NextResponse.redirect(source.url);
  }
  const buffer = await readLocalAvatar(parsed.data.userId);
  if (!buffer) {
    return svgResponse(source.name);
  }
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "no-store",
    },
  });
}
