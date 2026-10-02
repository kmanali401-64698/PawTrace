"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.replace("/login");
      return;
    }

    const role = session.user?.role;
    if (role === "vet") {
      router.replace("/vet");
    } else {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <p className="text-matcha/60">Loading PawTrace...</p>
    </div>
  );
}