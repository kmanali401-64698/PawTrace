"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"owner" | "vet">("owner");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError("");

        const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, role }),
        });

        const data = await res.json().catch(() => ({}));
        setLoading(false);

        if (!res.ok) {
            setError(data.error || "Something went wrong.");
        } else {
            router.push("/login");
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-cream px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="text-4xl mb-2">🐾</div>
                    <h1 className="text-2xl font-semibold text-matcha">Join PawTrace</h1>
                    <p className="text-sm text-matcha/60 mt-1">Create your account</p>
                </div>

                <form onSubmit={handleSignup} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    <div>
                        <label className="text-sm text-matcha/80 mb-1 block">Name</label>
                        <input
                            type="text"
                            required
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border border-sage-light/40 px-4 py-2.5 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-matcha/80 mb-1 block">Email</label>
                        <input
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border border-sage-light/40 px-4 py-2.5 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-matcha/80 mb-1 block">Password</label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-sage-light/40 px-4 py-2.5 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                            placeholder="At least 8 characters"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-matcha/80 mb-1 block">I am a...</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setRole("owner")}
                                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${role === "owner"
                                    ? "bg-sage text-white"
                                    : "bg-pink/30 text-matcha/70"
                                    }`}
                            >
                                Pet Owner
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole("vet")}
                                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${role === "vet"
                                    ? "bg-sage text-white"
                                    : "bg-pink/30 text-matcha/70"
                                    }`}
                            >
                                Veterinarian
                            </button>
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-terracotta bg-terracotta/10 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-sage hover:bg-sage/90 text-white font-medium rounded-xl py-2.5 transition disabled:opacity-60"
                    >
                        {loading ? "Creating account..." : "Sign up"}
                    </button>
                </form>

                <p className="text-center text-sm text-matcha/60 mt-6">
                    Already have an account?{" "}
                    <Link href="/login" className="text-sage font-medium hover:underline">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    );
}
