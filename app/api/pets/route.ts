import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePetInput } from "@/lib/validate";

export async function POST(req: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "owner") {
        return NextResponse.json(
            { error: "Only owners can add pets" },
            { status: 403 }
        );
    }

    const { data, error } = parsePetInput(await req.json().catch(() => null));
    if (!data) {
        return NextResponse.json({ error }, { status: 400 });
    }

    const qrCode = randomBytes(8).toString("hex");

    const pet = await prisma.pet.create({
        data: { ...data, ownerId: session.user.id, qrCode },
    });

    return NextResponse.json(pet);
}

export async function GET() {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const pets = await prisma.pet.findMany({
        where: { ownerId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: {
            _count: { select: { messages: { where: { read: false } } } },
            reports: {
                where: { nextVisit: { gte: startOfToday } },
                orderBy: { nextVisit: "asc" },
                take: 1,
                select: { nextVisit: true, diagnosis: true },
            },
        },
    });

    return NextResponse.json(
        pets.map(({ _count, reports, ...pet }) => ({
            ...pet,
            unreadMessages: _count.messages,
            upcomingVisit: reports[0] ?? null,
        }))
    );
}
