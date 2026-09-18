import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PrismaClient } from "@/app/generated/prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((session.user as any).role !== "owner") {
        return NextResponse.json(
            { error: "Only owners can add pets" },
            { status: 403 }
        );
    }

    const { name, breed, species, age, height, weight } = await req.json();

    if (!name || !breed || !species || age == null || height == null || weight == null) {
        return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
        );
    }

    const qrCode = randomBytes(8).toString("hex");

    const pet = await prisma.pet.create({
        data: {
            ownerId: (session.user as any).id,
            name,
            breed,
            species,
            age,
            height,
            weight,
            qrCode,
        },
    });

    return NextResponse.json(pet);
}

export async function GET(req: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pets = await prisma.pet.findMany({
        where: { ownerId: (session.user as any).id },
    });

    return NextResponse.json(pets);
}