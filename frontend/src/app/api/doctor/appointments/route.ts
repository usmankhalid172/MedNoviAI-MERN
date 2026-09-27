import { NextResponse } from 'next/server';

export async function GET() {
    // Yeh patients ki list hai
    return NextResponse.json([
        { _id: '1', patientName: 'Ali Khan', time: '10:00 AM', status: 'Completed' },
        { _id: '2', patientName: 'Sara Ahmed', time: '11:30 AM', status: 'In Progress' },
        { _id: '3', patientName: 'Usman Khalid', time: '02:00 PM', status: 'Scheduled' },
        { _id: '4', patientName: 'Fatima Noor', time: '04:15 PM', status: 'Scheduled' }
    ]);
}