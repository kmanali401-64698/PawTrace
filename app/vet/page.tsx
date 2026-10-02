"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import PetAvatar from "@/components/PetAvatar";
import ReportCard, { Report } from "@/components/ReportCard";

type Pet = {
    id: string;
    name: string;
    breed: string;
    species: string;
    age: number;
    photoUrl: string | null;
    owner: { name: string; email: string };
};

export default function VetDashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Pet[]>([]);
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [rawNotes, setRawNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const role = session?.user?.role;

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/login");
        } else if (status === "authenticated" && role !== "vet") {
            router.replace("/dashboard");
        }
    }, [status, role, router]);

    async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!query.trim()) return;
        setSearching(true);
        const res = await fetch("/api/vet/search?query=" + encodeURIComponent(query.trim()));
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setSearched(true);
        setSearching(false);
    }

    async function selectPet(pet: Pet) {
        setSelectedPet(pet);
        setSuccessMsg("");
        setErrorMsg("");
        setReports([]);
        const res = await fetch("/api/pets/" + pet.id + "/reports");
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
    }

    async function handleSubmitReport(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!selectedPet) return;
        setSubmitting(true);
        setSuccessMsg("");
        setErrorMsg("");
        const res = await fetch("/api/pets/" + selectedPet.id + "/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rawNotes }),
        });
        const data = await res.json().catch(() => ({}));
        setSubmitting(false);

        if (!res.ok) {
            setErrorMsg(data.error || "Could not save the report. Please try again.");
            return;
        }

        setRawNotes("");
        setSuccessMsg(
            data.aiSummarized
                ? "Report added and summarized for the owner."
                : "Report saved. The AI service was busy, so the notes were saved as written — use “Summarize with AI” to try again."
        );
        setReports((prev) => [data as Report].concat(prev));
    }

    async function regenerate(report: Report) {
        const res = await fetch("/api/reports/" + report.id + "/summarize", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return data.error || "Could not summarize. Please try again.";
        setReports((prev) => prev.map((r) => (r.id === report.id ? data : r)));
        return null;
    }

    if (status !== "authenticated" || role !== "vet") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-cream">
                <p className="text-matcha/60">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream px-4 py-10">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-matcha">🩺 Vet Dashboard</h1>
                        <p className="text-sm text-matcha/60 mt-1">
                            Welcome, Dr. {session.user.name}
                        </p>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="bg-pink/40 hover:bg-pink/60 text-matcha font-medium rounded-xl px-4 py-2.5 text-sm transition"
                    >
                        Log out
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 mt-6">
                    <h2 className="font-medium text-matcha mb-3">Find a pet</h2>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            placeholder="Pet name, QR code, or tag link"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="flex-1 min-w-0 rounded-xl border border-sage-light/40 px-4 py-2.5 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                        />
                        <button
                            type="submit"
                            disabled={searching || !query.trim()}
                            className="bg-sage hover:bg-sage/90 text-white font-medium rounded-xl px-5 py-2.5 transition disabled:opacity-50"
                        >
                            {searching ? "Searching..." : "Search"}
                        </button>
                    </form>

                    {searched && results.length === 0 && (
                        <p className="text-sm text-matcha/50 mt-4">No pets match that search.</p>
                    )}

                    {results.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {results.map((pet) => (
                                <button
                                    key={pet.id}
                                    onClick={() => selectPet(pet)}
                                    className={
                                        "w-full text-left rounded-xl p-3 transition flex items-center gap-3 border " +
                                        (selectedPet?.id === pet.id
                                            ? "bg-sage/20 border-sage"
                                            : "bg-cream hover:bg-pink/20 border-transparent")
                                    }
                                >
                                    <PetAvatar name={pet.name} species={pet.species} photoUrl={pet.photoUrl} size={44} />
                                    <div className="min-w-0">
                                        <p className="font-medium text-matcha">{pet.name}</p>
                                        <p className="text-xs text-matcha/60 truncate">
                                            {pet.breed} · {pet.species} · {pet.age} yrs · Owner: {pet.owner.name}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {selectedPet && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
                        <div className="flex items-center gap-3 mb-4">
                            <PetAvatar name={selectedPet.name} species={selectedPet.species} photoUrl={selectedPet.photoUrl} size={48} />
                            <div>
                                <h2 className="font-medium text-matcha">New report for {selectedPet.name}</h2>
                                <p className="text-xs text-matcha/50">
                                    Write notes the way you normally would — AI turns them into a clear summary for {selectedPet.owner.name}.
                                </p>
                            </div>
                        </div>
                        <form onSubmit={handleSubmitReport}>
                            <textarea
                                placeholder="e.g. pruritus L ear x5d. otitis externa, yeast +++. surolan 5 gtt BID x10d, cone if scratching. recheck 2 wks."
                                value={rawNotes}
                                onChange={(e) => setRawNotes(e.target.value)}
                                rows={5}
                                maxLength={5000}
                                className="w-full rounded-xl border border-sage-light/40 px-4 py-2.5 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition font-mono text-sm"
                            />
                            <button
                                type="submit"
                                disabled={submitting || !rawNotes.trim()}
                                className="mt-3 w-full bg-sage hover:bg-sage/90 text-white font-medium rounded-xl py-2.5 transition disabled:opacity-50"
                            >
                                {submitting ? "✨ Summarizing with AI… (can take up to 30s)" : "Add report"}
                            </button>
                        </form>

                        {successMsg && (
                            <p className="text-sm text-sage bg-sage/10 rounded-lg px-3 py-2 mt-3">
                                {successMsg}
                            </p>
                        )}
                        {errorMsg && (
                            <p className="text-sm text-terracotta bg-terracotta/10 rounded-lg px-3 py-2 mt-3">
                                {errorMsg}
                            </p>
                        )}

                        <div className="mt-6">
                            <h3 className="text-sm font-medium text-matcha/70 mb-2">
                                Medical history
                            </h3>
                            {reports.length === 0 ? (
                                <p className="text-sm text-matcha/50">No reports yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {reports.map((report) => (
                                        <ReportCard key={report.id} report={report} onRegenerate={regenerate} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
