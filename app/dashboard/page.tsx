"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";


type Pet = {
    id: string;
    name: string;
    breed: string;
    species: string;
    age: number;
    isLost: boolean;
};

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [pets, setPets] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const [name, setName] = useState("");
    const [breed, setBreed] = useState("");
    const [species, setSpecies] = useState("dog");
    const [age, setAge] = useState("");
    const [height, setHeight] = useState("");
    const [weight, setWeight] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    useEffect(() => {
        if (status === "authenticated") {
            fetchPets();
        }
    }, [status]);

    async function fetchPets() {
        setLoading(true);
        const res = await fetch("/api/pets");
        const data = await res.json();
        setPets(Array.isArray(data) ? data : []);
        setLoading(false);
    }

    async function handleAddPet() {
        setSubmitting(true);
        await fetch("/api/pets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                breed,
                species,
                age: Number(age),
                height: Number(height),
                weight: Number(weight),
            }),
        });
        setSubmitting(false);
        setShowForm(false);
        setName("");
        setBreed("");
        setSpecies("dog");
        setAge("");
        setHeight("");
        setWeight("");
        fetchPets();
    }

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-cream">
                <p className="text-matcha/60">Loading your pets...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream px-4 py-10">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-semibold text-matcha">🐾 My Pets</h1>
                        <p className="text-sm text-matcha/60">
                            Welcome back, {session?.user?.name}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-sage hover:bg-sage/90 text-white font-medium rounded-xl px-4 py-2.5 text-sm transition"
                    >
                        {showForm ? "Cancel" : "+ Add Pet"}
                    </button>
                </div>

                {showForm && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 space-y-4">
                        <h2 className="font-medium text-matcha">New pet</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                placeholder="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="rounded-xl border border-sage-light/40 px-3 py-2 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                            />
                            <input
                                placeholder="Breed"
                                value={breed}
                                onChange={(e) => setBreed(e.target.value)}
                                className="rounded-xl border border-sage-light/40 px-3 py-2 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                            />
                            <select
                                value={species}
                                onChange={(e) => setSpecies(e.target.value)}
                                className="rounded-xl border border-sage-light/40 px-3 py-2 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                            >
                                <option value="dog">Dog</option>
                                <option value="cat">Cat</option>
                            </select>
                            <input
                                placeholder="Age (years)"
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                className="rounded-xl border border-sage-light/40 px-3 py-2 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                            />
                            <input
                                placeholder="Height (cm)"
                                type="number"
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                className="rounded-xl border border-sage-light/40 px-3 py-2 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                            />
                            <input
                                placeholder="Weight (kg)"
                                type="number"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                className="rounded-xl border border-sage-light/40 px-3 py-2 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                            />
                        </div>
                        <button
                            onClick={handleAddPet}
                            disabled={submitting || !name || !breed}
                            className="w-full bg-sage hover:bg-sage/90 text-white font-medium rounded-xl py-2.5 transition disabled:opacity-50"
                        >
                            {submitting ? "Adding..." : "Add pet"}
                        </button>
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
                                className="block bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-matcha">{pet.name}</h3>
                                        <p className="text-sm text-matcha/60">
                                            {pet.breed} · {pet.species} · {pet.age} yrs
                                        </p>
                                    </div>
                                    {pet.isLost && (
                                        <span className="text-xs font-medium text-terracotta bg-terracotta/10 rounded-full px-3 py-1">
                                            Lost
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