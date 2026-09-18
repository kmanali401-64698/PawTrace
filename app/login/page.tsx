"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [result, setResult] = useState("");

    async function handleLogin() {
        const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });
        setResult(JSON.stringify(res, null, 2));
    }

    return (
        <div style={{ padding: "2rem" }}>
            <h1>Test Login</h1>
            <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <br />
            <input
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <br />
            <button onClick={handleLogin}>Login</button>
            <pre>{result}</pre>
        </div>
    );
}