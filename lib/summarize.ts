export type VetSummary = {
    summary: string;
    diagnosis: string | null;
    medication: string | null; // one medicine per line: "Name — instructions"
    careInstructions: string | null; // one tip per line
    nextVisit: Date | null;
    aiSummarized: boolean;
};

type PetContext = { name: string; species: string; breed?: string; age?: number };

// Tried in order. Gemini frequently returns 503 "high demand" for a single model,
// so falling back to another one keeps report saving reliable.
const DEFAULT_MODELS = [
    "gemini-3.6-flash",
    // Lite models answer in a few seconds and are rarely overloaded; good enough for a short summary
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-flash-latest",
];

const RESPONSE_SCHEMA = {
    type: "OBJECT",
    properties: {
        summary: { type: "STRING" },
        diagnosis: { type: "STRING", nullable: true },
        medications: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    name: { type: "STRING" },
                    instructions: { type: "STRING" },
                },
                required: ["name", "instructions"],
            },
        },
        careInstructions: { type: "ARRAY", items: { type: "STRING" } },
        nextVisit: { type: "STRING", nullable: true },
    },
    required: ["summary", "diagnosis", "medications", "careInstructions", "nextVisit"],
};

function buildPrompt(rawNotes: string, pet: PetContext, today: string) {
    const petLine = [pet.name, pet.species, pet.breed, pet.age != null ? `${pet.age} years old` : null]
        .filter(Boolean)
        .join(", ");

    return `You turn a veterinarian's shorthand clinical notes into a clear update for the pet's owner.
Today's date is ${today}. Pet: ${petLine}.

Rules:
- Write for a worried owner with no medical background. Expand every abbreviation (BID = twice a day, SID = once a day, TID = three times a day, gtt = drops, PO = by mouth, x10d = for 10 days, L/R = left/right, dx, tx, hx, etc.). No jargon; if a medical term is useful, put it in brackets after the plain-language term.
- Refer to the pet by name.
- summary: 2-3 short, warm, factual sentences: why the pet came in, what was found, and what happens next. Never invent anything that is not in the notes.
- diagnosis: short plain-language name, e.g. "Ear infection (otitis externa) caused by yeast and bacteria". null if no diagnosis is stated.
- medications: one entry per medicine. name = product or drug name, capitalised. instructions = complete plain-language dosing, e.g. "5 drops in the left ear twice a day for 10 days". Empty array if none.
- careInstructions: short, actionable home-care tips from the notes, each starting with a verb (e.g. "Keep Bruno out of water until the recheck"). Do not repeat medication dosing here. Empty array if none.
- nextVisit: follow-up date as YYYY-MM-DD, resolving relative dates ("recheck 2 wks") from today's date. null if no follow-up is mentioned.

Vet notes:
"""
${rawNotes}
"""`;
}

function cleanText(value: unknown) {
    if (typeof value !== "string") return null;
    const text = value.trim();
    return text && text.toLowerCase() !== "null" && text.toLowerCase() !== "none" ? text : null;
}

function cleanDate(value: unknown) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
    const date = new Date(value.trim() + "T00:00:00.000Z");
    return isNaN(date.getTime()) ? null : date;
}

// "SUROLAN" -> "Surolan"; leaves mixed-case names like "Apoquel" or "NexGard" alone
function tidyDrugName(name: string) {
    return name === name.toUpperCase() && name.length > 3
        ? name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
        : name;
}

const stripPeriod = (line: string) => line.replace(/\.\s*$/, "");

function parseResult(text: string, rawNotes: string): VetSummary {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());

    const medications = Array.isArray(parsed?.medications)
        ? parsed.medications
              .map((m: { name?: unknown; instructions?: unknown }) => {
                  const rawName = cleanText(m?.name);
                  const name = rawName && tidyDrugName(rawName);
                  const rawInstructions = cleanText(m?.instructions);
                  const instructions = rawInstructions && stripPeriod(rawInstructions);
                  if (!name) return null;
                  return instructions ? `${name} — ${instructions}` : name;
              })
              .filter(Boolean)
        : [];

    const care = Array.isArray(parsed?.careInstructions)
        ? parsed.careInstructions.map(cleanText).filter(Boolean).map((c: string) => stripPeriod(c))
        : [];

    const summary = cleanText(parsed?.summary);

    return {
        summary: summary ?? rawNotes,
        diagnosis: cleanText(parsed?.diagnosis),
        medication: medications.length ? medications.join("\n") : null,
        careInstructions: care.length ? care.join("\n") : null,
        nextVisit: cleanDate(parsed?.nextVisit),
        aiSummarized: Boolean(summary),
    };
}

async function callGemini(model: string, prompt: string, apiKey: string, timeoutMs: number) {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: RESPONSE_SCHEMA,
                    temperature: 0.2,
                },
            }),
            signal: AbortSignal.timeout(timeoutMs),
        }
    );
    const data = await response.json().catch(() => null);
    const text: unknown = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return { ok: response.ok && typeof text === "string", status: response.status, text: text as string, data };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function summarizeVetNotes(rawNotes: string, pet: PetContext): Promise<VetSummary> {
    const fallback: VetSummary = {
        summary: rawNotes,
        diagnosis: null,
        medication: null,
        careInstructions: null,
        nextVisit: null,
        aiSummarized: false,
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("GEMINI_API_KEY is not set; saving vet notes without an AI summary.");
        return fallback;
    }

    const prompt = buildPrompt(rawNotes, pet, new Date().toISOString().slice(0, 10));
    const models = [process.env.GEMINI_MODEL, ...DEFAULT_MODELS].filter(
        (m, i, all): m is string => Boolean(m) && all.indexOf(m) === i
    );

    // Don't keep the vet waiting: give up and save the raw notes as written after 40s.
    // The vet can press "Summarize with AI" on the report later.
    const deadline = Date.now() + 40_000;
    let candidates = models;

    // Pass 1 tries every model once (moving on immediately when one is overloaded);
    // pass 2 retries the overloaded ones after a short pause.
    for (let pass = 0; pass < 2 && candidates.length > 0; pass++) {
        if (pass > 0) await sleep(1500);
        const overloaded: string[] = [];

        for (const model of candidates) {
            const remaining = deadline - Date.now();
            if (remaining < 3_000) return fallback;
            try {
                const result = await callGemini(model, prompt, apiKey, Math.min(15_000, remaining));
                if (result.ok) return parseResult(result.text, rawNotes);

                console.error(`Gemini ${model} failed (${result.status}):`, result.data?.error?.message ?? "no text in response");
                // 429/5xx are temporary; anything else (e.g. 404 retired model) is skipped for good
                if (result.status === 429 || result.status >= 500) overloaded.push(model);
            } catch (err) {
                console.error(`Gemini ${model} call failed:`, err instanceof Error ? err.message : err);
            }
        }

        candidates = overloaded;
    }

    return fallback;
}
