import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { summarizeVetNotes } from "@/lib/summarize";
import { canViewMedical, vetHasApprovedAccess, VET_PUBLIC_FIELDS } from "@/lib/access";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "vet") {
        return NextResponse.json(
            { error: "Only vets can add reports" },
            { status: 403 }
        );
    }

    const { id } = await params;
    const body = await req.json().catch(() => null);
    const rawNotes = typeof body?.rawNotes === "string" ? body.rawNotes.trim() : "";

    if (!rawNotes) {
        return NextResponse.json(
            { error: "rawNotes is required" },
            { status: 400 }
        );
    }

    if (rawNotes.length > 5000) {
        return NextResponse.json({ error: "Notes are too long (max 5000 characters)" }, { status: 400 });
    }

    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet) {
        return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    // Owner consent: only vets the owner approved (or who were referred) can add reports
    if (!(await vetHasApprovedAccess(id, session.user.id))) {
        return NextResponse.json(
            { error: "You need the owner's approval before adding reports for this pet." },
            { status: 403 }
        );
    }

    // AI summarization step
    const ai = await summarizeVetNotes(rawNotes, pet);

    const report = await prisma.report.create({
        data: {
            petId: id,
            vetId: session.user.id,
            rawNotes,
            ...ai,
        },
        include: { vet: { select: VET_PUBLIC_FIELDS } },
    });

    return NextResponse.json(report);
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Medical history is private: only the owner and vets the owner approved may read it
    if (!(await canViewMedical(session, id))) {
        return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    const reports = await prisma.report.findMany({
        where: { petId: id },
        orderBy: { createdAt: "desc" },
        include: { vet: { select: VET_PUBLIC_FIELDS } },
    });

    return NextResponse.json(reports);
}
