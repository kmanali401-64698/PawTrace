"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import PetAvatar from "@/components/PetAvatar";

type PublicPet = {
    name: string;
    breed: string;
    species: string;
    photoUrl: string | null;
    isLost: boolean;
    // Only present while the pet is reported lost
    age?: number;
    publicNotes?: string | null;
    ownerName?: string;
    ownerEmail?: string;
    ownerPhone?: string | null;
    error?: string;
};

type Coords = { lat: number; lng: number };
type LocationStatus = "idle" | "asking" | "sent" | "denied" | "unavailable";

const inputClass =
    "w-full min-w-0 rounded-xl border border-sage-light/40 px-3 py-2 text-sm outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition";

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

// Mirrors the server check: a phone number (7–15 digits) or an email address
function isValidContact(raw: string) {
    const value = raw.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
    return /^\+?\d{7,15}$/.test(value.replace(/[^\d+]/g, ""));
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
    const [contactTouched, setContactTouched] = useState(false);
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
        try {
            const c = await getPosition();
            setCoords(c);
            await attachLocation(c);
            setLocationStatus("sent");
        } catch (err) {
            setLocationStatus(err instanceof Error && err.message === "unavailable" ? "unavailable" : "denied");
        }
    }, [attachLocation]);

    // Manual retry from a button: show progress while the browser prompt is open
    function retryLocation() {
        setLocationStatus("asking");
        requestLocation();
    }

    // Every scan is logged so the owner notices it. Only for a lost pet do we
    // immediately ask the finder for their location.
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

        if (!pet.isLost) return;
        getPosition()
            .then(async (c) => {
                setCoords(c);
                await attachLocation(c);
                setLocationStatus("sent");
            })
            .catch((err) => {
                setLocationStatus(err instanceof Error && err.message === "unavailable" ? "unavailable" : "denied");
            });
    }, [pet, qrCode, attachLocation]);

    async function sendMessage(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setContactTouched(true);
        if (finderName.trim().length < 2 || !isValidContact(finderContact) || !message.trim()) {
            setFormError("Please fill in your name, a phone number or email, and a message.");
            return;
        }
        setSending(true);
        setFormError("");
        const res = await fetch("/api/pet/" + qrCode + "/message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: finderName,
                contact: finderContact,
                message,
                ...(pet?.isLost ? coords : null),
            }),
        }).catch(() => null);
        setSending(false);
        if (!res || !res.ok) {
            const data = res ? await res.json().catch(() => ({})) : {};
            setFormError(data.error || "Could not send. Please try again.");
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

    const ownerLabel = pet.ownerName ?? "the owner";
    const contactInvalid = contactTouched && finderContact.trim() !== "" && !isValidContact(finderContact);

    const messageForm = sent ? (
        <div className="text-center py-2">
            <div className="text-3xl mb-2">💚</div>
            <p className="font-medium text-matcha">Message sent to {ownerLabel}</p>
            <p className="text-sm text-matcha/60 mt-1">
                Thank you for helping {pet.name}! The owner will contact you on the details you gave.
            </p>
        </div>
    ) : (
        <form onSubmit={sendMessage} className="space-y-3" noValidate>
            <h2 className="font-medium text-matcha">I found {pet.name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="text-xs text-matcha/70">
                    Your name <span className="text-terracotta">*</span>
                    <input
                        required
                        minLength={2}
                        value={finderName}
                        onChange={(e) => setFinderName(e.target.value)}
                        placeholder="e.g. Asha Patil"
                        maxLength={80}
                        autoComplete="name"
                        className={inputClass + " mt-1"}
                    />
                </label>
                <label className="text-xs text-matcha/70">
                    Phone or email <span className="text-terracotta">*</span>
                    <input
                        required
                        value={finderContact}
                        onChange={(e) => setFinderContact(e.target.value)}
                        onBlur={() => setContactTouched(true)}
                        placeholder="+91 98765 43210"
                        maxLength={120}
                        autoComplete="tel"
                        className={inputClass + " mt-1" + (contactInvalid ? " border-terracotta" : "")}
                    />
                </label>
            </div>
            {contactInvalid && (
                <p className="text-xs text-terracotta -mt-1">Enter a phone number with country code, or an email address.</p>
            )}
            <label className="block text-xs text-matcha/70">
                Message <span className="text-terracotta">*</span>
                <textarea
                    required
                    rows={3}
                    maxLength={1000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Where did you find ${pet.name}? Are they with you now?`}
                    className={inputClass + " mt-1"}
                />
            </label>

            {pet.isLost &&
                (coords ? (
                    <p className="text-xs text-sage">📍 Your current location will be included.</p>
                ) : locationStatus === "unavailable" ? (
                    <p className="text-xs text-matcha/50">Location sharing isn&apos;t available on this connection — please describe where you are.</p>
                ) : (
                    <button
                        type="button"
                        onClick={retryLocation}
                        disabled={locationStatus === "asking"}
                        className="text-xs text-sage font-medium hover:underline disabled:opacity-50"
                    >
                        {locationStatus === "asking"
                            ? "Getting location…"
                            : locationStatus === "denied"
                              ? "Location blocked — tap to try again"
                              : "📍 Include my current location"}
                    </button>
                ))}

            <p className="text-[11px] text-matcha/50">
                Your name and contact are shared only with {pet.name}&apos;s owner so they can reach you.
            </p>

            {formError && (
                <p className="text-sm text-terracotta bg-terracotta/10 rounded-lg px-3 py-2">{formError}</p>
            )}

            <button
                type="submit"
                disabled={sending}
                className="w-full bg-sage hover:bg-sage/90 text-white font-medium rounded-xl py-2.5 transition disabled:opacity-50"
            >
                {sending ? "Sending..." : "Send to owner"}
            </button>
        </form>
    );

    // ----- Pet is NOT reported lost: no owner details, just a way to alert the owner -----
    if (!pet.isLost) {
        return (
            <div className="min-h-screen bg-cream px-4 py-8">
                <div className="max-w-sm mx-auto">
                    <p className="text-center text-lg font-semibold text-matcha/70 mb-5" style={{ fontFamily: "var(--font-heading)" }}>
                        🐾 PawTrace
                    </p>

                    <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                        <PetAvatar name={pet.name} species={pet.species} photoUrl={pet.photoUrl} size={112} className="rounded-3xl mx-auto" />
                        <h1 className="text-3xl font-semibold text-matcha mt-4">{pet.name}</h1>
                        <p className="text-sm text-matcha/60 mt-1 capitalize">
                            {pet.breed} · {pet.species}
                        </p>
                        <div className="mt-4 bg-sage/10 rounded-xl px-4 py-3 text-sm text-matcha">
                            🏡 {pet.name} isn&apos;t reported lost. To protect the owner&apos;s privacy, their contact details are only
                            shown when a pet is reported lost.
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
                        {showForm || sent ? (
                            messageForm
                        ) : (
                            <>
                                <p className="text-sm text-matcha">
                                    Found {pet.name} wandering on their own? Let the owner know — they&apos;ll get your message straight away.
                                </p>
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="mt-3 w-full bg-sage hover:bg-sage/90 text-white font-medium rounded-xl py-2.5 transition"
                                >
                                    Alert the owner
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ----- Pet IS reported lost: full details, location first -----
    const phoneDigits = pet.ownerPhone?.replace(/[^\d]/g, "");

    return (
        <div className="min-h-screen bg-cream px-4 py-8">
            <div className="max-w-sm mx-auto">
                <p className="text-center text-lg font-semibold text-matcha/70 mb-5" style={{ fontFamily: "var(--font-heading)" }}>
                    🐾 PawTrace
                </p>

                <div className="bg-terracotta text-white rounded-2xl p-4 mb-4 text-center shadow-sm">
                    <p className="font-semibold text-lg">{pet.name} is lost!</p>
                    <p className="text-sm text-white/90 mt-1">
                        Thank you for scanning. Please contact the owner below to help bring {pet.name} home.
                    </p>
                </div>

                {/* Location status — asked for first, right after the scan */}
                <div
                    className={
                        "rounded-2xl px-4 py-3 mb-4 text-sm " +
                        (locationStatus === "sent" ? "bg-sage/15 text-matcha" : "bg-white shadow-sm text-matcha")
                    }
                >
                    {locationStatus === "sent" ? (
                        <p>📍 <strong>Location shared.</strong> {ownerLabel} can now see where {pet.name} was found. Thank you!</p>
                    ) : locationStatus === "asking" || locationStatus === "idle" ? (
                        <p>📍 Please tap <strong>Allow</strong> to share your location so {ownerLabel} can see where {pet.name} is.</p>
                    ) : locationStatus === "denied" ? (
                        <>
                            <p>📍 Location wasn&apos;t shared. It helps {ownerLabel} find {pet.name} quickly.</p>
                            <button
                                onClick={retryLocation}
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
                            Please message or call {ownerLabel} and say where you found {pet.name}.
                        </p>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <div className="flex flex-col items-center text-center">
                        <PetAvatar name={pet.name} species={pet.species} photoUrl={pet.photoUrl} size={128} className="rounded-3xl" />
                        <h1 className="text-3xl font-semibold text-matcha mt-4">{pet.name}</h1>
                        <p className="text-sm text-matcha/60 mt-1 capitalize">
                            {pet.breed} · {pet.species}
                            {pet.age != null && <> · {pet.age} {pet.age === 1 ? "yr" : "yrs"}</>}
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
                            {pet.ownerEmail && (
                                <a
                                    href={"mailto:" + pet.ownerEmail + "?subject=" + encodeURIComponent("I found " + pet.name)}
                                    className="col-span-2 text-center bg-sage-light/40 hover:bg-sage-light/60 text-matcha font-medium rounded-xl py-2.5 text-sm transition"
                                >
                                    ✉️ Email {pet.ownerEmail}
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">{messageForm}</div>

                <p className="text-center text-xs text-matcha/40 mt-6">
                    Only contact details are shared here — {pet.name}&apos;s medical records stay private.
                </p>
            </div>
        </div>
    );
}
