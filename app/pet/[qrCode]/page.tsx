"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import PetAvatar from "@/components/PetAvatar";

type PublicPet = {
    name: string;
    breed: string;
    species: string;
    age: number;
    photoUrl: string | null;
    publicNotes: string | null;
    isLost: boolean;
    ownerName: string;
    ownerEmail: string;
    ownerPhone: string | null;
    error?: string;
};

type Coords = { lat: number; lng: number };
type LocationStatus = "idle" | "asking" | "sent" | "denied" | "unavailable";

function getPosition(): Promise<Coords> {
    return new Promise((resolve, reject) => {
        if (!("geolocation" in navigator) || !window.isSecureContext) {
            reject(new Error("unavailable"));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
            reject,
            { enableHighAccuracy: true, timeout: 15000 }
        );
    });
}

export default function PetPublicPage() {
    const params = useParams();
    const qrCode = params.qrCode as string;

    const [pet, setPet] = useState<PublicPet | null>(null);
    const [coords, setCoords] = useState<Coords | null>(null);
    const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
    const scanIdPromise = useRef<Promise<string | null> | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [finderName, setFinderName] = useState("");
    const [finderContact, setFinderContact] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [formError, setFormError] = useState("");

    useEffect(() => {
        fetch("/api/pet/" + qrCode)
            .then((res) => res.json())
            .then((data) => setPet(data))
            .catch(() => setPet({ error: "Network error" } as PublicPet));
    }, [qrCode]);

    // Attach the finder's location to this visit's scan record so it shows on the owner's map
    const attachLocation = useCallback(
        async (c: Coords) => {
            const scanId = await scanIdPromise.current;
            await fetch("/api/pet/" + qrCode + "/scan-location", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(scanId ? { scanId, ...c } : c),
            }).catch(() => undefined);
        },
        [qrCode]
    );

    const requestLocation = useCallback(async () => {
        setLocationStatus("asking");
        try {
            const c = await getPosition();
            setCoords(c);
            await attachLocation(c);
            setLocationStatus("sent");
        } catch (err) {
            setLocationStatus(err instanceof Error && err.message === "unavailable" ? "unavailable" : "denied");
        }
    }, [attachLocation]);

    // On every scan: log the visit straight away, then immediately ask for the finder's location.
    // The scan is saved even if the finder ignores or denies the prompt.
    useEffect(() => {
        if (!pet || pet.error || scanIdPromise.current) return;

        scanIdPromise.current = fetch("/api/pet/" + qrCode + "/scan-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
        })
            .then((res) => res.json())
            .then((data) => (typeof data?.scanId === "string" ? data.scanId : null))
            .catch(() => null);

        requestLocation();
    }, [pet, qrCode, requestLocation]);

    async function sendMessage(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSending(true);
        setFormError("");
        const res = await fetch("/api/pet/" + qrCode + "/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: finderName, contact: finderContact, message, ...coords }),
        }).catch(() => null);
        setSending(false);
        if (!res || !res.ok) {
            const data = res ? await res.json().catch(() => ({})) : {};
            setFormError(data.error || "Could not send. Please try again or contact the owner directly.");
            return;
        }
        setSent(true);
    }

    if (!pet) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-cream">
                <p className="text-matcha/60">Loading...</p>
            </div>
        );
    }

    if (pet.error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-cream px-4">
                <div className="bg-white rounded-2xl shadow-sm p-8 text-center max-w-sm">
                    <div className="text-4xl mb-2">🐾</div>
                    <p className="text-matcha/70">This tag isn&apos;t linked to a pet.</p>
                </div>
            </div>
        );
    }

    const phoneDigits = pet.ownerPhone?.replace(/[^\d]/g, "");

    return (
        <div className="min-h-screen bg-cream px-4 py-8">
            <div className="max-w-sm mx-auto">
                <p className="text-center text-lg font-semibold text-matcha/70 mb-5" style={{ fontFamily: "var(--font-heading)" }}>
                    🐾 PawTrace
                </p>

                {pet.isLost && (
                    <div className="bg-terracotta text-white rounded-2xl p-4 mb-4 text-center shadow-sm">
                        <p className="font-semibold text-lg">{pet.name} is lost!</p>
                        <p className="text-sm text-white/90 mt-1">
                            Thank you for scanning. Please contact the owner below to help bring {pet.name} home.
                        </p>
                    </div>
                )}

                {/* Location status — asked for first, right after the scan */}
                <div
                    className={
                        "rounded-2xl px-4 py-3 mb-4 text-sm " +
                        (locationStatus === "sent" ? "bg-sage/15 text-matcha" : "bg-white shadow-sm text-matcha")
                    }
                >
                    {locationStatus === "sent" ? (
                        <p>📍 <strong>Location shared.</strong> {pet.ownerName} can now see where {pet.name} was found. Thank you!</p>
                    ) : locationStatus === "asking" || locationStatus === "idle" ? (
                        <p>📍 Please tap <strong>Allow</strong> to share your location so {pet.ownerName} can see where {pet.name} is.</p>
                    ) : locationStatus === "denied" ? (
                        <>
                            <p>📍 Location wasn&apos;t shared. It helps {pet.ownerName} find {pet.name} quickly.</p>
                            <button
                                onClick={requestLocation}
                                className="mt-2 w-full bg-sage hover:bg-sage/90 text-white font-medium rounded-xl py-2 transition"
                            >
                                Share my location
                            </button>
                            <p className="text-xs text-matcha/50 mt-2">
                                If nothing happens: on iPhone open Settings → Privacy &amp; Security → Location Services →
                                Safari Websites → &ldquo;While Using&rdquo;. On Android tap the lock icon in the address bar → Permissions → Location.
                            </p>
                        </>
                    ) : (
                        <p>
                            📍 Your browser can&apos;t share location from this link (it isn&apos;t a secure https:// address).
                            Please message or call {pet.ownerName} and say where you found {pet.name}.
                        </p>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex flex-col items-center text-center">
                        <PetAvatar name={pet.name} species={pet.species} photoUrl={pet.photoUrl} size={128} className="rounded-3xl" />
                        <h1 className="text-3xl font-semibold text-matcha mt-4">{pet.name}</h1>
                        <p className="text-sm text-matcha/60 mt-1 capitalize">
                            {pet.breed} · {pet.species} · {pet.age} {pet.age === 1 ? "yr" : "yrs"}
                        </p>
                    </div>

                    {pet.publicNotes && (
                        <div className="mt-4 bg-pink/25 rounded-xl px-4 py-3">
                            <p className="text-xs uppercase tracking-wide text-matcha/50 mb-0.5">From the owner</p>
                            <p className="text-sm text-matcha">{pet.publicNotes}</p>
                        </div>
                    )}

                    <div className="mt-5 pt-5 border-t border-sage-light/30">
                        <p className="text-xs uppercase tracking-wide text-matcha/40 mb-1">Owner</p>
                        <p className="text-matcha font-medium">{pet.ownerName}</p>

                        <div className="grid grid-cols-2 gap-2 mt-3">
                            {phoneDigits && (
                                <>
                                    <a
                                        href={"tel:" + pet.ownerPhone!.replace(/[^\d+]/g, "")}
                                        className="text-center bg-sage hover:bg-sage/90 text-white font-medium rounded-xl py-2.5 text-sm transition"
                                    >
                                        📞 Call
                                    </a>
                                    <a
                                        href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Hi! I found ${pet.name} via their PawTrace tag.`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-center bg-[#25D366] hover:bg-[#25D366]/90 text-white font-medium rounded-xl py-2.5 text-sm transition"
                                    >
                                        WhatsApp
                                    </a>
                                </>
                            )}
                            <a
                                href={"mailto:" + pet.ownerEmail + "?subject=" + encodeURIComponent("I found " + pet.name)}
                                className={
                                    "text-center bg-sage-light/40 hover:bg-sage-light/60 text-matcha font-medium rounded-xl py-2.5 text-sm transition " +
                                    (phoneDigits ? "" : "col-span-2")
                                }
                            >
                                ✉️ Email
                            </a>
                            {phoneDigits && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="bg-pink/40 hover:bg-pink/60 text-matcha font-medium rounded-xl py-2.5 text-sm transition"
                                >
                                    💬 Message
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-matcha/50 mt-2 break-all">{pet.ownerEmail}</p>
                    </div>
                </div>

                {/* Leave a message for the owner */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
                    {sent ? (
                        <div className="text-center py-2">
                            <div className="text-3xl mb-2">💚</div>
                            <p className="font-medium text-matcha">Message sent to {pet.ownerName}</p>
                            <p className="text-sm text-matcha/60 mt-1">Thank you for helping {pet.name}!</p>
                        </div>
                    ) : !showForm && !pet.isLost ? (
                        <button
                            onClick={() => setShowForm(true)}
                            className="w-full text-sm text-sage font-medium hover:underline"
                        >
                            Found {pet.name}? Leave a message for the owner
                        </button>
                    ) : (
                        <form onSubmit={sendMessage} className="space-y-3">
                            <h2 className="font-medium text-matcha">I found {pet.name}</h2>
                            <textarea
                                required
                                rows={3}
                                maxLength={1000}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={`Where did you find ${pet.name}? Are they with you now?`}
                                className="w-full rounded-xl border border-sage-light/40 px-3 py-2 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    value={finderName}
                                    onChange={(e) => setFinderName(e.target.value)}
                                    placeholder="Your name"
                                    maxLength={80}
                                    className="min-w-0 rounded-xl border border-sage-light/40 px-3 py-2 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                                />
                                <input
                                    value={finderContact}
                                    onChange={(e) => setFinderContact(e.target.value)}
                                    placeholder="Phone or email"
                                    maxLength={120}
                                    className="min-w-0 rounded-xl border border-sage-light/40 px-3 py-2 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                                />
                            </div>

                            {coords ? (
                                <p className="text-xs text-sage">📍 Your current location will be included.</p>
                            ) : locationStatus === "unavailable" ? (
                                <p className="text-xs text-matcha/50">Location sharing isn&apos;t available on this connection — please describe where you are.</p>
                            ) : (
                                <button
                                    type="button"
                                    onClick={requestLocation}
                                    disabled={locationStatus === "asking"}
                                    className="text-xs text-sage font-medium hover:underline disabled:opacity-50"
                                >
                                    {locationStatus === "asking"
                                        ? "Getting location…"
                                        : locationStatus === "denied"
                                          ? "Location blocked — tap to try again"
                                          : "📍 Include my current location"}
                                </button>
                            )}

                            {formError && (
                                <p className="text-sm text-terracotta bg-terracotta/10 rounded-lg px-3 py-2">{formError}</p>
                            )}

                            <button
                                type="submit"
                                disabled={sending || !message.trim()}
                                className="w-full bg-sage hover:bg-sage/90 text-white font-medium rounded-xl py-2.5 transition disabled:opacity-50"
                            >
                                {sending ? "Sending..." : "Send to owner"}
                            </button>
                        </form>
                    )}
                </div>

                <p className="text-center text-xs text-matcha/40 mt-6">
                    Only contact details are shared here — {pet.name}&apos;s medical records stay private.
                </p>
            </div>
        </div>
    );
}
