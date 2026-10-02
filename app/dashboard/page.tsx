"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PetAvatar from "@/components/PetAvatar";
import PetForm, { PetFormValues } from "@/components/PetForm";

type Pet = {
    id: string;
    name: string;
    breed: string;
    species: string;
    age: number;
    photoUrl: string | null;
    isLost: boolean;
    unreadMessages: number;
    upcomingVisit: { nextVisit: string; diagnosis: string | null } | null;
};

type Profile = { name: string; email: string; phone: string | null };

function formatVisit(iso: string) {
    const date = new Date(iso);
    const days = Math.round((date.getTime() - new Date().setUTCHours(0, 0, 0, 0)) / 86_400_000);
    const label = date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    if (days <= 0) return `Today · ${label}`;
    if (days === 1) return `Tomorrow · ${label}`;
    return `In ${days} days · ${label}`;
}

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [pets, setPets] = useState<Pet[]>([]);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingContact, setEditingContact] = useState(false);
    const [phoneInput, setPhoneInput] = useState("");
    const [contactError, setContactError] = useState("");
    const [savingContact, setSavingContact] = useState(false);

    const role = session?.user?.role;

    const fetchData = useCallback(() => {
        return Promise.all([
            fetch("/api/pets").then((res) => res.json()),
            fetch("/api/me").then((res) => res.json()),
        ]).then(([petData, me]) => {
            setPets(Array.isArray(petData) ? petData : []);
            setProfile(me?.email ? me : null);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/login");
        } else if (status === "authenticated" && role === "vet") {
            router.replace("/vet");
        }
    }, [status, role, router]);

    useEffect(() => {
        if (status === "authenticated" && role === "owner") {
            fetchData();
        }
    }, [status, role, fetchData]);

    async function handleAddPet(values: PetFormValues) {
        const res = await fetch("/api/pets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            return data.error || "Could not add pet. Please try again.";
        }

        const pet = await res.json();
        // Take the owner straight to the new pet so they can print its tag
        router.push(`/pets/${pet.id}`);
        return null;
    }

    async function saveContact(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!profile) return;
        setSavingContact(true);
        setContactError("");
        const res = await fetch("/api/me", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: profile.name, phone: phoneInput }),
        });
        const data = await res.json().catch(() => ({}));
        setSavingContact(false);
        if (!res.ok) {
            setContactError(data.error || "Could not save");
            return;
        }
        setProfile(data);
        setEditingContact(false);
    }

    if (status !== "authenticated" || role !== "owner" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-cream">
                <p className="text-matcha/60">Loading your pets...</p>
            </div>
        );
    }

    const upcoming = pets
        .filter((p) => p.upcomingVisit)
        .sort((a, b) => a.upcomingVisit!.nextVisit.localeCompare(b.upcomingVisit!.nextVisit));
    const lostPets = pets.filter((p) => p.isLost);

    return (
        <div className="min-h-screen bg-cream px-4 py-10">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between gap-3 mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-matcha">🐾 My Pets</h1>
                        <p className="text-sm text-matcha/60">
                            Welcome back, {session.user.name}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="bg-sage hover:bg-sage/90 text-white font-medium rounded-xl px-4 py-2.5 text-sm transition"
                        >
                            {showForm ? "Cancel" : "Add Pet"}
                        </button>
                        <button
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="bg-pink/40 hover:bg-pink/60 text-matcha font-medium rounded-xl px-4 py-2.5 text-sm transition"
                        >
                            Log out
                        </button>
                    </div>
                </div>

                {lostPets.length > 0 && (
                    <div className="bg-terracotta/10 border border-terracotta/30 rounded-2xl p-4 mb-4">
                        <p className="font-semibold text-terracotta">
                            {lostPets.map((p) => p.name).join(", ")} {lostPets.length === 1 ? "is" : "are"} marked as lost
                        </p>
                        <p className="text-sm text-terracotta/80 mt-1">
                            Anyone who scans the tag can message you and share their location. Print a lost-pet poster from the pet&apos;s page.
                        </p>
                    </div>
                )}

                {profile && (!profile.phone || editingContact) ? (
                    <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
                        <h2 className="font-medium text-matcha">📞 Your contact number</h2>
                        <p className="text-sm text-matcha/60 mt-1">
                            Add a phone number so whoever finds your pet can call or WhatsApp you straight from the tag.
                        </p>
                        <form onSubmit={saveContact} className="flex flex-col sm:flex-row gap-2 mt-3">
                            <input
                                type="tel"
                                value={phoneInput}
                                onChange={(e) => setPhoneInput(e.target.value)}
                                placeholder="+91 98765 43210"
                                className="flex-1 min-w-0 rounded-xl border border-sage-light/40 px-3 py-2 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={savingContact}
                                    className="bg-sage hover:bg-sage/90 text-white font-medium rounded-xl px-4 py-2 text-sm transition disabled:opacity-50"
                                >
                                    {savingContact ? "Saving..." : "Save"}
                                </button>
                                {editingContact && (
                                    <button
                                        type="button"
                                        onClick={() => { setEditingContact(false); setContactError(""); }}
                                        className="px-3 rounded-xl text-sm text-matcha/70 hover:bg-cream"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                        {contactError && <p className="text-sm text-terracotta mt-2">{contactError}</p>}
                    </div>
                ) : profile?.phone ? (
                    <p className="text-xs text-matcha/50 mb-4">
                        Finders will see: {profile.email} · {profile.phone}{" "}
                        <button
                            onClick={() => { setPhoneInput(profile.phone ?? ""); setEditingContact(true); }}
                            className="text-sage font-medium hover:underline"
                        >
                            Edit
                        </button>
                    </p>
                ) : null}

                {showForm && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                        <h2 className="font-medium text-matcha mb-4">New pet</h2>
                        <PetForm submitLabel="Add pet" onSubmit={handleAddPet} onCancel={() => setShowForm(false)} />
                    </div>
                )}

                {upcoming.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
                        <h2 className="font-medium text-matcha mb-3">📅 Upcoming vet visits</h2>
                        <div className="space-y-2">
                            {upcoming.map((pet) => (
                                <Link
                                    key={pet.id}
                                    href={`/pets/${pet.id}`}
                                    className="flex items-center justify-between gap-3 bg-cream rounded-xl px-4 py-2.5 hover:bg-pink/20 transition"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-matcha">{pet.name}</p>
                                        {pet.upcomingVisit!.diagnosis && (
                                            <p className="text-xs text-matcha/50 truncate">
                                                Follow-up: {pet.upcomingVisit!.diagnosis}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-xs font-medium text-matcha/70 shrink-0">
                                        {formatVisit(pet.upcomingVisit!.nextVisit)}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {pets.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                        <div className="text-4xl mb-3">🐾</div>
                        <p className="text-matcha/70">
                            No pets yet. Add your first pet to generate their PawTrace tag.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pets.map((pet) => (
                            <Link
                                key={pet.id}
                                href={`/pets/${pet.id}`}
                                className="flex items-center gap-4 bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition"
                            >
                                <PetAvatar name={pet.name} species={pet.species} photoUrl={pet.photoUrl} size={56} />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-matcha">{pet.name}</h3>
                                    <p className="text-sm text-matcha/60 truncate">
                                        {pet.breed} · {pet.species} · {pet.age} yrs
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    {pet.isLost && (
                                        <span className="text-xs font-medium text-terracotta bg-terracotta/10 rounded-full px-3 py-1">
                                            Lost
                                        </span>
                                    )}
                                    {pet.unreadMessages > 0 && (
                                        <span className="text-xs font-medium text-white bg-terracotta rounded-full px-3 py-1">
                                            {pet.unreadMessages} new message{pet.unreadMessages > 1 ? "s" : ""}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
