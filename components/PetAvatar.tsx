/* eslint-disable @next/next/no-img-element -- photos are small data URLs, nothing for next/image to optimize */

const SPECIES_EMOJI: Record<string, string> = {
    dog: "🐶",
    cat: "🐱",
    rabbit: "🐰",
    bird: "🐦",
};

export default function PetAvatar({
    name,
    species,
    photoUrl,
    size = 56,
    className = "",
}: {
    name: string;
    species: string;
    photoUrl?: string | null;
    size?: number;
    className?: string;
}) {
    const style = { width: size, height: size };

    if (photoUrl) {
        return (
            <img
                src={photoUrl}
                alt={name}
                style={style}
                className={"rounded-2xl object-cover shrink-0 bg-cream " + className}
            />
        );
    }

    return (
        <div
            style={{ ...style, fontSize: size * 0.5 }}
            className={"rounded-2xl bg-sage-light/30 flex items-center justify-center shrink-0 " + className}
            aria-hidden="true"
        >
            {SPECIES_EMOJI[species] ?? "🐾"}
        </div>
    );
}
