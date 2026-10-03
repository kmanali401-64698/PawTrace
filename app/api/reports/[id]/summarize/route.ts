import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { summarizeVetNotes } from "@/lib/summarize";
import { vetHasApprovedAccess, VET_PUBLIC_FIELDS } from "@/lib/access";

// Re-run the AI summary for an existing report (e.g. after Gemini was overloaded)
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "vet") {
        return NextResponse.json({ error: "Only vets can regenerate summaries" }, { status: 403 });
    }

    const { id } = await params;
    const report = await prisma.report.findUnique({ where: { id }, include: { pet: true } });

    if (!report || !(await vetHasApprovedAccess(report.petId, session.user.id))) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const ai = await summarizeVetNotes(report.rawNotes, report.pet);

    if (!ai.aiSummarized) {
        return NextResponse.json(
            { error: "The AI service is busy right now. Please try again in a minute." },
            { status: 503 }
        );
    }

    const updated = await prisma.report.update({
        where: { id },
        data: ai,
        include: { vet: { select: VET_PUBLIC_FIELDS } },
    });

    return NextResponse.json(updated);
}
