"use client";

/* eslint-disable @next/next/no-img-element -- pet photos are small data URLs */

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

type Pet = {
    id: string;
    name: string;
    breed: string;
    species: string;
    age: number;
    photoUrl: string | null;
    publicNotes: string | null;
};

type Qr = { qrSvg: string; scanUrl: string };
type Me = { name: string; phone: string | null; email: string };

function QrSvg({ svg, className }: { svg: string; className?: string }) {
    // SVG markup generated server-side by the qrcode library from our own URL
    return <div className={"[&>svg]:w-full [&>svg]:h-auto " + (className ?? "")} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function TagSheet() {
    const params = useParams();
    const id = params.id as string;
    const searchParams = useSearchParams();
    const router = useRouter();
    const { status } = useSession();
    const layout = searchParams.get("layout") === "poster" ? "poster" : "tag";

    const [pet, setPet] = useState<Pet | null>(null);
    const [qr, setQr] = useState<Qr | null>(null);
    const [me, setMe] = useState<Me | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") router.replace("/login");
        if (status !== "authenticated") return;

        Promise.all([
            fetch("/api/pets/" + id).then((r) => (r.ok ? r.json() : null)),
            fetch("/api/pets/" + id + "/qr").then((r) => (r.ok ? r.json() : null)),
            fetch("/api/me").then((r) => (r.ok ? r.json() : null)),
        ]).then(([petData, qrData, meData]) => {
            if (!petData || !qrData) setFailed(true);
            setPet(petData);
            setQr(qrData);
            setMe(meData);
        });
    }, [id, status, router]);

    if (failed) {
        return <p className="p-10 text-center text-matcha/60">Could not load this pet&apos;s tag.</p>;
    }

    if (!pet || !qr) {
        return <p className="p-10 text-center text-matcha/60">Preparing tag…</p>;
    }

    return (
        <div className="min-h-screen bg-cream print:bg-white px-4 py-8 print:p-0">
            {/* Toolbar — hidden when printing */}
            <div className="max-w-3xl mx-auto mb-6 flex flex-wrap items-center gap-2 print:hidden">
                <Link href={`/pets/${pet.id}`} className="text-sm text-sage font-medium hover:underline mr-auto">
                    ← Back to {pet.name}
                </Link>
                <Link
                    href={`/pets/${pet.id}/tag`}
                    className={"rounded-xl px-4 py-2 text-sm font-medium transition " + (layout === "tag" ? "bg-sage text-white" : "bg-white text-matcha hover:bg-sage-light/30")}
                >
                    Collar tags
                </Link>
                <Link
                    href={`/pets/${pet.id}/tag?layout=poster`}
                    className={"rounded-xl px-4 py-2 text-sm font-medium transition " + (layout === "poster" ? "bg-terracotta text-white" : "bg-white text-matcha hover:bg-terracotta/10")}
                >
                    Lost poster
                </Link>
                <button
                    onClick={() => window.print()}
                    className="rounded-xl px-4 py-2 text-sm font-medium bg-matcha text-white hover:bg-matcha/90 transition"
                >
                    🖨 Print
                </button>
            </div>

            {layout === "tag" ? (
                <div className="max-w-3xl mx-auto bg-white rounded-2xl print:rounded-none p-6 print:p-[10mm]">
                    <p className="text-sm text-matcha/60 mb-4 print:hidden">
                        Six tags per page. Cut one out, laminate or cover it with clear tape, and attach it to the collar.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 print:grid-cols-3 gap-4 print:gap-[6mm]">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="border-2 border-dashed border-sage-light rounded-2xl p-3 flex flex-col items-center text-center break-inside-avoid"
                            >
                                <p className="font-semibold text-matcha leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
                                    🐾 {pet.name}
                                </p>
                                <QrSvg svg={qr.qrSvg} className="w-full max-w-[42mm] my-2" />
                                <p className="text-[11px] font-semibold text-terracotta uppercase tracking-wide">
                                    If I&apos;m lost, scan me
                                </p>
                                <p className="text-[9px] text-matcha/50 mt-0.5">PawTrace · camera app works</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="max-w-[210mm] mx-auto bg-white rounded-2xl print:rounded-none shadow-sm print:shadow-none p-8 print:p-[12mm] text-center">
                    <h1
                        className="text-6xl print:text-7xl font-bold text-terracotta tracking-wide"
                        style={{ fontFamily: "var(--font-heading)" }}
                    >
                        LOST {pet.species === "other" ? "PET" : pet.species.toUpperCase()}
                    </h1>
                    <p className="text-2xl font-semibold text-matcha mt-2" style={{ fontFamily: "var(--font-heading)" }}>
                        Have you seen {pet.name}?
                    </p>

                    {pet.photoUrl ? (
                        <img
                            src={pet.photoUrl}
                            alt={pet.name}
                            className="mx-auto mt-6 w-full max-w-[120mm] aspect-square object-cover rounded-2xl"
                        />
                    ) : (
                        <div className="mx-auto mt-6 w-full max-w-[90mm] aspect-square rounded-2xl bg-sage-light/30 flex items-center justify-center text-8xl">
                            🐾
                        </div>
                    )}

                    <p className="text-xl text-matcha mt-6">
                        <strong>{pet.name}</strong> · {pet.breed} · {pet.age} {pet.age === 1 ? "year" : "years"} old
                    </p>
                    {pet.publicNotes && <p className="text-lg text-matcha/80 mt-2">{pet.publicNotes}</p>}

                    <div className="mt-8 flex flex-col sm:flex-row print:flex-row items-center justify-center gap-6">
                        <QrSvg svg={qr.qrSvg} className="w-48 print:w-[55mm]" />
                        <div className="text-left">
                            <p className="text-lg font-semibold text-matcha">Scan to contact the owner</p>
                            <p className="text-sm text-matcha/70 mt-1">Point your phone camera at the code.</p>
                            {me?.phone && (
                                <p className="text-2xl font-bold text-matcha mt-3">📞 {me.phone}</p>
                            )}
                            <p className="text-sm text-matcha/70 mt-1">{me?.name}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function TagPage() {
    return (
        <Suspense fallback={<p className="p-10 text-center text-matcha/60">Preparing tag…</p>}>
            <TagSheet />
        </Suspense>
    );
}
