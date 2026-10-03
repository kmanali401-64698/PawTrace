import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VET_PUBLIC_FIELDS } from "@/lib/access";

const ACTIONS = {
    approve: "approved",
    deny: "denied",
    revoke: "revoked",
} as const;

// Owner decides on a vet's access: approve / deny a request, or revoke access at any time
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string; accessId: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, accessId } = await params;
    const body = await req.json().catch(() => null);
    const action = body?.action as keyof typeof ACTIONS;

    if (!(action in ACTIONS)) {
        return NextResponse.json({ error: "Action must be approve, deny or revoke" }, { status: 400 });
    }

    const record = await prisma.petVetAccess.findUnique({
        where: { id: accessId },
        include: { pet: { select: { ownerId: true } } },
    });

    if (!record || record.petId !== id || record.pet.ownerId !== session.user.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.petVetAccess.update({
        where: { id: accessId },
        data: { status: ACTIONS[action], decidedAt: new Date() },
        include: { vet: { select: VET_PUBLIC_FIELDS }, referredBy: { select: VET_PUBLIC_FIELDS } },
    });

    return NextResponse.json(updated);
}
