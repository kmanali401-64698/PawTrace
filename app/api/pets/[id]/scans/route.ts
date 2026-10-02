import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Scan locations are sensitive: only the pet's owner may see them
    const pet = await prisma.pet.findUnique({ where: { id }, select: { ownerId: true } });

    if (!pet || pet.ownerId !== session.user.id) {
        return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    const scans = await prisma.scanLog.findMany({
        where: { petId: id },
        orderBy: { scannedAt: "desc" },
        take: 20,
    });

    return NextResponse.json(scans);
}
