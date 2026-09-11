"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function DoctorDashboardPage() {
    // Dummy data for now (Figma ke hisab se update kar lijiye ga)
    const appointments = [
        { id: 1, name: "Ali Khan", time: "10:00 AM", status: "Checked-in", condition: "Viral Fever" },
        { id: 2, name: "Sara Ahmed", time: "11:30 AM", status: "In Progress", condition: "Migraine" },
        { id: 3, name: "Usman Raza", time: "01:00 PM", status: "Scheduled", condition: "Routine Checkup" },
    ];

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen">

            {/* 1. Doctor Profile Card */}
            <div className="flex items-center gap-6 p-6 bg-white rounded-xl border shadow-sm">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    DS
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dr. Smith</h1>
                    <p className="text-gray-500 font-medium">Senior Cardiologist</p>
                </div>
            </div>

            {/* Tabs for Appointments and Queue */}
            <Tabs defaultValue="appointments" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="appointments">Today's Appointments</TabsTrigger>
                    <TabsTrigger value="queue">Patient Queue</TabsTrigger>
                </TabsList>

                {/* 2. Today's Appointments List */}
                <TabsContent value="appointments" className="space-y-4">
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-gray-50">
                            <h2 className="font-semibold text-gray-700">Appointments List</h2>
                        </div>
                        <div className="divide-y">
                            {appointments.map((app) => (
                                <div key={app.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                                    <div>
                                        <p className="font-semibold text-gray-900">{app.name}</p>
                                        <p className="text-sm text-gray-500">{app.time}</p>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* Status Badges */}
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${app.status === 'Checked-in' ? 'bg-green-100 text-green-700' :
                                            app.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                            {app.status}
                                        </span>

                                        {/* 4. Appointment Detail (Sheet Component) */}
                                        <Sheet>
                                            <SheetTrigger asChild>
                                                <Button variant="outline" size="sm">View Details</Button>
                                            </SheetTrigger>
                                            <SheetContent>
                                                <SheetHeader>
                                                    <SheetTitle>Patient Details</SheetTitle>
                                                    <SheetDescription>
                                                        Review appointment details for {app.name}.
                                                    </SheetDescription>
                                                </SheetHeader>
                                                <div className="py-6 space-y-4">
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-500">Name</h4>
                                                        <p className="text-lg font-semibold text-gray-900">{app.name}</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-500">Time</h4>
                                                        <p className="text-gray-900">{app.time}</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-500">Condition</h4>
                                                        <p className="text-gray-900">{app.condition}</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-500">Status</h4>
                                                        <p className="text-gray-900">{app.status}</p>
                                                    </div>
                                                </div>
                                            </SheetContent>
                                        </Sheet>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                {/* 3. Patient Queue Table (UPDATED) */}
                <TabsContent value="queue">
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-gray-50">
                            <h2 className="font-semibold text-gray-700">Patient Queue</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-gray-700 uppercase text-xs border-b">
                                    <tr>
                                        <th className="py-3 px-4 font-semibold">Token #</th>
                                        <th className="py-3 px-4 font-semibold">Patient Name</th>
                                        <th className="py-3 px-4 font-semibold">Age/Gender</th>
                                        <th className="py-3 px-4 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    <tr className="hover:bg-gray-50 transition">
                                        <td className="py-3 px-4 font-medium text-gray-900">101</td>
                                        <td className="py-3 px-4 font-medium">Ahmed Raza</td>
                                        <td className="py-3 px-4">34 / M</td>
                                        <td className="py-3 px-4">
                                            <span className="bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full text-xs font-medium">Waiting</span>
                                        </td>
                                    </tr>
                                    <tr className="hover:bg-gray-50 transition">
                                        <td className="py-3 px-4 font-medium text-gray-900">102</td>
                                        <td className="py-3 px-4 font-medium">Sana Tariq</td>
                                        <td className="py-3 px-4">29 / F</td>
                                        <td className="py-3 px-4">
                                            <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">Next in Line</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}