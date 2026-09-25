"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext'; // Apne path ke hisab se adjust karein
import { useRouter } from 'next/navigation';

// TypeScript Interfaces
interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  pendingReports: number;
}

interface Appointment {
  _id: string;
  patientName: string;
  time: string;
  status: 'Scheduled' | 'In Progress' | 'Completed';
}

export default function DoctorDashboard() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  // States for API Data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // 1. Role-Based Security Check
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    // Agar login user doctor nahi hai toh access rok dein
    if (!authLoading && user?.role !== 'doctor') {
      setError('Access Denied. Yeh dashboard sirf Doctors ke liye hai.');
      setLoading(false);
      return;
    }

    // 2. Fetch Real API Data
    const fetchDashboardData = async () => {
      try {
        // Ek sath dono APIs hit kar rahe hain time bachane ke liye
        const [statsRes, apptRes] = await Promise.all([
          fetch('/api/doctor/dashboard/stats', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/doctor/appointments?date=today', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (!statsRes.ok || !apptRes.ok) {
          throw new Error('Data fetch karne mein error aaya.');
        }

        const statsData = await statsRes.json();
        const apptData = await apptRes.json();

        setStats(statsData);
        setAppointments(apptData);
      } catch (err) {
        setError('Dashboard se connect nahi ho saka. Backend check karein.');
      } finally {
        setLoading(false);
      }
    };

    if (user && token) {
      fetchDashboardData();
    }
  }, [user, token, authLoading, router]);

  // 3. UI States (Loading & Error)
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl font-semibold text-gray-500 animate-pulse">Dashboard load ho raha hai...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-500 text-xl font-bold p-6 bg-red-100 rounded-lg">{error}</div>
      </div>
    );
  }

  // 4. Main Dashboard UI
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome, Dr. {user?.name || 'Doctor'}!
          </h1>
          <p className="text-gray-500 mt-2">Here is your schedule and overview for today.</p>
        </header>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium">Today's Appointments</h3>
            <p className="text-4xl font-bold text-indigo-600 mt-2">{stats?.todayAppointments || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium">Total Patients</h3>
            <p className="text-4xl font-bold text-green-600 mt-2">{stats?.totalPatients || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium">Pending Reports</h3>
            <p className="text-4xl font-bold text-orange-500 mt-2">{stats?.pendingReports || 0}</p>
          </div>
        </div>

        {/* Appointments List */}
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Today's Appointments</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {appointments.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              Aaj ke liye koi appointments schedule nahi hain.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Name</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {appointments.map((appt) => (
                    <tr key={appt._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{appt.patientName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{appt.time}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${appt.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                            appt.status === 'In Progress' ? 'bg-orange-100 text-orange-800' : 
                            'bg-blue-100 text-blue-800'}`}>
                          {appt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}