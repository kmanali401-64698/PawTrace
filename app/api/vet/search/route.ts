import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const pets = await prisma.pet.findMany({
        where: {
            OR: [
                { name: { contains: query, mode: "insensitive" } },
                { qrCode: query },
            ],
        },
        select: {
            id: true,
            name: true,
            breed: true,
            species: true,
            age: true,
            photoUrl: true,
            owner: { select: { name: true, email: true } },
        },
        take: 10,
    });

    return NextResponse.json(pets);
}
