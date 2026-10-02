"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import PetAvatar from "@/components/PetAvatar";
import PetForm, { PetFormValues } from "@/components/PetForm";
import ReportCard, { Report } from "@/components/ReportCard";
import LocationMap, { MapPoint } from "@/components/LocationMap";

type Pet = PetFormValues & {
    id: string;
    age: number;
    height: number;
    weight: number;
    isLost: boolean;
    qrCode: string;
};

type Scan = {
    id: string;
    lat: number | null;
    lng: number | null;
    scannedAt: string;
};

type Message = {
    id: string;
    name: string | null;
    contact: string | null;
    message: string;
    lat: number | null;
    lng: number | null;
    read: boolean;
    createdAt: string;
};

type QrInfo = { qrImage: string; scanUrl: string; reachableFromPhones: boolean; secure: boolean };

type Paw = {
    id: number;
    x: number;
    y: number;
};

function formatScanTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString() + " at " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}


function mapsLink(lat: number, lng: number) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
}

function contactHref(contact: string) {
    if (contact.includes("@")) return "mailto:" + contact;
    const digits = contact.replace(/[^\d+]/g, "");
    return digits.length >= 7 ? "tel:" + digits : null;
}

export default function PetDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();
    const { status } = useSession();

    const [pet, setPet] = useState<Pet | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [scans, setScans] = useState<Scan[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [qr, setQr] = useState<QrInfo | null>(null);
    const [qrError, setQrError] = useState(false);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [toggling, setToggling] = useState(false);
    const [error, setError] = useState("");
    const [paws, setPaws] = useState<Paw[]>([]);
    const pawIdCounter = useRef(0);

    useEffect(() => {
        if (status === "unauthenticated") router.replace("/login");
    }, [status, router]);

    useEffect(() => {
        if (status !== "authenticated") return;

        async function load() {
            const [petRes, reportsRes, scansRes, messagesRes, qrRes] = await Promise.all([
                fetch("/api/pets/" + id),
                fetch("/api/pets/" + id + "/reports"),
                fetch("/api/pets/" + id + "/scans"),
                fetch("/api/pets/" + id + "/messages"),
                fetch("/api/pets/" + id + "/qr"),
            ]);
            const [petData, reportsData, scansData, messagesData, qrData] = await Promise.all(
                [petRes, reportsRes, scansRes, messagesRes, qrRes].map((r) => r.json().catch(() => null))
            );
            setPet(petRes.ok ? petData : null);
            setReports(Array.isArray(reportsData) ? reportsData : []);
            setScans(Array.isArray(scansData) ? scansData : []);
            setMessages(Array.isArray(messagesData) ? messagesData : []);
            if (qrRes.ok && qrData?.qrImage) setQr(qrData);
            else setQrError(true);
            setLoading(false);

            // Opening the page counts as reading the finder messages
            if (Array.isArray(messagesData) && messagesData.some((m: Message) => !m.read)) {
                fetch("/api/pets/" + id + "/messages", { method: "PATCH" });
            }
        }

        load();
    }, [id, status]);

    async function toggleLost() {
        if (!pet) return;
        setToggling(true);
        setError("");
        const res = await fetch("/api/pets/" + id + "/lost", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isLost: !pet.isLost }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            setPet(data);
        } else {
            setError(data.error || "Could not update status. Please try again.");
        }
        setToggling(false);
    }

    async function savePet(values: PetFormValues) {
        const res = await fetch("/api/pets/" + id, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return data.error || "Could not save changes.";
        setPet(data);
        setEditing(false);
        return null;
    }

    async function deletePet() {
        if (!pet) return;
        const ok = window.confirm(
            `Delete ${pet.name}? This permanently removes their tag, scan history, messages and medical reports.`
        );
        if (!ok) return;
        const res = await fetch("/api/pets/" + id, { method: "DELETE" });
        if (res.ok) {
            router.replace("/dashboard");
        } else {
            setError("Could not delete. Please try again.");
        }
    }

    async function copyLink() {
        if (!qr) return;
        try {
            await navigator.clipboard.writeText(qr.scanUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            window.prompt("Copy this link:", qr.scanUrl);
        }
    }

    function handlePageClick(e: React.MouseEvent<HTMLDivElement>) {
        // Only on empty background, not while using buttons/forms
        if ((e.target as HTMLElement).closest("button, a, input, textarea, select, label, iframe")) return;
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReducedMotion) return;

        const newPaw = { id: pawIdCounter.current++, x: e.clientX, y: e.clientY };
        setPaws((prev) => prev.concat([newPaw]));

        setTimeout(() => {
            setPaws((prev) => prev.filter((p) => p.id !== newPaw.id));
        }, 900);
    }

    if (status !== "authenticated" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-cream">
                <p className="text-matcha/60">Loading...</p>
            </div>
        );
    }

    if (!pet) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-cream gap-3">
                <p className="text-matcha/60">Pet not found.</p>
                <Link href="/dashboard" className="text-sm text-sage font-medium hover:underline">
                    Back to My Pets
                </Link>
            </div>
        );
    }

    const isDog = pet.species === "dog";
    // Every reported location, newest first: tag scans plus finder messages
    const mapPoints: MapPoint[] = [
        ...scans
            .filter((s) => s.lat !== null && s.lng !== null)
            .map((s) => ({ lat: s.lat!, lng: s.lng!, at: s.scannedAt, kind: "scan" as const, label: "Tag scanned " + formatScanTime(s.scannedAt) })),
        ...messages
            .filter((m) => m.lat !== null && m.lng !== null)
            .map((m) => ({ lat: m.lat!, lng: m.lng!, at: m.createdAt, kind: "message" as const, label: (m.name || "A finder") + " messaged " + formatScanTime(m.createdAt) })),
    ]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 25)
        .map(({ lat, lng, kind, label }) => ({ lat, lng, kind, label }));
    const latestPoint = mapPoints[0];
    const newMessages = messages.filter((m) => !m.read).length;

    return (
        <div className="min-h-screen bg-cream px-4 py-10 relative overflow-hidden" onClick={handlePageClick}>
            {paws.map((paw) => (
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
            ))}

            <div className="max-w-2xl mx-auto">
                <Link href="/dashboard" className="text-sm text-sage font-medium hover:underline">
                    ← Back to My Pets
                </Link>

                {/* Profile */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
                    {editing ? (
                        <>
                            <h2 className="font-medium text-matcha mb-4">Edit {pet.name}</h2>
                            <PetForm initial={pet} submitLabel="Save changes" onSubmit={savePet} onCancel={() => setEditing(false)} />
                            <div className="mt-6 pt-4 border-t border-sage-light/30">
                                <button
                                    onClick={deletePet}
                                    className="text-sm text-terracotta font-medium hover:underline"
                                >
                                    Delete {pet.name}…
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-start gap-4">
                                <PetAvatar name={pet.name} species={pet.species} photoUrl={pet.photoUrl} size={88} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h1 className="text-2xl font-semibold text-matcha">{pet.name}</h1>
                                        {pet.isLost && (
                                            <span className="text-xs font-medium text-terracotta bg-terracotta/10 rounded-full px-3 py-1 shrink-0">
                                                Lost
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-matcha/60 mt-1">
                                        {pet.breed} · {pet.species} · {pet.age} yrs · {pet.height} cm · {pet.weight} kg
                                    </p>
                                    {pet.publicNotes && (
                                        <p className="text-sm text-matcha/80 mt-2 bg-cream rounded-lg px-3 py-2">
                                            <span className="text-xs text-matcha/50 block">Note for finders</span>
                                            {pet.publicNotes}
                                        </p>
                                    )}
                                    <button
                                        onClick={() => setEditing(true)}
                                        className="text-sm text-sage font-medium hover:underline mt-2"
                                    >
                                        Edit details
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={toggleLost}
                                disabled={toggling}
                                className={
                                    pet.isLost
                                        ? "mt-4 w-full rounded-xl py-2.5 font-medium transition bg-sage hover:bg-sage/90 text-white disabled:opacity-60"
                                        : "mt-4 w-full rounded-xl py-2.5 font-medium transition bg-terracotta hover:bg-terracotta/90 text-white disabled:opacity-60"
                                }
                            >
                                {toggling ? "Updating..." : pet.isLost ? `🏠 ${pet.name} is home — mark as found` : "Mark as Lost"}
                            </button>
                        </>
                    )}
                    {error && (
                        <p className="text-sm text-terracotta bg-terracotta/10 rounded-lg px-3 py-2 mt-3">
                            {error}
                        </p>
                    )}
                </div>

                {/* Finder messages */}
                {(messages.length > 0 || pet.isLost) && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
                        <h2 className="font-medium text-matcha mb-3">
                            💬 Messages from finders
                            {newMessages > 0 && (
                                <span className="ml-2 text-xs font-medium text-white bg-terracotta rounded-full px-2 py-0.5 align-middle">
                                    {newMessages} new
                                </span>
                            )}
                        </h2>
                        {messages.length === 0 ? (
                            <p className="text-sm text-matcha/60">
                                No messages yet. When someone scans {pet.name}&apos;s tag they can send you a note and their location.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {messages.map((m) => {
                                    const href = m.contact ? contactHref(m.contact) : null;
                                    return (
                                        <div
                                            key={m.id}
                                            className={"rounded-xl p-4 " + (m.read ? "bg-cream" : "bg-pink/30 ring-1 ring-terracotta/30")}
                                        >
                                            <p className="text-sm text-matcha whitespace-pre-wrap">{m.message}</p>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-matcha/60">
                                                <span>{m.name || "Anonymous finder"}</span>
                                                {m.contact && (
                                                    href ? (
                                                        <a href={href} className="text-sage font-medium hover:underline">{m.contact}</a>
                                                    ) : (
                                                        <span>{m.contact}</span>
                                                    )
                                                )}
                                                {m.lat !== null && m.lng !== null && (
                                                    <a
                                                        href={mapsLink(m.lat, m.lng)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sage font-medium hover:underline"
                                                    >
                                                        📍 View location
                                                    </a>
                                                )}
                                                <span className="ml-auto">{formatScanTime(m.createdAt)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* QR tag */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
                    <h2 className="font-medium text-matcha mb-1">PawTrace Tag</h2>
                    <p className="text-sm text-matcha/60 mb-4">
                        Print this and attach it to {pet.name}&apos;s collar. Anyone who scans it sees your contact details — never medical history.
                    </p>
                    {qr ? (
                        <div className="flex flex-col sm:flex-row items-center gap-5">
                            {/* eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimize */}
                            <img
                                src={qr.qrImage}
                                alt={"QR code for " + pet.name}
                                className="w-44 h-44 rounded-xl border border-sage-light/30"
                            />
                            <div className="flex-1 w-full min-w-0 space-y-3">
                                <div className="flex items-center gap-2 bg-cream rounded-xl px-3 py-2">
                                    <code className="text-xs text-matcha/70 truncate flex-1">{qr.scanUrl}</code>
                                    <button onClick={copyLink} className="text-xs text-sage font-semibold hover:underline shrink-0">
                                        {copied ? "Copied ✓" : "Copy"}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <a
                                        href={qr.qrImage}
                                        download={"pawtrace-" + pet.name.toLowerCase().replace(/\s+/g, "-") + "-qr.png"}
                                        className="text-center bg-sage-light/40 hover:bg-sage-light/60 text-matcha font-medium rounded-xl px-3 py-2 text-sm transition"
                                    >
                                        Download PNG
                                    </a>
                                    <Link
                                        href={`/pets/${pet.id}/tag`}
                                        className="text-center bg-sage hover:bg-sage/90 text-white font-medium rounded-xl px-3 py-2 text-sm transition"
                                    >
                                        Print tag
                                    </Link>
                                    <Link
                                        href={`/pets/${pet.id}/tag?layout=poster`}
                                        className="text-center bg-terracotta/15 hover:bg-terracotta/25 text-terracotta font-medium rounded-xl px-3 py-2 text-sm transition"
                                    >
                                        Lost poster
                                    </Link>
                                    <a
                                        href={qr.scanUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-center bg-cream hover:bg-pink/20 text-matcha font-medium rounded-xl px-3 py-2 text-sm transition"
                                    >
                                        Preview scan page
                                    </a>
                                </div>
                                {qr.reachableFromPhones && !qr.secure && (
                                    <p className="text-xs text-matcha/70 bg-pink/30 rounded-lg px-3 py-2">
                                        ⚠️ Test link: it only opens on phones connected to your Wi-Fi, Safari may show a
                                        &ldquo;Not Secure&rdquo; warning, and finders can&apos;t share their location because
                                        browsers only allow that on https:// sites. Once PawTrace is deployed (e.g. on Vercel)
                                        and NEXT_PUBLIC_APP_URL is set, tags get a secure link that works everywhere.
                                    </p>
                                )}
                                {!qr.reachableFromPhones && (
                                    <p className="text-xs text-terracotta bg-terracotta/10 rounded-lg px-3 py-2">
                                        This link only works on this computer. Set NEXT_PUBLIC_APP_URL to your deployed
                                        address (or connect to Wi-Fi) so phones can open it.
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-terracotta">
                            {qrError ? "Could not create the QR code. Refresh the page to try again." : "Creating QR code…"}
                        </p>
                    )}
                </div>

                {latestPoint && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
                        <h2 className="font-medium text-matcha mb-1">📍 Where {pet.name} has been seen</h2>
                        <p className="text-xs text-matcha/50 mb-3">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-terracotta align-middle mr-1" />
                            Finder message
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-sage align-middle ml-3 mr-1" />
                            Tag scan · biggest dot is the most recent
                        </p>
                        <LocationMap points={mapPoints} />
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-matcha/50">Latest: {latestPoint.label}</p>
                            <a
                                href={mapsLink(latestPoint.lat, latestPoint.lng)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-sage font-medium hover:underline shrink-0 ml-3"
                            >
                                Open in Google Maps
                            </a>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
                    <h2 className="font-medium text-matcha mb-3">Scan Activity</h2>
                    {scans.length === 0 ? (
                        <p className="text-sm text-matcha/60">
                            No one has scanned this tag yet.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {scans.map((scan) => (
                                <div key={scan.id} className="flex items-center justify-between bg-cream rounded-xl px-4 py-2.5">
                                    <p className="text-sm text-matcha">{formatScanTime(scan.scannedAt)}</p>
                                    {scan.lat !== null && scan.lng !== null ? (
                                        <a
                                            href={mapsLink(scan.lat, scan.lng)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-sage font-medium hover:underline"
                                        >
                                            📍 Location shared
                                        </a>
                                    ) : (
                                        <span className="text-xs text-matcha/40">No location</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
                    <h2 className="font-medium text-matcha mb-3">Medical Reports</h2>
                    {reports.length === 0 ? (
                        <p className="text-sm text-matcha/60">No reports yet. Reports added by your vet will appear here.</p>
                    ) : (
                        <div className="space-y-3">
                            {reports.map((report) => (
                                <ReportCard key={report.id} report={report} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
