import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VET_PUBLIC_FIELDS } from "@/lib/access";

// The vet's own patients (approved by the owner or referred) and the requests still waiting
export async function GET() {
    const session = await auth();
    if (!session?.user || session.user.role !== "vet") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const records = await prisma.petVetAccess.findMany({
        where: { vetId: session.user.id, status: { in: ["approved", "pending"] } },
        orderBy: { createdAt: "desc" },
        include: {
            referredBy: { select: VET_PUBLIC_FIELDS },
            pet: {
                select: {
                    id: true,
                    name: true,
                    breed: true,
                    species: true,
                    age: true,
                    photoUrl: true,
                    owner: { select: { name: true, email: true } },
                },
            },
        },
    });

    return NextResponse.json(
        records.map((r) => ({
            accessStatus: r.status,
            source: r.source,
            referredBy: r.referredBy,
            since: r.decidedAt ?? r.createdAt,
            ...r.pet,
            // Owner contact only once the owner has approved
            owner: r.status === "approved" ? r.pet.owner : { name: r.pet.owner.name.split(/\s+/)[0], email: null },
        }))
    );
}
