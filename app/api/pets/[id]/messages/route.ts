import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function ownsPet(id: string) {
    const session = await auth();
    if (!session?.user) return false;
    const pet = await prisma.pet.findUnique({ where: { id }, select: { ownerId: true } });
    return pet?.ownerId === session.user.id;
}

// Owner reads messages left by people who found their pet
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!(await ownsPet(id))) {
        return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    const messages = await prisma.finderMessage.findMany({
        where: { petId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    return NextResponse.json(messages);
}

// Owner marks all messages for this pet as read
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    if (!(await ownsPet(id))) {
        return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    await prisma.finderMessage.updateMany({ where: { petId: id, read: false }, data: { read: true } });
    return NextResponse.json({ ok: true });
}
