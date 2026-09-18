"use client";

import { useMemo, useState } from "react";
import PageLayout from "@/components/shared/PageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Star,
  MapPin,
  Calendar,
  Clock,
  GraduationCap,
  Briefcase,
  ThumbsUp,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------ Types ------------------------------ */

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  image?: string;
  rating: number;
  reviewCount: number;
  experience: number;
  fee: number;
  location: string;
  about: string;
  education: string[];
  certifications: string[];
}

interface Review {
  id: string;
  patientName: string;
  rating: number;
  date: string;
  comment: string;
}

interface DaySlot {
  date: Date;
  slots: string[];
}

/* --------------------------- Mock data ---------------------------- */

const mockDoctor: Doctor = {
  id: "1",
  name: "Dr. Sarah Ahmed",
  specialty: "Cardiologist",
  rating: 4.8,
  reviewCount: 324,
  experience: 12,
  fee: 3000,
  location: "Shifa International Hospital, Islamabad",
  about:
    "Dr. Sarah Ahmed is a board-certified cardiologist with over 12 years of experience in diagnosing and treating cardiovascular diseases. She specializes in interventional cardiology, heart failure management, and preventive cardiology. She is dedicated to providing patient-centered care with the latest evidence-based treatments.",
  education: [
    "MBBS — King Edward Medical University, Lahore",
    "FCPS (Cardiology) — Aga Khan University, Karachi",
    "Fellowship in Interventional Cardiology — UK",
  ],
  certifications: [
    "Pakistan Medical & Dental Council (PMDC)",
    "European Society of Cardiology (ESC)",
  ],
};

const featuredDoctors: Doctor[] = [
  mockDoctor,
  {
    ...mockDoctor,
    id: "2",
    name: "Dr. Hamza Khan",
    specialty: "General Physician",
    rating: 4.8,
    reviewCount: 218,
    experience: 9,
    fee: 2200,
    about: "Dr. Hamza Khan provides thoughtful first consultations for common symptoms and everyday health concerns. He focuses on clear explanations, practical guidance, and patient-centered care.",
    education: ["MBBS — Aga Khan University, Karachi", "FCPS (Medicine) — CPSP Pakistan"],
    certifications: ["Pakistan Medical & Dental Council (PMDC)", "Primary Care Medicine Certification"],
  },
  {
    ...mockDoctor,
    id: "3",
    name: "Dr. Ayesha Malik",
    specialty: "Dermatologist",
    rating: 4.9,
    reviewCount: 286,
    experience: 10,
    fee: 2500,
    about: "Dr. Ayesha Malik offers practical, evidence-based guidance for skin health, treatment options, and long-term care routines.",
    education: ["MBBS — University of Lahore", "FCPS (Dermatology) — CPSP Pakistan"],
    certifications: ["Pakistan Medical & Dental Council (PMDC)", "American Academy of Dermatology Member"],
  },
];

const mockReviews: Review[] = [
  {
    id: "r1",
    patientName: "Ali Raza",
    rating: 5,
    date: "2 weeks ago",
    comment:
      "Excellent doctor. They explained everything clearly and made me feel comfortable. Highly recommended!",
  },
  {
    id: "r2",
    patientName: "Fatima Khan",
    rating: 5,
    date: "1 month ago",
    comment:
      "Very professional and caring. The treatment plan was explained clearly and worked really well for my condition.",
  },
  {
    id: "r3",
    patientName: "Bilal Hussain",
    rating: 4,
    date: "2 months ago",
    comment:
      "Good experience overall, waiting time was a bit long but the consultation was worth it.",
  },
];

const faqs = [
  {
    question: "What conditions does this doctor treat?",
    answer:
      "This doctor provides care within their listed specialty and can explain the right treatment options during your consultation.",
  },
  {
    question: "How can I book an appointment?",
    answer:
      "Select an available date and time slot from the Availability tab, then click the 'Book Appointment' button to confirm your booking.",
  },
  {
    question: "What is the consultation fee?",
    answer:
      "The consultation fee is PKR 3,000. Follow-up visits within 14 days are free of charge.",
  },
  {
    question: "Does this doctor offer online consultations?",
    answer:
      "Video consultations may be available for follow-up appointments. Please check the available booking options before confirming.",
  },
];

/* --------------------------- Helpers ------------------------------ */

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const allTimeSlots = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
];

function buildMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  return cells;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/* --------------------------- Sub-components ------------------------ */

function StarRating({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i <= Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}

function CalendarWithSlots({
  selectedDate,
  onSelectDate,
  selectedSlot,
  onSelectSlot,
}: {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  selectedSlot: string | null;
  onSelectSlot: (s: string | null) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const cells = useMemo(
    () => buildMonth(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const bookedSlots = useMemo(() => {
    // deterministic pseudo-booked slots per day
    const seed = selectedDate.getDate() + selectedDate.getMonth() * 31;
    return new Set(allTimeSlots.filter((_, i) => (seed * (i + 3)) % 7 === 0));
  }, [selectedDate]);

  const prevMonth = () => {
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    if (viewMonth === 0) setViewYear((y) => y - 1);
    setViewMonth(m);
  };
  const nextMonth = () => {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    if (viewMonth === 11) setViewYear((y) => y + 1);
    setViewMonth(m);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Calendar */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevMonth}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-semibold">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <div className="mb-1 grid-cols-7 text-center text-xs font-medium text-muted-foreground">
            {WEEK_DAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, i) => {
              if (!date) return <span key={`empty-${i}`} />;
              const isPast =
                date <
                new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  today.getDate(),
                );
              const isSelected = sameDay(date, selectedDate);
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={isPast}
                  onClick={() => onSelectDate(date)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors mx-auto",
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold"
                      : isPast
                        ? "text-muted-foreground/40 cursor-not-allowed"
                        : "hover:bg-muted",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Slots */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Clock className="size-4 text-primary" />
            Available Slots —{" "}
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {allTimeSlots.map((slot) => {
              const isBooked = bookedSlots.has(slot);
              const isSelected = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  disabled={isBooked}
                  onClick={() => onSelectSlot(slot)}
                  className={cn(
                    "rounded-md border px-2 py-2 text-xs font-medium transition-colors",
                    isBooked
                      ? "border-dashed text-muted-foreground/40 line-through cursor-not-allowed"
                      : isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary hover:text-primary",
                  )}
                >
                  {slot}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {selectedSlot
              ? `Selected: ${selectedSlot}`
              : "Select a time slot to book your appointment."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* --------------------------- Main view ----------------------------- */

export default function DoctorProfileView({ doctorId }: { doctorId: string }) {
  const doctor = featuredDoctors.find((profile) => profile.id === doctorId) ?? mockDoctor;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  const initials = doctor.name
    .replace("Dr. ", "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleBook = async () => {
    if (!selectedSlot) return;
    setBooking(true);
    // TODO: wire to backend — POST /api/appointments
    setTimeout(() => {
      setBooking(false);
      alert(
        `Appointment booked with ${doctor.name} on ${selectedDate.toDateString()} at ${selectedSlot}`,
      );
    }, 800);
  };

  return (
    <PageLayout>
      <div className="doctor-profile-page mx-auto max-w-5xl space-y-8 rounded-3xl px-3 py-6 sm:px-5 md:py-8">
        {/* ---------- Hero / Profile card ---------- */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-start">
              <div className="shrink-0">
                <Avatar className="size-32 md:size-40 border-4 border-primary/20">
                  {doctor.image ? (
                    <AvatarImage src={doctor.image} alt={doctor.name} />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-4xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 space-y-3">
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                    {doctor.name}
                  </h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      {doctor.specialty}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Verified
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
                  <div className="flex items-center gap-2">
                    <StarRating rating={doctor.rating} className="scale-110" />
                    <span className="font-bold text-lg">{doctor.rating}</span>
                    <span className="text-muted-foreground text-sm">
                      ({doctor.reviewCount} reviews)
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="size-4 text-primary" />
                    <span className="font-medium">{doctor.experience} years</span>
                    <span className="text-muted-foreground">experience</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-primary" />
                    <span className="text-muted-foreground">{doctor.location}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-primary">
                      PKR {doctor.fee.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">per consultation</span>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-auto md:sticky md:top-6">
                <Button
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md"
                  onClick={handleBook}
                  disabled={!selectedSlot || booking}
                >
                  <CalendarCheck className="size-5 mr-2" />
                  {booking
                    ? "Booking..."
                    : selectedSlot
                      ? "Book Appointment"
                      : "Select a Slot First"}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Click to book your appointment
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ---------- Tabs ---------- */}
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 h-12">
            <TabsTrigger value="about" className="text-base">About</TabsTrigger>
            <TabsTrigger value="availability" className="text-base">Availability</TabsTrigger>
            <TabsTrigger value="reviews" className="text-base">Reviews</TabsTrigger>
          </TabsList>

          {/* About */}
          <TabsContent value="about" className="mt-6 space-y-6">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-bold mb-3">About the Doctor</h2>
                  <p className="text-base leading-relaxed text-muted-foreground">
                    {doctor.about}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <h3 className="flex items-center gap-3 text-lg font-bold">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <GraduationCap className="size-5 text-blue-600" />
                    </div>
                    Education
                  </h3>
                  <ul className="space-y-3">
                    {doctor.education.map((e, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="text-primary font-bold mt-1">•</span>
                        <span className="text-muted-foreground">{e}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <h3 className="flex items-center gap-3 text-lg font-bold">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Briefcase className="size-5 text-green-600" />
                    </div>
                    Certifications
                  </h3>
                  <ul className="space-y-3">
                    {doctor.certifications.map((c, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="text-primary font-bold mt-1">•</span>
                        <span className="text-muted-foreground">{c}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Availability */}
          <TabsContent value="availability" className="mt-6">
            <CalendarWithSlots
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setSelectedSlot(null);
              }}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
            />
            <div className="mt-6 flex justify-end">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleBook}
                disabled={!selectedSlot || booking}
              >
                <CalendarCheck className="size-4" />
                {booking
                  ? "Booking..."
                  : selectedSlot
                    ? "Book Appointment"
                    : "Select a Slot First"}
              </Button>
            </div>
          </TabsContent>

          {/* Reviews */}
          <TabsContent value="reviews" className="mt-6 space-y-6">
            <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
              <div>
                <h2 className="text-lg font-bold">Patient Reviews</h2>
                <p className="text-sm text-muted-foreground">
                  Based on {mockReviews.length} verified patient feedback
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">{doctor.rating}</p>
                  <p className="text-xs text-muted-foreground">out of 5</p>
                </div>
                <div>
                  <StarRating rating={doctor.rating} className="scale-125" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {mockReviews.map((review) => (
                <Card key={review.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {review.patientName
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">{review.patientName}</p>
                          <p className="text-xs text-muted-foreground">{review.date}</p>
                        </div>
                      </div>
                      <StarRating rating={review.rating} />
                    </div>
                    <p className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                      <MessageSquare className="mt-0.5 size-4 shrink-0 text-primary/50" />
                      {review.comment}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-green-600 pt-1">
                      <ThumbsUp className="size-3.5" />
                      <span>Verified Patient Review</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* ---------- FAQ ---------- */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">
              Frequently Asked <span className="text-blue-600">Questions</span>
            </h2>
            <p className="text-muted-foreground">
              Find answers to common questions about Dr. {doctor.name.replace("Dr. ", "")}
            </p>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <Accordion>
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="hover:text-primary">
                      <span className="text-left text-base font-medium">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>
      </div>
    </PageLayout>
  );
}
