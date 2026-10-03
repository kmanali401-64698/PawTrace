import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VET_PUBLIC_FIELDS } from "@/lib/access";

const REQUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function text(value: unknown, max: number) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Owner: every vet who has, had, or asked for access to this pet.
// Vet: only their own access record for this pet.
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const pet = await prisma.pet.findUnique({ where: { id }, select: { ownerId: true } });
    if (!pet) {
        return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    if (pet.ownerId === session.user.id) {
        const records = await prisma.petVetAccess.findMany({
            where: { petId: id },
            orderBy: { createdAt: "desc" },
            include: {
                vet: { select: VET_PUBLIC_FIELDS },
                referredBy: { select: VET_PUBLIC_FIELDS },
            },
        });

        // Last time each vet wrote a report, so the owner can see who actually treated the pet
        const lastReports = await prisma.report.groupBy({
            by: ["vetId"],
            where: { petId: id },
            _max: { createdAt: true },
            _count: true,
        });
        const byVet = new Map(lastReports.map((r) => [r.vetId, r]));

        return NextResponse.json(
            records.map((r) => ({
                ...r,
                reportCount: byVet.get(r.vetId)?._count ?? 0,
                lastReportAt: byVet.get(r.vetId)?._max.createdAt ?? null,
            }))
        );
    }

    if (session.user.role === "vet") {
        const record = await prisma.petVetAccess.findUnique({
            where: { petId_vetId: { petId: id, vetId: session.user.id } },
        });
        return NextResponse.json(record ? [record] : []);
    }

    return NextResponse.json({ error: "Pet not found" }, { status: 404 });
}

// Owner: add a vet by email (approved straight away).
// Vet: ask the owner for access (pending until the owner decides).
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => null);
    const note = text(body?.note, 300) || null;

    const pet = await prisma.pet.findUnique({ where: { id }, select: { ownerId: true } });
    if (!pet) {
        return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    // --- Owner adds a vet they trust ---
    if (pet.ownerId === session.user.id) {
        const vetEmail = text(body?.vetEmail, 120).toLowerCase();
        const vet = vetEmail
            ? await prisma.user.findUnique({ where: { email: vetEmail }, select: { id: true, role: true } })
            : null;
        if (!vet || vet.role !== "vet") {
            return NextResponse.json(
                { error: "No PawTrace vet account uses that email. Ask your vet to sign up as a Veterinarian first." },
                { status: 404 }
            );
        }

        const record = await prisma.petVetAccess.upsert({
            where: { petId_vetId: { petId: id, vetId: vet.id } },
            create: { petId: id, vetId: vet.id, status: "approved", source: "owner", note, decidedAt: new Date() },
            update: { status: "approved", source: "owner", referredById: null, note, decidedAt: new Date() },
            include: { vet: { select: VET_PUBLIC_FIELDS }, referredBy: { select: VET_PUBLIC_FIELDS } },
        });
        return NextResponse.json(record);
    }

    // --- Vet requests access ---
    if (session.user.role !== "vet") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.petVetAccess.findUnique({
        where: { petId_vetId: { petId: id, vetId: session.user.id } },
    });

    if (existing?.status === "approved" || existing?.status === "pending") {
        return NextResponse.json(existing);
    }

    // After a "no", wait a day before asking again so owners aren't pestered
    if (existing?.decidedAt && Date.now() - existing.decidedAt.getTime() < REQUEST_COOLDOWN_MS) {
        return NextResponse.json(
            { error: "The owner declined or removed your access recently. You can ask again after 24 hours." },
            { status: 429 }
        );
    }

    const record = await prisma.petVetAccess.upsert({
        where: { petId_vetId: { petId: id, vetId: session.user.id } },
        create: { petId: id, vetId: session.user.id, status: "pending", source: "request", note },
        update: { status: "pending", source: "request", referredById: null, note, decidedAt: null, createdAt: new Date() },
    });

    return NextResponse.json(record);
}
