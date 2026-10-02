// Shared input validation for pet create/update

export const SPECIES = ["dog", "cat", "rabbit", "bird", "other"] as const;

// Photos are resized in the browser to a small JPEG before upload; this caps the stored size.
const MAX_PHOTO_CHARS = 400_000;

export type PetInput = {
    name: string;
    breed: string;
    species: string;
    age: number;
    height: number;
    weight: number;
    photoUrl: string | null;
    publicNotes: string | null;
};

function text(value: unknown, max: number) {
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function parsePetInput(body: unknown): { data?: PetInput; error?: string } {
    const b = (body ?? {}) as Record<string, unknown>;
    const name = text(b.name, 60);
    const breed = text(b.breed, 60);
    const species = text(b.species, 20).toLowerCase();
    const age = Number(b.age);
    const height = Number(b.height);
    const weight = Number(b.weight);
    const publicNotes = text(b.publicNotes, 300) || null;
    const photoUrl = typeof b.photoUrl === "string" && b.photoUrl ? b.photoUrl : null;

    if (!name || !breed || !species) return { error: "Name, breed and species are required" };
    if (!(SPECIES as readonly string[]).includes(species)) return { error: "Unknown species" };
    if (!Number.isInteger(age) || age < 0 || age > 50) return { error: "Age must be a whole number of years" };
    if (!(height > 0 && height < 500) || !(weight > 0 && weight < 500)) {
        return { error: "Height and weight must be greater than 0" };
    }
    if (photoUrl && (!/^data:image\/(jpeg|png|webp);base64,/.test(photoUrl) || photoUrl.length > MAX_PHOTO_CHARS)) {
        return { error: "Photo must be a JPEG, PNG or WebP image under 300 KB" };
    }

    return { data: { name, breed, species, age, height, weight, photoUrl, publicNotes } };
}
