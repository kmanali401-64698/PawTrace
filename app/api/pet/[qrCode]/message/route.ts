import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toCoord(value: unknown, limit: number) {
    return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit
        ? value
        : null;
}

function text(value: unknown, max: number) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Public: someone who scanned the tag leaves a message for the owner
export async function POST(
    req: Request,
    { params }: { params: Promise<{ qrCode: string }> }
) {
    const { qrCode } = await params;
    const body = await req.json().catch(() => null);

    const message = text(body?.message, 1000);
    const name = text(body?.name, 80) || null;
    const contact = text(body?.contact, 120) || null;
    const lat = toCoord(body?.lat, 90);
    const lng = toCoord(body?.lng, 180);
    const hasLocation = lat !== null && lng !== null;

    if (!message) {
        return NextResponse.json({ error: "Please write a message" }, { status: 400 });
    }

    const pet = await prisma.pet.findUnique({ where: { qrCode }, select: { id: true, isLost: true } });
    if (!pet) {
        return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    // Basic flood protection: at most 10 messages per pet per hour
    const recent = await prisma.finderMessage.count({
        where: { petId: pet.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recent >= 10) {
        return NextResponse.json(
            { error: "Too many messages for this pet right now. Please try again later." },
            { status: 429 }
        );
    }

    await prisma.finderMessage.create({
        data: {
            petId: pet.id,
            message,
            name,
            contact,
            lat: hasLocation ? lat : null,
            lng: hasLocation ? lng : null,
        },
    });

    if (pet.isLost && hasLocation) {
        await prisma.pet.update({
            where: { id: pet.id },
            data: { lastLat: lat, lastLng: lng, lastSeenAt: new Date() },
        });
    }

    return NextResponse.json({ sent: true });
}
