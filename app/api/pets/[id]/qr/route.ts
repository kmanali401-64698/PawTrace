import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPublicBaseUrl } from "@/lib/app-url";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const pet = await prisma.pet.findUnique({ where: { id } });

    if (!pet) {
        return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    if (pet.ownerId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // The URL the QR code points to — the public scan page
    const { baseUrl, reachableFromPhones } = getPublicBaseUrl(req);
    const scanUrl = `${baseUrl}/pet/${pet.qrCode}`;

    // High error correction so a scratched or partly covered tag still scans
    const options = {
        errorCorrectionLevel: "H" as const,
        margin: 2,
        color: { dark: "#2E3D28", light: "#FFFFFF" },
    };

    const [qrImage, qrSvg] = await Promise.all([
        QRCode.toDataURL(scanUrl, { ...options, width: 720 }),
        QRCode.toString(scanUrl, { ...options, type: "svg" }),
    ]);

    return NextResponse.json(
        { qrImage, qrSvg, scanUrl, reachableFromPhones, secure: scanUrl.startsWith("https://") },
        { headers: { "Cache-Control": "no-store" } }
    );
}
