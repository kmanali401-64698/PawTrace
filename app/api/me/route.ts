import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, phone: true, role: true },
    });

    return user
        ? NextResponse.json(user)
        : NextResponse.json({ error: "User not found" }, { status: 404 });
}

// Update the contact details finders see on the public scan page
export async function PATCH(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
    const rawPhone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const phone = rawPhone.replace(/[^\d+]/g, "");

    if (!name) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (phone && !/^\+?\d{7,15}$/.test(phone)) {
        return NextResponse.json(
            { error: "Enter a phone number with country code, e.g. +91 98765 43210" },
            { status: 400 }
        );
    }

    const user = await prisma.user.update({
        where: { id: session.user.id },
        data: { name, phone: phone || null },
        select: { name: true, email: true, phone: true, role: true },
    });

    return NextResponse.json(user);
}
