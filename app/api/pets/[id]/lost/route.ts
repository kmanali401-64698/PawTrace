import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PrismaClient } from "@/app/generated/prisma/client";

const prisma = new PrismaClient();

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { isLost } = await req.json();

    const pet = await prisma.pet.findUnique({ where: { id } });

    if (!pet) {
        return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    if (pet.ownerId !== (session.user as any).id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.pet.update({
        where: { id },
        data: {
            isLost,
            // Clear old location data when toggling status, so stale data doesn't linger
            ...(isLost === false && { lastLat: null, lastLng: null, lastSeenAt: null }),
        },
    });

    return NextResponse.json(updated);
}