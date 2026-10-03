import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public: what someone sees after scanning a tag.
// The owner's contact details and note are only shared while the pet is marked lost.
// Otherwise the finder sees just enough to recognise the pet and can alert the owner
// through PawTrace (see ./message) without learning who or where the owner is.
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

    const basics = {
        name: pet.name,
        breed: pet.breed,
        species: pet.species,
        photoUrl: pet.photoUrl,
        isLost: pet.isLost,
    };

    if (!pet.isLost) {
        return NextResponse.json(basics);
    }

    // Only return PUBLIC fields — never medical history here
    return NextResponse.json({
        ...basics,
        age: pet.age,
        publicNotes: pet.publicNotes,
        ownerName: pet.owner.name,
        ownerEmail: pet.owner.email,
        ownerPhone: pet.owner.phone,
    });
}
