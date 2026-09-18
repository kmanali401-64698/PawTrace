import { NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma/client";

const prisma = new PrismaClient();

export async function POST(
    req: Request,
    { params }: { params: Promise<{ qrCode: string }> }
) {
    const { qrCode } = await params;
    const { lat, lng } = await req.json();

    const pet = await prisma.pet.findUnique({ where: { qrCode } });

    if (!pet) {
        return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    if (!pet.isLost) {
        // Don't record location if pet isn't marked lost — privacy by design
        return NextResponse.json({ recorded: false });
    }

    await prisma.pet.update({
        where: { qrCode },
        data: { lastLat: lat, lastLng: lng, lastSeenAt: new Date() },
    });

    return NextResponse.json({ recorded: true });
}