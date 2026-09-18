import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PrismaClient } from "@/app/generated/prisma/client";
import QRCode from "qrcode";

const prisma = new PrismaClient();

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

    if (pet.ownerId !== (session.user as any).id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // The URL the QR code will point to — the public scan page
    const scanUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pet/${pet.qrCode}`;

    const qrImageDataUrl = await QRCode.toDataURL(scanUrl);

    return NextResponse.json({ qrImage: qrImageDataUrl, scanUrl });
}