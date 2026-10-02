import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const role = body?.role;

    if (!email || !password || !name || !role) {
        return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
        );
    }

    if (role !== "owner" && role !== "vet") {
        return NextResponse.json(
            { error: "Role must be 'owner' or 'vet'" },
            { status: 400 }
        );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Please enter a valid email" }, { status: 400 });
    }

    if (password.length < 8) {
        return NextResponse.json(
            { error: "Password must be at least 8 characters" },
            { status: 400 }
        );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return NextResponse.json(
            { error: "User with this email already exists" },
            { status: 400 }
        );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: { email, password: hashedPassword, name, role },
    });

    return NextResponse.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
    });
}
