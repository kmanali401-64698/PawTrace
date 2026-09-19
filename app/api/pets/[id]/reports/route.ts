import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PrismaClient } from "@/app/generated/prisma/client";

const prisma = new PrismaClient();

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((session.user as any).role !== "vet") {
        return NextResponse.json(
            { error: "Only vets can add reports" },
            { status: 403 }
        );
    }

    const { id } = await params;
    const { rawNotes } = await req.json();

    if (!rawNotes) {
        return NextResponse.json(
            { error: "rawNotes is required" },
            { status: 400 }
        );
    }

    const pet = await prisma.pet.findUnique({ where: { id } });
    if (!pet) {
        return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    }

    // AI summarization step
    const aiResult = await summarizeVetNotes(rawNotes);

    const report = await prisma.report.create({
        data: {
            petId: id,
            vetId: (session.user as any).id,
            rawNotes,
            summary: aiResult.summary,
            diagnosis: aiResult.diagnosis,
            medication: aiResult.medication,
            nextVisit: aiResult.nextVisit ? new Date(aiResult.nextVisit) : null,
        },
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

    const reports = await prisma.report.findMany({
        where: { petId: id },
        orderBy: { createdAt: "desc" },
        include: { vet: { select: { name: true } } },
    });

    return NextResponse.json(reports);
}

async function summarizeVetNotes(rawNotes: string) {
    const prompt = `You are a veterinary assistant. Given raw, informal vet notes,
extract structured information and return ONLY a JSON object (no other text, no markdown formatting) with:
- summary: a 2-3 sentence plain-language summary for the pet owner
- diagnosis: the diagnosis mentioned, or null if none
- medication: any medication/dosage mentioned, or null if none
- nextVisit: a date string (YYYY-MM-DD) if a follow-up date is mentioned, or null

Raw notes: "${rawNotes}"`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            }
        );

        const data = await response.json();

        if (!response.ok || !data.candidates) {
            console.error("Gemini API error:", JSON.stringify(data));
            return { summary: rawNotes, diagnosis: null, medication: null, nextVisit: null };
        }

        const text = data.candidates[0].content.parts[0].text
            .replace(/```json|```/g, "")
            .trim();

        return JSON.parse(text);
    } catch (err) {
        console.error("Gemini call failed:", err);
        return { summary: rawNotes, diagnosis: null, medication: null, nextVisit: null };
    }
}