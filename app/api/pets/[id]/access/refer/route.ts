import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vetHasApprovedAccess, VET_PUBLIC_FIELDS } from "@/lib/access";

// A vet who is already treating the pet refers it to another vet (e.g. a specialist).
// The new vet gets access straight away, like a referral between clinics;
// the owner sees "Referred by Dr. X" and can revoke it at any time.
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user || session.user.role !== "vet") {
        return NextResponse.json({ error: "Only vets can refer a pet" }, { status: 403 });
    }

    const { id } = await params;
    if (!(await vetHasApprovedAccess(id, session.user.id))) {
        return NextResponse.json(
            { error: "You can only refer pets that you have access to." },
            { status: 403 }
        );
    }

    const body = await req.json().catch(() => null);
    const vetEmail = typeof body?.vetEmail === "string" ? body.vetEmail.trim().toLowerCase() : "";
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) || null : null;

    const target = vetEmail
        ? await prisma.user.findUnique({ where: { email: vetEmail }, select: { id: true, role: true } })
        : null;

    if (!target || target.role !== "vet") {
        return NextResponse.json({ error: "No PawTrace vet account uses that email." }, { status: 404 });
    }
    if (target.id === session.user.id) {
        return NextResponse.json({ error: "You already have access to this pet." }, { status: 400 });
    }

    const existing = await prisma.petVetAccess.findUnique({
        where: { petId_vetId: { petId: id, vetId: target.id } },
    });

    // Respect the owner's decision: a vet the owner said no to can't be brought back by referral
    if (existing && (existing.status === "denied" || existing.status === "revoked")) {
        return NextResponse.json(
            { error: "The owner has declined access for that vet. Ask the owner to add them directly." },
            { status: 403 }
        );
    }

    const record = await prisma.petVetAccess.upsert({
        where: { petId_vetId: { petId: id, vetId: target.id } },
        create: {
            petId: id,
            vetId: target.id,
            status: "approved",
            source: "referral",
            referredById: session.user.id,
            note,
            decidedAt: new Date(),
        },
        update: {
            status: "approved",
            source: "referral",
            referredById: session.user.id,
            note,
            decidedAt: new Date(),
        },
        include: { vet: { select: VET_PUBLIC_FIELDS } },
    });

    return NextResponse.json(record);
}
