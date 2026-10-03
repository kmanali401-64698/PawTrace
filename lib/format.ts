/** "Test" -> "Dr. Test"; leaves names that already start with "Dr" / "Dr." alone. */
export function vetName(name: string | null | undefined) {
    const trimmed = (name ?? "").trim();
    if (!trimmed) return "your vet";
    return /^dr\.?\s/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`;
}
