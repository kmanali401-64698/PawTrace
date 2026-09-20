import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PrismaClient } from "@/app/generated/prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((session.user as any).role !== "vet") {
        return NextResponse.json({ error: "Only vets can search" }, { status: 403 });
    }

    const url = new URL(req.url);
    const query = url.searchParams.get("query") || "";

    if (!query) {
        return NextResponse.json([]);
    }

    const pets = await prisma.pet.findMany({
        where: {
            OR: [
                { name: { contains: query, mode: "insensitive" } },
                { qrCode: query },
            ],
        },
        include: {
            owner: { select: { name: true, email: true } },
        },
        take: 10,
    });

    return NextResponse.json(pets);
}