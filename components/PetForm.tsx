"use client";

import { useState } from "react";
import PetAvatar from "./PetAvatar";

export type PetFormValues = {
    name: string;
    breed: string;
    species: string;
    age: number | string;
    height: number | string;
    weight: number | string;
    photoUrl: string | null;
    publicNotes: string | null;
};

const inputClass =
    "w-full rounded-xl border border-sage-light/40 px-3 py-2 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition bg-white";

// Shrink the photo in the browser so we store a ~30-80 KB JPEG instead of a multi-MB original
function resizeImage(file: File, maxSize = 480): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error("That file isn't an image we can read"));
            img.onload = () => {
                const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", 0.82));
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    });
}

export default function PetForm({
    initial,
    submitLabel,
    onSubmit,
    onCancel,
}: {
    initial?: Partial<PetFormValues>;
    submitLabel: string;
    onSubmit: (values: PetFormValues) => Promise<string | null>; // returns an error message, or null on success
    onCancel?: () => void;
}) {
    const [name, setName] = useState(initial?.name ?? "");
    const [breed, setBreed] = useState(initial?.breed ?? "");
    const [species, setSpecies] = useState(initial?.species ?? "dog");
    const [age, setAge] = useState(String(initial?.age ?? ""));
    const [height, setHeight] = useState(String(initial?.height ?? ""));
    const [weight, setWeight] = useState(String(initial?.weight ?? ""));
    const [photoUrl, setPhotoUrl] = useState<string | null>(initial?.photoUrl ?? null);
    const [publicNotes, setPublicNotes] = useState(initial?.publicNotes ?? "");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setError("");
        try {
            setPhotoUrl(await resizeImage(file));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not use that photo");
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        const message = await onSubmit({
            name,
            breed,
            species,
            age: Number(age),
            height: Number(height),
            weight: Number(weight),
            photoUrl,
            publicNotes: publicNotes.trim() || null,
        });
        setSubmitting(false);
        if (message) setError(message);
    }

    const canSubmit = name.trim() && breed.trim() && age !== "" && height !== "" && weight !== "";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
                <PetAvatar name={name || "Pet"} species={species} photoUrl={photoUrl} size={72} />
                <div className="flex flex-wrap gap-2">
                    <label className="cursor-pointer bg-sage-light/40 hover:bg-sage-light/60 text-matcha font-medium rounded-xl px-3 py-2 text-sm transition">
                        {photoUrl ? "Change photo" : "Add photo"}
                        <input type="file" accept="image/*" onChange={handlePhoto} className="sr-only" />
                    </label>
                    {photoUrl && (
                        <button
                            type="button"
                            onClick={() => setPhotoUrl(null)}
                            className="text-sm text-matcha/60 hover:text-terracotta px-2"
                        >
                            Remove
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-sm text-matcha/70">
                    Name
                    <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass + " mt-1"} />
                </label>
                <label className="text-sm text-matcha/70">
                    Breed
                    <input required value={breed} onChange={(e) => setBreed(e.target.value)} className={inputClass + " mt-1"} />
                </label>
                <label className="text-sm text-matcha/70">
                    Species
                    <select value={species} onChange={(e) => setSpecies(e.target.value)} className={inputClass + " mt-1"}>
                        <option value="dog">Dog</option>
                        <option value="cat">Cat</option>
                        <option value="rabbit">Rabbit</option>
                        <option value="bird">Bird</option>
                        <option value="other">Other</option>
                    </select>
                </label>
                <label className="text-sm text-matcha/70">
                    Age (years)
                    <input
                        type="number" min={0} max={50} step={1} required
                        value={age} onChange={(e) => setAge(e.target.value)}
                        className={inputClass + " mt-1"}
                    />
                </label>
                <label className="text-sm text-matcha/70">
                    Height (cm)
                    <input
                        type="number" min={0.1} step="any" required
                        value={height} onChange={(e) => setHeight(e.target.value)}
                        className={inputClass + " mt-1"}
                    />
                </label>
                <label className="text-sm text-matcha/70">
                    Weight (kg)
                    <input
                        type="number" min={0.1} step="any" required
                        value={weight} onChange={(e) => setWeight(e.target.value)}
                        className={inputClass + " mt-1"}
                    />
                </label>
            </div>

            <label className="block text-sm text-matcha/70">
                Note for finders <span className="text-matcha/40">(optional, shown when the tag is scanned)</span>
                <textarea
                    rows={2}
                    maxLength={300}
                    value={publicNotes}
                    onChange={(e) => setPublicNotes(e.target.value)}
                    placeholder="e.g. Friendly but shy. Needs daily heart medication. Allergic to chicken."
                    className={inputClass + " mt-1"}
                />
            </label>

            {error && (
                <p className="text-sm text-terracotta bg-terracotta/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={submitting || !canSubmit}
                    className="flex-1 bg-sage hover:bg-sage/90 text-white font-medium rounded-xl py-2.5 transition disabled:opacity-50"
                >
                    {submitting ? "Saving..." : submitLabel}
                </button>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 rounded-xl text-matcha/70 hover:bg-cream transition"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </form>
    );
}
