"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PetPublicPage() {
    const params = useParams();
    const qrCode = params.qrCode as string;

    const [pet, setPet] = useState<any>(null);
    const [locationStatus, setLocationStatus] = useState<"idle" | "sent" | "denied">("idle");

    useEffect(() => {
        fetch(`/api/pet/${qrCode}`)
            .then((res) => res.json())
            .then((data) => setPet(data));
    }, [qrCode]);

    useEffect(() => {
        if (pet?.isLost && locationStatus === "idle") {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    await fetch(`/api/pet/${qrCode}/scan-location`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        }),
                    });
                    setLocationStatus("sent");
                },
                () => setLocationStatus("denied")
            );
        }
    }, [pet, locationStatus, qrCode]);

    if (!pet) return <div style={{ padding: "2rem" }}>Loading...</div>;

    if (pet.error) {
        return <div style={{ padding: "2rem" }}>Pet not found.</div>;
    }

    return (
        <div style={{ padding: "2rem", maxWidth: "400px", margin: "0 auto" }}>
            {pet.isLost && (
                <div
                    style={{
                        background: "#fee2e2",
                        border: "1px solid #ef4444",
                        padding: "1rem",
                        borderRadius: "8px",
                        marginBottom: "1rem",
                    }}
                >
                    <strong style={{ color: "#b91c1c" }}>This pet is reported LOST</strong>
                    <p style={{ fontSize: "0.9rem", color: "#7f1d1d" }}>
                        Please contact the owner below. Your location is being shared to
                        help find this pet.
                    </p>
                </div>
            )}
            <h1>{pet.name}</h1>
            <p>
                {pet.breed} • {pet.species} • {pet.age} yrs
            </p>
            <p style={{ marginTop: "1rem" }}>
                <strong>Owner:</strong> {pet.ownerName}
                <br />
                <strong>Contact:</strong> {pet.ownerEmail}
            </p>
        </div>
    );
}