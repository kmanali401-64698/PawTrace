"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

type Pet = {
    id: string;
    name: string;
    breed: string;
    species: string;
    age: number;
    owner: { name: string; email: string };
};

type Report = {
    id: string;
    summary: string;
    createdAt: string;
};

export default function VetDashboardPage() {
    const { data: session } = useSession();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Pet[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [rawNotes, setRawNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    async function handleSearch() {
        setSearching(true);
        const res = await fetch("/api/vet/search?query=" + encodeURIComponent(query));
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setSearching(false);
    }

    async function selectPet(pet: Pet) {
        setSelectedPet(pet);
        setSuccessMsg("");
        const res = await fetch("/api/pets/" + pet.id + "/reports");
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
    }

    async function handleSubmitReport() {
        if (!selectedPet) return;
        setSubmitting(true);
        setSuccessMsg("");
        const res = await fetch("/api/pets/" + selectedPet.id + "/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rawNotes }),
        });
        const newReport = await res.json();
        setSubmitting(false);
        setRawNotes("");
        setSuccessMsg("Report added successfully.");
        setReports(function (prev) {
            return [newReport].concat(prev);
        });
    }

    return (
        <div className="min-h-screen bg-cream px-4 py-10">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-semibold text-matcha">Vet Dashboard</h1>
                <p className="text-sm text-matcha/60 mt-1">
                    Welcome, Dr. {session?.user?.name}
                </p>

                <div className="bg-white rounded-2xl shadow-sm p-6 mt-6">
                    <h2 className="font-medium text-matcha mb-3">Find a pet</h2>
                    <div className="flex gap-2">
                        <input
                            placeholder="Pet name or QR code"
                            value={query}
                            onChange={function (e) { setQuery(e.target.value); }}
                            className="flex-1 rounded-xl border border-sage-light/40 px-4 py-2.5 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={searching || !query}
                            className="bg-sage hover:bg-sage/90 text-white font-medium rounded-xl px-5 py-2.5 transition disabled:opacity-50"
                        >
                            {searching ? "Searching..." : "Search"}
                        </button>
                    </div>

                    {results.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {results.map(function (pet) {
                                return (
                                    <button
                                        key={pet.id}
                                        onClick={function () { selectPet(pet); }}
                                        className={
                                            selectedPet && selectedPet.id === pet.id
                                                ? "w-full text-left rounded-xl p-3 transition bg-sage/20 border border-sage"
                                                : "w-full text-left rounded-xl p-3 transition bg-cream hover:bg-pink/20 border border-transparent"
                                        }
                                    >
                                        <p className="font-medium text-matcha">{pet.name}</p>
                                        <p className="text-xs text-matcha/60">
                                            {pet.breed} - Owner: {pet.owner.name}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {selectedPet && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
                        <h2 className="font-medium text-matcha mb-3">
                            Add report for {selectedPet.name}
                        </h2>
                        <textarea
                            placeholder="Write raw notes here, e.g. 'Mild ear infection, gave drops twice daily for 10 days, recheck in 2 weeks'"
                            value={rawNotes}
                            onChange={function (e) { setRawNotes(e.target.value); }}
                            rows={4}
                            className="w-full rounded-xl border border-sage-light/40 px-4 py-2.5 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                        />
                        <button
                            onClick={handleSubmitReport}
                            disabled={submitting || !rawNotes}
                            className="mt-3 w-full bg-sage hover:bg-sage/90 text-white font-medium rounded-xl py-2.5 transition disabled:opacity-50"
                        >
                            {submitting ? "Summarizing with AI..." : "Add report"}
                        </button>

                        {successMsg && (
                            <p className="text-sm text-sage bg-sage/10 rounded-lg px-3 py-2 mt-3">
                                {successMsg}
                            </p>
                        )}

                        <div className="mt-5">
                            <h3 className="text-sm font-medium text-matcha/70 mb-2">
                                Past reports
                            </h3>
                            {reports.length === 0 ? (
                                <p className="text-sm text-matcha/50">No reports yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {reports.map(function (report) {
                                        return (
                                            <div key={report.id} className="bg-cream rounded-xl p-3">
                                                <p className="text-sm text-matcha">{report.summary}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}