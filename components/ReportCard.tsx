"use client";

import { useState } from "react";

export type Report = {
    id: string;
    rawNotes: string;
    summary: string;
    diagnosis: string | null;
    medication: string | null;
    careInstructions: string | null;
    aiSummarized: boolean;
    nextVisit: string | null;
    createdAt: string;
    vet: { name: string };
};

function lines(value: string | null) {
    return value ? value.split("\n").map((l) => l.trim()).filter(Boolean) : [];
}

function formatDate(iso: string, utc = false) {
    return new Date(iso).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(utc && { timeZone: "UTC" }),
    });
}

export default function ReportCard({
    report,
    onRegenerate,
}: {
    report: Report;
    onRegenerate?: (report: Report) => Promise<string | null>; // vets only; returns an error message
}) {
    const [showNotes, setShowNotes] = useState(false);
    const [regenerating, setRegenerating] = useState(false);
    const [error, setError] = useState("");
    const [now] = useState(() => Date.now());

    const medications = lines(report.medication);
    const care = lines(report.careInstructions);
    const upcoming = report.nextVisit && new Date(report.nextVisit).getTime() >= now - 86_400_000;

    async function regenerate() {
        if (!onRegenerate) return;
        setRegenerating(true);
        setError("");
        const message = await onRegenerate(report);
        setRegenerating(false);
        if (message) setError(message);
    }

    return (
        <article className="bg-cream rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-matcha/50">
                    {formatDate(report.createdAt)} · Dr. {report.vet?.name}
                </p>
                {report.aiSummarized ? (
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-sage bg-sage/10 rounded-full px-2 py-0.5 shrink-0">
                        AI summary
                    </span>
                ) : (
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-matcha/50 bg-matcha/5 rounded-full px-2 py-0.5 shrink-0">
                        Vet notes
                    </span>
                )}
            </div>

            {report.diagnosis && (
                <h4 className="font-semibold text-matcha mt-2 leading-snug">{report.diagnosis}</h4>
            )}

            <p className="text-sm text-matcha/90 mt-1.5 leading-relaxed whitespace-pre-line">{report.summary}</p>

            {medications.length > 0 && (
                <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-matcha/50 mb-1">💊 Medication</p>
                    <ul className="space-y-1">
                        {medications.map((m) => {
                            const [name, ...rest] = m.split(" — ");
                            return (
                                <li key={m} className="text-sm text-matcha bg-white rounded-lg px-3 py-2">
                                    <span className="font-medium">{name}</span>
                                    {rest.length > 0 && <span className="text-matcha/70"> — {rest.join(" — ")}</span>}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {care.length > 0 && (
                <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-matcha/50 mb-1">🏠 Care at home</p>
                    <ul className="space-y-1">
                        {care.map((c) => (
                            <li key={c} className="text-sm text-matcha flex gap-2">
                                <span className="text-sage">✓</span>
                                <span>{c}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {report.nextVisit && (
                <p
                    className={
                        "mt-3 text-sm rounded-lg px-3 py-2 inline-block " +
                        (upcoming ? "bg-pink/40 text-matcha font-medium" : "bg-white text-matcha/60")
                    }
                >
                    📅 {upcoming ? "Next visit" : "Follow-up was"}: {formatDate(report.nextVisit, true)}
                </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3">
                {report.aiSummarized && (
                    <button
                        type="button"
                        onClick={() => setShowNotes(!showNotes)}
                        className="text-xs text-sage font-medium hover:underline"
                    >
                        {showNotes ? "Hide original notes" : "Show original vet notes"}
                    </button>
                )}
                {onRegenerate && (
                    <button
                        type="button"
                        onClick={regenerate}
                        disabled={regenerating}
                        className="text-xs text-sage font-medium hover:underline disabled:opacity-50"
                    >
                        {regenerating ? "Summarizing..." : report.aiSummarized ? "Regenerate summary" : "Summarize with AI"}
                    </button>
                )}
            </div>

            {showNotes && (
                <p className="mt-2 text-xs text-matcha/60 bg-white rounded-lg px-3 py-2 font-mono whitespace-pre-wrap">
                    {report.rawNotes}
                </p>
            )}

            {error && (
                <p className="mt-2 text-xs text-terracotta bg-terracotta/10 rounded-lg px-3 py-2">{error}</p>
            )}
        </article>
    );
}
