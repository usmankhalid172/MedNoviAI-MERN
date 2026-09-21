import type { Metadata } from "next";
import DoctorProfileView from "@/components/doctors/DoctorProfileView";

interface DoctorProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: DoctorProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Doctor Profile — MedNoviAI`,
    description: `View doctor profile, availability, and patient reviews (ID: ${id})`,
  };
}

export default async function DoctorProfilePage({
  params,
}: DoctorProfilePageProps) {
  const { id } = await params;
  return <DoctorProfileView doctorId={id} />;
}