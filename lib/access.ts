import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

export type AccessStatus = "pending" | "approved" | "denied" | "revoked";

// Public vet details owners see next to reports and in the "Vets" list
export const VET_PUBLIC_FIELDS = { id: true, name: true, email: true, clinic: true } as const;

/** Access record for this vet on this pet, or null if the vet never requested/was never added. */
export function getVetAccess(petId: string, vetId: string) {
    return prisma.petVetAccess.findUnique({ where: { petId_vetId: { petId, vetId } } });
}

/**
 * Can this user see the pet's medical history?
 * Owner of the pet: always. Vet: only with access the owner approved (or a referral).
 */
export async function canViewMedical(session: Session | null, petId: string) {
    if (!session?.user) return false;

    const pet = await prisma.pet.findUnique({ where: { id: petId }, select: { ownerId: true } });
    if (!pet) return false;
    if (pet.ownerId === session.user.id) return true;

    if (session.user.role !== "vet") return false;
    const access = await getVetAccess(petId, session.user.id);
    return access?.status === "approved";
}

/** Vets may add or regenerate reports only with approved access. */
export async function vetHasApprovedAccess(petId: string, vetId: string) {
    const access = await getVetAccess(petId, vetId);
    return access?.status === "approved";
}
