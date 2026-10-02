import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toCoord(value: unknown, limit: number) {
    return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit
        ? value
        : null;
}

// Public: called when someone opens a tag's scan page.
// First call logs the scan (location optional) and returns its id. If the finder grants
// location a little later, the page calls again with { scanId, lat, lng } to attach it.
export async function POST(
    req: Request,
    { params }: { params: Promise<{ qrCode: string }> }
) {
    const { qrCode } = await params;
    const body = await req.json().catch(() => null);
    const lat = toCoord(body?.lat, 90);
    const lng = toCoord(body?.lng, 180);
    const hasLocation = lat !== null && lng !== null;
    const scanId = typeof body?.scanId === "string" ? body.scanId : null;

    const pet = await prisma.pet.findUnique({ where: { qrCode } });

    if (!pet) {
        return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    let id: string;

    if (scanId) {
        if (!hasLocation) {
            return NextResponse.json({ error: "Location required" }, { status: 400 });
        }
        // Only fill in a recent scan of this same pet that has no location yet
        const updated = await prisma.scanLog.updateMany({
            where: {
                id: scanId,
                petId: pet.id,
                lat: null,
                scannedAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
            },
            data: { lat, lng },
        });
        if (updated.count === 0) {
            return NextResponse.json({ error: "Scan not found" }, { status: 404 });
        }
        id = scanId;
    } else {
        const scan = await prisma.scanLog.create({
            data: {
                petId: pet.id,
                lat: hasLocation ? lat : null,
                lng: hasLocation ? lng : null,
            },
        });
        id = scan.id;
    }

    if (pet.isLost && hasLocation) {
        await prisma.pet.update({
            where: { qrCode },
            data: { lastLat: lat, lastLng: lng, lastSeenAt: new Date() },
        });
    }

    return NextResponse.json({ recorded: true, scanId: id });
}
