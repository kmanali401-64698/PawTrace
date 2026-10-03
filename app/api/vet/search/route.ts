import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PET_FIELDS = {
    id: true,
    name: true,
    breed: true,
    species: true,
    age: true,
    photoUrl: true,
} as const;

function firstName(name: string) {
    return name.trim().split(/\s+/)[0] ?? "";
}

// Vets find pets two ways:
// - by name, among their own patients (pets whose owner approved them)
// - by the exact tag code / tag link, for any pet — they need the physical tag (or the owner
//   showing it), so vets can't browse other people's pets. Without approval they only see
//   basic details and can request access.
export async function GET(req: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "vet") {
        return NextResponse.json({ error: "Only vets can search" }, { status: 403 });
    }

    const url = new URL(req.url);
    let query = (url.searchParams.get("query") || "").trim();

    if (!query) {
        return NextResponse.json([]);
    }

    // Accept a full scan URL pasted from a tag, e.g. https://.../pet/abc123
    const fromUrl = query.match(/\/pet\/([^/?#\s]+)/);
    if (fromUrl) query = fromUrl[1];

    const [byTag, myPatients] = await Promise.all([
        prisma.pet.findUnique({
            where: { qrCode: query },
            select: { ...PET_FIELDS, owner: { select: { name: true, email: true } } },
        }),
        prisma.pet.findMany({
            where: {
                name: { contains: query, mode: "insensitive" },
                vetAccess: { some: { vetId: session.user.id, status: "approved" } },
            },
            select: { ...PET_FIELDS, owner: { select: { name: true, email: true } } },
            take: 10,
        }),
    ]);

    const pets = byTag && !myPatients.some((p) => p.id === byTag.id) ? [byTag, ...myPatients] : myPatients;

    const access = await prisma.petVetAccess.findMany({
        where: { vetId: session.user.id, petId: { in: pets.map((p) => p.id) } },
        select: { petId: true, status: true },
    });
    const statusByPet = new Map(access.map((a) => [a.petId, a.status]));

    return NextResponse.json(
        pets.map((pet) => {
            const accessStatus = statusByPet.get(pet.id) ?? "none";
            const approved = accessStatus === "approved";
            return {
                ...pet,
                accessStatus,
                // Owner contact is only shared with vets the owner approved
                owner: approved ? pet.owner : { name: firstName(pet.owner.name), email: null },
            };
        })
    );
}
