"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Pet = {
    id: string;
    name: string;
    breed: string;
    species: string;
    age: number;
    height: number;
    weight: number;
    isLost: boolean;
    qrCode: string;
};

type Report = {
    id: string;
    summary: string;
    diagnosis: string | null;
    medication: string | null;
    nextVisit: string | null;
    createdAt: string;
    vet: { name: string };
};

type Paw = {
    id: number;
    x: number;
    y: number;
};

export default function PetDetailPage() {
    const params = useParams();
    const id = params.id as string;

    const [pet, setPet] = useState<Pet | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [qrImage, setQrImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);
    const [paws, setPaws] = useState<Paw[]>([]);
    const [pawIdCounter, setPawIdCounter] = useState(0);

    useEffect(() => {
        loadPet();
        loadReports();
    }, [id]);

    async function loadPet() {
        const res = await fetch("/api/pets");
        const data = await res.json();
        const found = Array.isArray(data) ? data.find(function (p: Pet) { return p.id === id; }) : null;
        setPet(found || null);
        setLoading(false);
    }

    async function loadReports() {
        const res = await fetch("/api/pets/" + id + "/reports");
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
    }

    async function loadQr() {
        const res = await fetch("/api/pets/" + id + "/qr");
        const data = await res.json();
        setQrImage(data.qrImage || null);
    }

    async function toggleLost() {
        if (!pet) return;
        setToggling(true);
        const res = await fetch("/api/pets/" + id + "/lost", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isLost: !pet.isLost }),
        });
        const updated = await res.json();
        setPet(updated);
        setToggling(false);
    }

    function handlePageClick(e: React.MouseEvent<HTMLDivElement>) {
        var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReducedMotion) return;

        var newPaw = { id: pawIdCounter, x: e.clientX, y: e.clientY };
        setPaws(function (prev) { return prev.concat([newPaw]); });
        setPawIdCounter(function (prev) { return prev + 1; });

        setTimeout(function () {
            setPaws(function (prev) { return prev.filter(function (p) { return p.id !== newPaw.id; }); });
        }, 900);
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-cream">
                <p className="text-matcha/60">Loading...</p>
            </div>
        );
    }

    if (!pet) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-cream">
                <p className="text-matcha/60">Pet not found.</p>
            </div>
        );
    }

    var isDog = pet.species === "dog";

    return (
        <div className="min-h-screen bg-cream px-4 py-10 relative overflow-hidden" onClick={handlePageClick}>
            {paws.map(function (paw) {
                return (
                    <div
                        key={paw.id}
                        className="pointer-events-none fixed z-50 animate-paw-pop"
                        style={{ left: paw.x - 16, top: paw.y - 16 }}
                    >
                        {isDog ? (
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="#6B8E5A">
                                <ellipse cx="16" cy="22" rx="8" ry="6" />
                                <circle cx="8" cy="12" r="3.2" />
                                <circle cx="14" cy="7" r="3.2" />
                                <circle cx="20" cy="7" r="3.2" />
                                <circle cx="25" cy="13" r="3" />
                            </svg>
                        ) : (
                            <svg width="30" height="30" viewBox="0 0 32 32" fill="#F4C6C6">
                                <ellipse cx="16" cy="21" rx="7" ry="5.5" />
                                <circle cx="9" cy="12" r="2.7" />
                                <circle cx="14.5" cy="8" r="2.7" />
                                <circle cx="19.5" cy="8" r="2.7" />
                                <circle cx="24" cy="12" r="2.5" />
                            </svg>
                        )}
                    </div>
                );
            })}

            <div className="max-w-2xl mx-auto">
                <a href="/dashboard" className="text-sm text-sage font-medium hover:underline">
                    Back to My Pets
                </a>

                <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-matcha">{pet.name}</h1>
                            <p className="text-sm text-matcha/60 mt-1">
                                {pet.breed} - {pet.species} - {pet.age} yrs - {pet.height}cm - {pet.weight}kg
                            </p>
                        </div>
                        {pet.isLost ? (
                            <span className="text-xs font-medium text-terracotta bg-terracotta/10 rounded-full px-3 py-1">
                                Lost
                            </span>
                        ) : null}
                    </div>

                    <button
                        onClick={toggleLost}
                        disabled={toggling}
                        className={
                            pet.isLost
                                ? "mt-4 w-full rounded-xl py-2.5 font-medium transition bg-sage hover:bg-sage/90 text-white"
                                : "mt-4 w-full rounded-xl py-2.5 font-medium transition bg-terracotta hover:bg-terracotta/90 text-white"
                        }
                    >
                        {toggling ? "Updating..." : pet.isLost ? "Mark as Found" : "Mark as Lost"}
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 mt-4 text-center">
                    <h2 className="font-medium text-matcha mb-3">PawTrace Tag</h2>
                    {qrImage ? (
                        <img src={qrImage} alt="QR code" className="mx-auto rounded-xl" />
                    ) : (
                        <button
                            onClick={loadQr}
                            className="bg-sage-light/40 hover:bg-sage-light/60 text-matcha font-medium rounded-xl px-4 py-2.5 text-sm transition"
                        >
                            Generate QR Tag
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
                    <h2 className="font-medium text-matcha mb-3">Medical Reports</h2>
                    {reports.length === 0 ? (
                        <p className="text-sm text-matcha/60">No reports yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {reports.map(function (report) {
                                return (
                                    <div key={report.id} className="bg-cream rounded-xl p-4">
                                        <p className="text-sm text-matcha">{report.summary}</p>
                                        <p className="text-xs text-matcha/50 mt-1">
                                            By Dr. {report.vet.name}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}