"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleLogin() {
        setLoading(true);
        setError("");
        const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });
        setLoading(false);

        if (res?.error) {
            setError("Incorrect email or password.");
        } else {
            router.push("/dashboard");
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-cream px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="text-4xl mb-2">🐾</div>
                    <h1 className="text-2xl font-semibold text-matcha">Welcome back</h1>
                    <p className="text-sm text-matcha/60 mt-1">Log in to PawTrace</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                    <div>
                        <label className="text-sm text-matcha/80 mb-1 block">Email</label>
                        <input
                            type="email"
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
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-sage-light/40 px-4 py-2.5 outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-terracotta bg-terracotta/10 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}

                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full bg-sage hover:bg-sage/90 text-white font-medium rounded-xl py-2.5 transition disabled:opacity-60"
                    >
                        {loading ? "Logging in..." : "Log in"}
                    </button>
                </div>

                <p className="text-center text-sm text-matcha/60 mt-6">
                    Don&apos;t have an account?{" "}
                    <a href="/signup" className="text-sage font-medium hover:underline">
                        Sign up
                    </a>
                </p>
            </div>
        </div>
    );
}