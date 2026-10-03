"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { vetName } from "@/lib/format";
import PetAvatar from "@/components/PetAvatar";
import ReportCard, { Report } from "@/components/ReportCard";

type AccessStatus = "approved" | "pending" | "denied" | "revoked" | "none";

type Pet = {
    id: string;
    name: string;
    breed: string;
    species: string;
    age: number;
    photoUrl: string | null;
    owner: { name: string; email: string | null };
    accessStatus: AccessStatus;
    source?: "request" | "owner" | "referral";
    referredBy?: { name: string } | null;
};

const inputClass =
    "rounded-xl border border-sage-light/40 px-4 py-2.5 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition";

function StatusBadge({ status }: { status: AccessStatus }) {
    if (status === "approved") {
        return <span className="text-[10px] uppercase tracking-wide font-semibold text-sage bg-sage/10 rounded-full px-2 py-0.5">Patient</span>;
    }
    if (status === "pending") {
        return <span className="text-[10px] uppercase tracking-wide font-semibold text-terracotta bg-terracotta/10 rounded-full px-2 py-0.5">Awaiting owner</span>;
    }
    return <span className="text-[10px] uppercase tracking-wide font-semibold text-matcha/50 bg-matcha/5 rounded-full px-2 py-0.5">No access</span>;
}

export default function VetDashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [patients, setPatients] = useState<Pet[]>([]);
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
    const [requestNote, setRequestNote] = useState("");
    const [requesting, setRequesting] = useState(false);
    const [referEmail, setReferEmail] = useState("");
    const [referNote, setReferNote] = useState("");
    const [referring, setReferring] = useState(false);
    const [referMsg, setReferMsg] = useState("");
    const [showRefer, setShowRefer] = useState(false);
    const [clinic, setClinic] = useState<string | null>(null);

    const role = session?.user?.role;

    const loadPatients = useCallback(() => {
        return fetch("/api/vet/patients")
            .then((r) => r.json())
            .then((data) => setPatients(Array.isArray(data) ? data : []));
    }, []);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/login");
        } else if (status === "authenticated" && role !== "vet") {
            router.replace("/dashboard");
        }
    }, [status, role, router]);

    useEffect(() => {
        if (status !== "authenticated" || role !== "vet") return;
        loadPatients();
        fetch("/api/me")
            .then((r) => r.json())
            .then((me) => setClinic(me?.clinic ?? null));
    }, [status, role, loadPatients]);

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
        setReferMsg("");
        setShowRefer(false);
        setReports([]);
        if (pet.accessStatus !== "approved") return;
        const res = await fetch("/api/pets/" + pet.id + "/reports");
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
    }

    function updateStatus(petId: string, accessStatus: AccessStatus) {
        setResults((prev) => prev.map((p) => (p.id === petId ? { ...p, accessStatus } : p)));
        setSelectedPet((prev) => (prev && prev.id === petId ? { ...prev, accessStatus } : prev));
    }

    async function requestAccess(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!selectedPet) return;
        setRequesting(true);
        setErrorMsg("");
        const res = await fetch(`/api/pets/${selectedPet.id}/access`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note: requestNote }),
        });
        const data = await res.json().catch(() => ({}));
        setRequesting(false);
        if (!res.ok) {
            setErrorMsg(data.error || "Could not send the request.");
            return;
        }
        setRequestNote("");
        updateStatus(selectedPet.id, data.status);
        loadPatients();
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

    async function refer(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!selectedPet) return;
        setReferring(true);
        setReferMsg("");
        const res = await fetch(`/api/pets/${selectedPet.id}/access/refer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vetEmail: referEmail, note: referNote }),
        });
        const data = await res.json().catch(() => ({}));
        setReferring(false);
        if (!res.ok) {
            setReferMsg("✖ " + (data.error || "Could not refer."));
            return;
        }
        setReferMsg(`✓ ${vetName(data.vet?.name)} can now see ${selectedPet.name}'s records. The owner has been shown this referral.`);
        setReferEmail("");
        setReferNote("");
    }

    if (status !== "authenticated" || role !== "vet") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-cream">
                <p className="text-matcha/60">Loading...</p>
            </div>
        );
    }

    const approvedPatients = patients.filter((p) => p.accessStatus === "approved");
    const pendingPatients = patients.filter((p) => p.accessStatus === "pending");

    function PetRow({ pet }: { pet: Pet }) {
        return (
            <button
                onClick={() => selectPet(pet)}
                className={
                    "w-full text-left rounded-xl p-3 transition flex items-center gap-3 border " +
                    (selectedPet?.id === pet.id ? "bg-sage/20 border-sage" : "bg-cream hover:bg-pink/20 border-transparent")
                }
            >
                <PetAvatar name={pet.name} species={pet.species} photoUrl={pet.photoUrl} size={44} />
                <div className="min-w-0 flex-1">
                    <p className="font-medium text-matcha">{pet.name}</p>
                    <p className="text-xs text-matcha/60 truncate">
                        {pet.breed} · {pet.species} · {pet.age} yrs · Owner: {pet.owner.name}
                    </p>
                    {pet.source === "referral" && pet.referredBy && (
                        <p className="text-xs text-matcha/50">Referred by {vetName(pet.referredBy.name)}</p>
                    )}
                </div>
                <StatusBadge status={pet.accessStatus} />
            </button>
        );
    }

    return (
        <div className="min-h-screen bg-cream px-4 py-10">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-matcha">🩺 Vet Dashboard</h1>
                        <p className="text-sm text-matcha/60 mt-1">
                            Welcome, {vetName(session.user.name)}
                            {clinic && <> · {clinic}</>}
                        </p>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="bg-pink/40 hover:bg-pink/60 text-matcha font-medium rounded-xl px-4 py-2.5 text-sm transition"
                    >
                        Log out
                    </button>
                </div>

                {/* My patients */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mt-6">
                    <h2 className="font-medium text-matcha mb-1">My patients</h2>
                    <p className="text-xs text-matcha/50 mb-3">Pets whose owners have given you access.</p>
                    {approvedPatients.length === 0 ? (
                        <p className="text-sm text-matcha/50">No patients yet. Scan a pet&apos;s tag and request access below.</p>
                    ) : (
                        <div className="space-y-2">
                            {approvedPatients.map((pet) => <PetRow key={pet.id} pet={pet} />)}
                        </div>
                    )}
                    {pendingPatients.length > 0 && (
                        <>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-matcha/50 mt-5 mb-2">Waiting for owner approval</h3>
                            <div className="space-y-2">
                                {pendingPatients.map((pet) => <PetRow key={pet.id} pet={pet} />)}
                            </div>
                        </>
                    )}
                </div>

                {/* Search */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
                    <h2 className="font-medium text-matcha mb-1">Find a pet</h2>
                    <p className="text-xs text-matcha/50 mb-3">
                        Search your patients by name, or scan / paste the pet&apos;s PawTrace tag link to find a new pet.
                    </p>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            placeholder="Pet name, tag code, or tag link"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className={"flex-1 min-w-0 " + inputClass}
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
                        <p className="text-sm text-matcha/50 mt-4">
                            No match. New pets can only be found by their tag code or tag link, for the owner&apos;s privacy.
                        </p>
                    )}

                    {results.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {results.map((pet) => <PetRow key={pet.id} pet={pet} />)}
                        </div>
                    )}
                </div>

                {selectedPet && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
                        <div className="flex items-center gap-3 mb-4">
                            <PetAvatar name={selectedPet.name} species={selectedPet.species} photoUrl={selectedPet.photoUrl} size={48} />
                            <div className="min-w-0">
                                <h2 className="font-medium text-matcha">{selectedPet.name}</h2>
                                <p className="text-xs text-matcha/50 truncate">
                                    Owner: {selectedPet.owner.name}
                                    {selectedPet.owner.email && <> · {selectedPet.owner.email}</>}
                                </p>
                            </div>
                        </div>

                        {selectedPet.accessStatus === "approved" ? (
                            <>
                                <form onSubmit={handleSubmitReport}>
                                    <p className="text-xs text-matcha/50 mb-2">
                                        Write notes the way you normally would — AI turns them into a clear summary for {selectedPet.owner.name}.
                                    </p>
                                    <textarea
                                        placeholder="e.g. pruritus L ear x5d. otitis externa, yeast +++. surolan 5 gtt BID x10d, cone if scratching. recheck 2 wks."
                                        value={rawNotes}
                                        onChange={(e) => setRawNotes(e.target.value)}
                                        rows={5}
                                        maxLength={5000}
                                        className={"w-full font-mono text-sm " + inputClass}
                                    />
                                    <button
                                        type="submit"
                                        disabled={submitting || !rawNotes.trim()}
                                        className="mt-3 w-full bg-sage hover:bg-sage/90 text-white font-medium rounded-xl py-2.5 transition disabled:opacity-50"
                                    >
                                        {submitting ? "✨ Summarizing with AI… (can take up to 30s)" : "Add report"}
                                    </button>
                                </form>

                                {successMsg && <p className="text-sm text-sage bg-sage/10 rounded-lg px-3 py-2 mt-3">{successMsg}</p>}
                                {errorMsg && <p className="text-sm text-terracotta bg-terracotta/10 rounded-lg px-3 py-2 mt-3">{errorMsg}</p>}

                                {/* Referral */}
                                <div className="mt-4">
                                    <button onClick={() => setShowRefer(!showRefer)} className="text-sm text-sage font-medium hover:underline">
                                        {showRefer ? "Cancel referral" : "↗ Refer to another vet"}
                                    </button>
                                    {showRefer && (
                                        <form onSubmit={refer} className="mt-2 space-y-2 bg-cream rounded-xl p-3">
                                            <p className="text-xs text-matcha/60">
                                                The vet you refer gets access to {selectedPet.name}&apos;s records straight away.
                                                {" "}{selectedPet.owner.name} sees who referred them and can remove access at any time.
                                            </p>
                                            <input
                                                type="email"
                                                required
                                                value={referEmail}
                                                onChange={(e) => setReferEmail(e.target.value)}
                                                placeholder="Other vet's PawTrace email"
                                                className={"w-full text-sm " + inputClass}
                                            />
                                            <input
                                                value={referNote}
                                                onChange={(e) => setReferNote(e.target.value)}
                                                maxLength={300}
                                                placeholder="Reason, e.g. Dermatology consult for recurring ear infections"
                                                className={"w-full text-sm " + inputClass}
                                            />
                                            <button
                                                type="submit"
                                                disabled={referring || !referEmail}
                                                className="w-full bg-sage hover:bg-sage/90 text-white font-medium rounded-xl py-2 text-sm transition disabled:opacity-50"
                                            >
                                                {referring ? "Referring..." : "Refer"}
                                            </button>
                                        </form>
                                    )}
                                    {referMsg && <p className="text-xs text-matcha/70 mt-2">{referMsg}</p>}
                                </div>

                                <div className="mt-6">
                                    <h3 className="text-sm font-medium text-matcha/70 mb-2">Medical history</h3>
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
                            </>
                        ) : selectedPet.accessStatus === "pending" ? (
                            <div className="bg-cream rounded-xl p-4 text-sm text-matcha">
                                ⏳ Your request is waiting for {selectedPet.owner.name}&apos;s approval. You&apos;ll be able to see
                                {" "}{selectedPet.name}&apos;s records and add reports as soon as they approve.
                            </div>
                        ) : (
                            <form onSubmit={requestAccess} className="space-y-3">
                                <p className="text-sm text-matcha">
                                    🔒 {selectedPet.name}&apos;s medical records are private.
                                    {selectedPet.accessStatus === "denied" || selectedPet.accessStatus === "revoked"
                                        ? ` ${selectedPet.owner.name} has not given you access.`
                                        : ` Ask ${selectedPet.owner.name} for permission to view them and add reports.`}
                                </p>
                                <textarea
                                    rows={2}
                                    maxLength={300}
                                    value={requestNote}
                                    onChange={(e) => setRequestNote(e.target.value)}
                                    placeholder="Message to the owner, e.g. Bruno is in for a check-up at Happy Paws today."
                                    className={"w-full text-sm " + inputClass}
                                />
                                <button
                                    type="submit"
                                    disabled={requesting}
                                    className="w-full bg-sage hover:bg-sage/90 text-white font-medium rounded-xl py-2.5 transition disabled:opacity-50"
                                >
                                    {requesting ? "Sending..." : "Request access from owner"}
                                </button>
                                {errorMsg && <p className="text-sm text-terracotta bg-terracotta/10 rounded-lg px-3 py-2">{errorMsg}</p>}
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
