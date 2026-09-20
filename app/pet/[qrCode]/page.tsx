"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type PublicPet = {
    name: string;
    breed: string;
    species: string;
    age: number;
    isLost: boolean;
    ownerName: string;
    ownerEmail: string;
    error?: string;
};

export default function PetPublicPage() {
    const params = useParams();
    const qrCode = params.qrCode as string;

    const [pet, setPet] = useState<PublicPet | null>(null);
    const [locationStatus, setLocationStatus] = useState<"idle" | "sent" | "denied">("idle");

    useEffect(() => {
        fetch("/api/pet/" + qrCode)
            .then(function (res) { return res.json(); })
            .then(function (data) { setPet(data); });
    }, [qrCode]);

    useEffect(() => {
        if (pet && pet.isLost && locationStatus === "idle") {
            navigator.geolocation.getCurrentPosition(
                function (position) {
                    fetch("/api/pet/" + qrCode + "/scan-location", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        }),
                    }).then(function () {
                        setLocationStatus("sent");
                    });
                },
                function () {
                    setLocationStatus("denied");
                }
            );
        }
    }, [pet, locationStatus, qrCode]);

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
                    <p className="text-matcha/70">This tag isn't linked to a pet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream px-4 py-10">
            <div className="max-w-sm mx-auto">
                <div className="text-center mb-6">
                    <div className="text-3xl mb-1">PawTrace</div>
                </div>

                {pet.isLost && (
                    <div className="bg-terracotta/10 border border-terracotta/30 rounded-2xl p-4 mb-4 text-center">
                        <p className="font-semibold text-terracotta">This pet is lost</p>
                        <p className="text-sm text-terracotta/80 mt-1">
                            Please contact the owner below to help bring {pet.name} home.
                        </p>
                        {locationStatus === "sent" && (
                            <p className="text-xs text-terracotta/70 mt-2">
                                Your location has been shared with the owner.
                            </p>
                        )}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm p-6">
                    <h1 className="text-2xl font-semibold text-matcha">{pet.name}</h1>
                    <p className="text-sm text-matcha/60 mt-1">
                        {pet.breed} - {pet.species} - {pet.age} yrs
                    </p>

                    <div className="mt-5 pt-5 border-t border-sage-light/30">
                        <p className="text-xs uppercase tracking-wide text-matcha/40 mb-1">
                            Owner
                        </p>
                        <p className="text-matcha font-medium">{pet.ownerName}</p>
                        <a
                            href={"mailto:" + pet.ownerEmail}
                            className="text-sage text-sm hover:underline"
                        >
                            {pet.ownerEmail}
                        </a>
                    </div>
                </div>

                <p className="text-center text-xs text-matcha/40 mt-6">
                    This pet's identity is verified through PawTrace.
                </p>
            </div>
        </div>
    );
}