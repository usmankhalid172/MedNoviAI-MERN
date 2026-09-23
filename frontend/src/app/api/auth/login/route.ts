import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (email && password) {
            return NextResponse.json({
                success: true,
                token: "jwt_mock_secure_token_987654321",
                message: "Login successful"
            }, { status: 200 });
        }

        return NextResponse.json(
            { success: false, message: "Invalid credentials" },
            { status: 400 }
        );
    } catch (error) {
        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}   