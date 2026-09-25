import { NextResponse } from 'next/server';

export async function GET() {
    // Yeh real data format hai jo dashboard ko chahiye
    return NextResponse.json({
        totalPatients: 200,
        todayAppointments: 8,
        pendingReports: 3
    });
}