"use client";

import { useEffect } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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

interface Slot {
  date: string;
  time: string;
  status: "available" | "booked";
}

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
  availabilitySlots,
}: {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  selectedSlot: string | null;
  onSelectSlot: (s: string | null) => void;
  availabilitySlots: Slot[];
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const cells = useMemo(
    () => buildMonth(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const daySlots = useMemo(() => {
    const dateStr = selectedDate.toISOString().split("T")[0];
    return availabilitySlots
      .filter((s) => s.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [availabilitySlots, selectedDate]);

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
          {daySlots.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              No slots available for this date.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {daySlots.map((slot) => {
                const isBooked = slot.status === "booked";
                const slotValue = `${slot.date}|${slot.time}`;
                const isSelected = selectedSlot === slotValue;
                return (
                  <button
                    key={slotValue}
                    type="button"
                    disabled={isBooked}
                    onClick={() => onSelectSlot(slotValue)}
                    className={cn(
                      "rounded-md border px-2 py-2 text-xs font-medium transition-colors",
                      isBooked
                        ? "cursor-not-allowed border-dashed text-muted-foreground/40 line-through"
                        : isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary hover:text-primary",
                    )}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          )}
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
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availabilitySlots, setAvailabilitySlots] = useState<Slot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadDoctor() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/doctors/${doctorId}`, { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error("Doctor not found");
          }
          throw new Error("Failed to load doctor");
        }
        const data = await res.json();
        if (!cancelled) {
          setDoctor(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load doctor");
          setDoctor(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDoctor();
    return () => { cancelled = true; };
  }, [doctorId]);

  useEffect(() => {
    let cancelled = false;
    async function loadAvailability() {
      setAvailabilityLoading(true);
      setAvailabilitySlots([]);
      try {
        const res = await fetch(`/api/doctors/${doctorId}/availability`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load availability");
        const data = await res.json();
        if (!cancelled) {
          setAvailabilitySlots(data.slots || []);
        }
      } catch {
        if (!cancelled) {
          setAvailabilitySlots([]);
        }
      } finally {
        if (!cancelled) setAvailabilityLoading(false);
      }
    }
    loadAvailability();
    return () => { cancelled = true; };
  }, [doctorId]);

  const handleBook = async () => {
    if (!selectedSlot || !doctor) return;
    setBooking(true);
    const [dateStr, time] = selectedSlot.split("|");
    const query = new URLSearchParams({
      doctorId: doctor.id,
      slot: selectedSlot,
      doctor: doctor.name,
      specialty: doctor.specialty,
      date: dateStr,
      time,
    }).toString();
    router.push(`/appointment/book?${query}`);
  };

  if (error || (!doctor && !loading)) {
    return (
      <PageLayout>
        <div className="doctor-profile-page mx-auto max-w-5xl px-3 py-6 sm:px-5 md:py-8">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <h2 className="mb-2 text-2xl font-bold">Doctor not found</h2>
            <p className="mb-6 text-muted-foreground">
              The doctor you are looking for does not exist or has been removed.
            </p>
            <Link href="/doctors">
              <Button variant="outline">
                <ChevronLeft className="mr-2 size-4" />
                Back to Doctors
              </Button>
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="doctor-profile-page mx-auto max-w-5xl space-y-8 rounded-3xl px-3 py-6 sm:px-5 md:py-8">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Card>
            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="flex gap-6">
                <Skeleton className="size-32 md:size-40 rounded-full" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-6 w-40" />
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-9 rounded-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-40" />
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageLayout>
    );
  }

  const initials = doctor.name
    .replace("Dr. ", "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <PageLayout>
      <div className="doctor-profile-page mx-auto max-w-5xl space-y-8 rounded-3xl px-3 py-6 sm:px-5 md:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="size-4" />
          <Link href="/doctors" className="hover:text-primary transition-colors">
            Doctors
          </Link>
          <ChevronRight className="size-4" />
          <span className="text-foreground font-medium">
            {doctor.name.replace("Dr. ", "")}
          </span>
        </nav>

        {/* Back Button */}
        <div className="flex justify-start">
          <Link href="/doctors">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="size-4 mr-1" />
              Back to Doctors
            </Button>
          </Link>
        </div>

        {/* ---------- Hero / Profile card ---------- */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-start">
              <div className="shrink-0">
                <Avatar className="size-32 md:size-40 border-4 border-primary/20">
                  {doctor.image ? (
                    <AvatarImage src={doctor.image} alt={doctor.name} />
                  ) : null}
                  <AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/10 text-primary text-4xl font-bold">
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
            {availabilityLoading ? (
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 35 }).map((_, i) => (
                        <Skeleton key={i} className="h-9 w-9 rounded-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-40" />
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 rounded" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : availabilitySlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl">
                <Calendar className="size-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-semibold">Koi slot available nahi is hafte</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Availability API ready nahi hai ya koi slot nahi hai.
                </p>
              </div>
            ) : (
              <>
                <CalendarWithSlots
                  selectedDate={selectedDate}
                  onSelectDate={(d) => {
                    setSelectedDate(d);
                    setSelectedSlot(null);
                  }}
                  selectedSlot={selectedSlot}
                  onSelectSlot={setSelectedSlot}
                  availabilitySlots={availabilitySlots}
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
              </>
            )}
          </TabsContent>

          {/* Reviews */}
          <TabsContent value="reviews" className="mt-6 space-y-6">
            <div className="flex items-center justify-between gap-4 bg-linear-to-r from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
              <div>
                <h2 className="text-lg font-bold">Patient Reviews</h2>
                <p className="text-sm text-muted-foreground">
                  Based on {doctor.reviewCount} patient reviews
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

            <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Detailed patient reviews are not available from the doctor API.
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
