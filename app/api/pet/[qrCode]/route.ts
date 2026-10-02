import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ qrCode: string }> }
) {
    const { qrCode } = await params;

    const pet = await prisma.pet.findUnique({
        where: { qrCode },
        include: {
            owner: {
                select: { name: true, email: true, phone: true },
            },
        },
    });

    if (!pet) {
        return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    // Only return PUBLIC fields — never medical history here
    return NextResponse.json({
        name: pet.name,
        breed: pet.breed,
        species: pet.species,
        age: pet.age,
        photoUrl: pet.photoUrl,
        publicNotes: pet.publicNotes,
        isLost: pet.isLost,
        ownerName: pet.owner.name,
        ownerEmail: pet.owner.email,
        ownerPhone: pet.owner.phone,
    });
}
