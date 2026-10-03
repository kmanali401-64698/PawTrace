"use client";

import { useEffect, useState } from "react";
import { vetName } from "@/lib/format";

type Vet = { id: string; name: string; email: string; clinic: string | null };

type Access = {
    id: string;
    status: "pending" | "approved" | "denied" | "revoked";
    source: "request" | "owner" | "referral";
    note: string | null;
    createdAt: string;
    decidedAt: string | null;
    vet: Vet;
    referredBy: Vet | null;
    reportCount: number;
    lastReportAt: string | null;
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function howAdded(a: Access) {
    if (a.source === "referral" && a.referredBy) return `Referred by ${vetName(a.referredBy.name)}`;
    if (a.source === "owner") return "Added by you";
    return "You approved their request";
}

/** Owner-only: decide which vets can see this pet's medical history and add reports. */
export default function VetAccessPanel({ petId, petName }: { petId: string; petName: string }) {
    const [records, setRecords] = useState<Access[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [vetEmail, setVetEmail] = useState("");
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState("");
    const [showPast, setShowPast] = useState(false);

    useEffect(() => {
        fetch(`/api/pets/${petId}/access`)
            .then((r) => r.json())
            .then((data) => {
                setRecords(Array.isArray(data) ? data : []);
                setLoaded(true);
            });
    }, [petId]);

    function replace(updated: Access) {
        setRecords((prev) => {
            const rest = prev.filter((r) => r.id !== updated.id);
            const old = prev.find((r) => r.id === updated.id);
            return [{ ...old, ...updated, reportCount: old?.reportCount ?? 0, lastReportAt: old?.lastReportAt ?? null }, ...rest];
        });
    }

    async function decide(record: Access, action: "approve" | "deny" | "revoke") {
        if (action === "revoke" && !window.confirm(`Remove ${vetName(record.vet.name)}'s access to ${petName}'s medical records?`)) {
            return;
        }
        setBusyId(record.id);
        setError("");
        const res = await fetch(`/api/pets/${petId}/access/${record.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
        });
        const data = await res.json().catch(() => ({}));
        setBusyId(null);
        if (!res.ok) {
            setError(data.error || "Could not update. Please try again.");
            return;
        }
        replace(data);
    }

    async function addVet(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setAdding(true);
        setError("");
        const res = await fetch(`/api/pets/${petId}/access`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vetEmail }),
        });
        const data = await res.json().catch(() => ({}));
        setAdding(false);
        if (!res.ok) {
            setError(data.error || "Could not add that vet.");
            return;
        }
        setVetEmail("");
        replace(data);
    }

    const pending = records.filter((r) => r.status === "pending");
    const approved = records.filter((r) => r.status === "approved");
    const past = records.filter((r) => r.status === "denied" || r.status === "revoked");

    return (
        <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
            <h2 className="font-medium text-matcha">🩺 Vets caring for {petName}</h2>
            <p className="text-sm text-matcha/60 mt-1">
                You decide which vets can see {petName}&apos;s medical history and add reports. You can remove a vet at any time.
            </p>

            {!loaded ? (
                <p className="text-sm text-matcha/50 mt-4">Loading…</p>
            ) : (
                <>
                    {pending.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {pending.map((r) => (
                                <div key={r.id} className="rounded-xl p-4 bg-pink/30 ring-1 ring-terracotta/30">
                                    <p className="text-sm text-matcha">
                                        <strong>{vetName(r.vet.name)}</strong>
                                        {r.vet.clinic && <> from <strong>{r.vet.clinic}</strong></>} is asking to access{" "}
                                        {petName}&apos;s medical records.
                                    </p>
                                    <p className="text-xs text-matcha/60 mt-0.5">{r.vet.email} · asked {formatDate(r.createdAt)}</p>
                                    {r.note && (
                                        <p className="text-sm text-matcha/80 mt-2 bg-white rounded-lg px-3 py-2">&ldquo;{r.note}&rdquo;</p>
                                    )}
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => decide(r, "approve")}
                                            disabled={busyId === r.id}
                                            className="flex-1 bg-sage hover:bg-sage/90 text-white font-medium rounded-xl py-2 text-sm transition disabled:opacity-50"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => decide(r, "deny")}
                                            disabled={busyId === r.id}
                                            className="flex-1 bg-white hover:bg-cream text-matcha font-medium rounded-xl py-2 text-sm transition disabled:opacity-50"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 space-y-2">
                        {approved.length === 0 ? (
                            <p className="text-sm text-matcha/50">No vets have access yet.</p>
                        ) : (
                            approved.map((r) => (
                                <div key={r.id} className="flex items-start justify-between gap-3 bg-cream rounded-xl px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-matcha">
                                            {vetName(r.vet.name)}
                                            {r.vet.clinic && <span className="font-normal text-matcha/60"> · {r.vet.clinic}</span>}
                                        </p>
                                        <p className="text-xs text-matcha/60 break-all">{r.vet.email}</p>
                                        <p className="text-xs text-matcha/50 mt-1">
                                            {howAdded(r)}
                                            {r.decidedAt && <> · since {formatDate(r.decidedAt)}</>}
                                            {" · "}
                                            {r.reportCount > 0
                                                ? `${r.reportCount} report${r.reportCount > 1 ? "s" : ""}, last ${formatDate(r.lastReportAt!)}`
                                                : "no reports yet"}
                                        </p>
                                        {r.source === "referral" && r.note && (
                                            <p className="text-xs text-matcha/60 mt-1">Referral note: &ldquo;{r.note}&rdquo;</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => decide(r, "revoke")}
                                        disabled={busyId === r.id}
                                        className="text-xs text-terracotta font-medium hover:underline shrink-0 disabled:opacity-50"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <form onSubmit={addVet} className="mt-4 flex flex-col sm:flex-row gap-2">
                        <input
                            type="email"
                            required
                            value={vetEmail}
                            onChange={(e) => setVetEmail(e.target.value)}
                            placeholder="Add your vet by their PawTrace email"
                            className="flex-1 min-w-0 rounded-xl border border-sage-light/40 px-3 py-2 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                        />
                        <button
                            type="submit"
                            disabled={adding || !vetEmail}
                            className="bg-sage hover:bg-sage/90 text-white font-medium rounded-xl px-4 py-2 text-sm transition disabled:opacity-50"
                        >
                            {adding ? "Adding..." : "Give access"}
                        </button>
                    </form>

                    {error && <p className="text-sm text-terracotta bg-terracotta/10 rounded-lg px-3 py-2 mt-3">{error}</p>}

                    {past.length > 0 && (
                        <div className="mt-4">
                            <button onClick={() => setShowPast(!showPast)} className="text-xs text-sage font-medium hover:underline">
                                {showPast ? "Hide" : "Show"} declined / removed vets ({past.length})
                            </button>
                            {showPast && (
                                <div className="mt-2 space-y-1">
                                    {past.map((r) => (
                                        <div key={r.id} className="flex items-center justify-between gap-3 text-xs text-matcha/60 px-1">
                                            <span>
                                                {vetName(r.vet.name)} · {r.status === "denied" ? "declined" : "removed"}
                                                {r.decidedAt && ` ${formatDate(r.decidedAt)}`}
                                            </span>
                                            <button
                                                onClick={() => decide(r, "approve")}
                                                disabled={busyId === r.id}
                                                className="text-sage font-medium hover:underline"
                                            >
                                                Give access again
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
