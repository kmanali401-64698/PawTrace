import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePetInput } from "@/lib/validate";

async function findOwnedPet(id: string) {
    const session = await auth();
    if (!session?.user) {
        return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet || pet.ownerId !== session.user.id) {
        return { response: NextResponse.json({ error: "Pet not found" }, { status: 404 }) };
    }

    return { pet };
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { pet, response } = await findOwnedPet(id);
    return pet ? NextResponse.json(pet) : response;
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { pet, response } = await findOwnedPet(id);
    if (!pet) return response;

    const { data, error } = parsePetInput(await req.json().catch(() => null));
    if (!data) {
        return NextResponse.json({ error }, { status: 400 });
    }

    const updated = await prisma.pet.update({ where: { id }, data });
    return NextResponse.json(updated);
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { pet, response } = await findOwnedPet(id);
    if (!pet) return response;

    // Reports, scan logs and finder messages are removed by ON DELETE CASCADE
    await prisma.pet.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
}
