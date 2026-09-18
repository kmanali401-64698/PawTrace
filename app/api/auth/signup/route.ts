import { NextResponse } from "next/server";
import { PrismaClient } from "@/app/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    const { email, password, name, role } = await req.json();

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