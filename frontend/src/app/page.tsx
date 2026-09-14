import Link from "next/link";
import {
    ArrowRight,
    Bot,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Clock3,
    HeartPulse,
    MessageCircle,
    ShieldCheck,
    Sparkles,
    Star,
    Stethoscope,
    UserRound,
} from "lucide-react";
import Footer from "@/components/shared/Footer";
import FAQSection from "@/components/shared/FAQSection";
import DoctorProfileLinkFix from "@/components/shared/DoctorProfileLinkFix";
import Navbar from "@/components/shared/Navbar";

const doctors = [
    { id: "1", name: "Dr. Sarah Ahmed", specialty: "Cardiologist", rating: "4.9", initials: "SA", color: "bg-[#d9ecff]", description: "Helps patients understand heart health, prevention, and everyday wellness." },
    { id: "2", name: "Dr. Hamza Khan", specialty: "General Physician", rating: "4.8", initials: "HK", color: "bg-[#e7f1ff]", description: "Provides thoughtful first consultations for common symptoms and health concerns." },
    { id: "3", name: "Dr. Ayesha Malik", specialty: "Dermatologist", rating: "4.9", initials: "AM", color: "bg-[#e1efff]", description: "Offers practical guidance for skin health, treatment options, and care routines." },
];

const features = [
    { icon: BrainIcon, title: "AI Assistant", image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=900&q=90", text: "Describe your symptoms in simple words and receive helpful, personalized guidance about possible next steps before you speak with a doctor." },
    { icon: CalendarDays, title: "Smart Booking", image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85", text: "Explore available appointment slots, choose a convenient time, and receive instant confirmation without long waiting or complicated forms." },
    { icon: UserRound, title: "Top Doctors", image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=85", text: "Discover verified specialists with clear profiles, experience details, patient ratings, and reviews to help you choose care with confidence." },
];

const testimonials = [
    ["Ali Raza", "Very helpful and easy to use. I found the right doctor quickly."],
    ["Fatima Khan", "The AI assistant guided me clearly and booking was instant."],
    ["Usman Tariq", "The doctor profile gave me all the information I needed before booking my consultation."],
    ["Sana Ahmed", "I felt more confident about my next step after sharing my symptoms with MedNoviAI."],
] as const;

function BrainIcon() {
    return <Bot className="size-6" />;
}

export default function Home() {
    return (
        <div className="min-h-screen bg-[#fcfcfb] text-[#171717]">
            <Navbar />
            <main className="landing-page w-full pb-8">
                <section className="relative grid overflow-hidden border-x border-b border-[#dedede] bg-[#f8fbff] px-6 pb-14 pt-12 sm:px-10 lg:grid-cols-[1.05fr_.95fr] lg:px-14 lg:pb-20 lg:pt-16">
                    <div className="absolute -left-24 -top-28 size-72 rounded-full bg-[#e3efff]" />
                    <div className="relative z-10 max-w-[620px]">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#cbdcf5] bg-white px-3 py-1 text-xs font-semibold text-[#2563eb]"><Sparkles className="size-3.5" /> AI-powered healthcare</div>
                        <h1 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-[-0.04em] text-[#111827] sm:text-6xl">Your AI-Powered Health Assistant — <span className="text-[#2563eb]">Book Doctors Instantly</span></h1>
                        <p className="mt-5 max-w-lg text-base leading-7 text-[#68717c] sm:text-lg">Describe your symptoms, get doctor recommendations, and book appointments in minutes.</p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link href="/signup" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#2563eb] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1d4ed8]">Book an Appointment <ArrowRight className="size-4" /> </Link>
                            <Link href="/chat" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#2563eb] bg-white px-5 text-sm font-semibold text-[#2563eb] transition-colors"> Chat with AI <MessageCircle className="size-4" /></Link></div>
                        <div className="mt-8 flex flex-wrap gap-5 text-xs font-medium text-[#66717c]"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-[#10b981]" /> Secure and private</span><span className="inline-flex items-center gap-1.5"><Clock3 className="size-4 text-[#10b981]" /> Available 24/7</span></div>
                    </div>
                    <div className="relative mt-12 flex min-h-[280px] items-end justify-center lg:mt-0 lg:min-h-[390px]"><div className="absolute bottom-0 h-64 w-64 rounded-full bg-[#dbeafe] sm:h-80 sm:w-80" /><div className="relative z-10 flex h-64 w-52 items-end justify-center rounded-t-[7rem] bg-[#b8d7ff] sm:h-80 sm:w-64"><div className="absolute bottom-0 h-40 w-44 rounded-t-[6rem] bg-[#2563eb] sm:h-48 sm:w-52" /><div className="absolute bottom-36 size-28 rounded-full bg-[#f1b28f] sm:bottom-44 sm:size-32" /><div className="absolute bottom-[13.8rem] h-12 w-36 rounded-t-full bg-[#253b67] sm:bottom-[17rem]" /><div className="absolute bottom-[13.2rem] left-16 h-1.5 w-1.5 rounded-full bg-[#1f2937] sm:bottom-[16.4rem] sm:left-20" /><div className="absolute bottom-[13.2rem] right-16 h-1.5 w-1.5 rounded-full bg-[#1f2937] sm:bottom-[16.4rem] sm:right-20" /><div className="absolute bottom-[11.7rem] h-5 w-10 rounded-b-full border-b-2 border-[#c46f65] sm:bottom-[14.8rem]" /></div><div className="absolute bottom-4 right-0 z-20 rounded-lg border border-[#dbe5f2] bg-white p-3 text-xs shadow-lg sm:right-4"><div className="flex items-center gap-2 font-semibold text-white"><HeartPulse className="size-4 text-[#10b981]" /> </div><p className="mt-1 text-[#89919b]">Talk to our AI assistant</p></div></div>
                </section>

                <section className="border-x border-b border-[#cfe0f5] bg-white px-6 py-7 sm:px-10">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {[["500+", "Doctors", "Verified specialists"], ["10K+", "Patients", "People supported"],
                         ["50+", "Specialties", "Care for every need"], ["4.9★", "Rating", "Loved by patients"]].map(([number, label, description]) => <div key={label} className="rounded-xl border border-[#cfe0f5] bg-[#f8fbff] px-3 py-4 text-center shadow-sm"><p className="text-xl font-bold text-[#2563eb] sm:text-2xl">{number}</p><p className="mt-1 text-xs font-bold text-[#173b68]">{label}</p><p className="mt-1 text-[10px] leading-4 text-[#71879b]">{description}</p></div>)}</div></section>

                <section id="how-it-works" className="border-x border-b border-[#cfe0f5] bg-[#f4f9ff] px-6 py-10 sm:px-10 sm:py-12">
                    <SectionHeading number="3" color="blue" title="How Does It Work"
                        subtitle="Three simple steps to better care" />
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-[#60758b] sm:text-base">Getting the right
                     care should feel simple. MedNoviAI listens to your concern, helps you understand the next step,
                     and connects you with a trusted doctor when you are ready.</p>
                     <div className="mt-8 grid gap-4 md:grid-cols-3">
                        {[[Bot, "Step 1", "AI se baat karo — symptoms batao"], [UserRound, "Step 2", "AI doctor recommend karega"], [CalendarDays, "Step 3", "Appointment book karo"]].map(([Icon, title, text], index) => <div key={title as string} className="group relative rounded-2xl border border-[#cfe0f5] bg-transparent p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-[#8db8ed] hover:shadow-lg hover:shadow-[#2563eb]/10"><span className="absolute right-4 top-4 text-xs font-bold text-[#9abbe4]">0{index + 1}</span><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#e8f1ff] text-[#2563eb] transition-colors group-hover:bg-[#2563eb] group-hover:text-white"><Icon className="size-7" /></div><h3 className="mt-5 text-base font-bold text-[#173b68]">{title as string}</h3><p className="mt-2 text-sm leading-6 text-[#66798b]">{text as string}</p>{index < 2 && <span className="absolute -right-5 top-1/2 hidden text-xl text-[#8db8ed] md:block"> &rarr;</span>}</div>)}</div></section>

                <section className="border-x border-b border-[#cfe0f5] bg-white px-6 py-10 sm:px-10 sm:py-12"><SectionHeading number="4" color="blue" title="Features of Platform" subtitle="Everything you need for a clearer care journey" /><p className="mt-4 max-w-2xl text-sm leading-6 text-[#60758b] sm:text-base">From your first question to your confirmed appointment, every part of the platform is designed to save time, reduce uncertainty, and keep your healthcare experience in one trusted place.</p><div className="mt-8 grid gap-4 md:grid-cols-3">{features.map(({ icon: Icon, title, text, image }, index) => <div key={title} className="group overflow-hidden rounded-2xl border border-[#cfe0f5] bg-linear-to-br from-white to-[#f4f9ff] p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-[#8db8ed] hover:shadow-lg hover:shadow-[#2563eb]/10"><div className="relative h-32 overflow-hidden rounded-xl border border-[#cfe0f5] bg-[#1e4f8d]"><div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${image}')` }} /><div className="absolute inset-0 bg-[#102f5f]/35" /><div className="absolute bottom-3 left-3 flex size-10 items-center justify-center rounded-xl bg-[#102f5f]/80 text-white backdrop-blur-sm"><Icon className="size-5" /></div><span className="absolute right-3 top-3 rounded-full bg-[#102f5f]/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">0{index + 1}</span></div><h3 className="mt-5 text-base font-bold text-[#2563eb]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#60758b]">{text}</p><div className="mt-5 flex items-center gap-1 text-xs font-semibold text-[#2563eb]">Explore feature <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></div></div>)}</div></section>

                <section id="doctors" className="border-x border-b border-[#cfe0f5] bg-[#f4f9ff] px-6 py-10 sm:px-10 sm:py-12">
                    <SectionHeading number="5" color="blue" title="Featured Doctors - Preview" subtitle="Meet trusted doctors 
                        ready to help" /><p className="mt-4 max-w-2xl text-sm leading-6 text-[#60758b] sm:text-base">
                        Every doctor on MedNoviAI is selected to help you make a confident choice. Compare specialties, patient
                        ratings, and profiles before booking the care that feels right for you.</p>
                        <div className="mt-8 grid gap-4 md:grid-cols-3 cursor-pointer">{doctors.map((doctor) => <div key={doctor.name} className="group rounded-2xl border border-[#cfe0f5] bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-[#8db8ed] hover:shadow-lg hover:shadow-[#2563eb]/10"><div className="flex items-start justify-between"><div className={`flex size-16 items-center justify-center rounded-2xl text-base font-bold text-[#2563eb] shadow-inner ${doctor.color}`}>{doctor.initials}</div><span className="inline-flex items-center gap-1 rounded-full bg-[#e8f1ff] px-2 py-1 text-[10px] font-semibold text-[#2563eb]"><CheckCircle2 className="size-3" /> Verified</span></div><h3 className="mt-5 font-bold text-[#173b68]">{doctor.name}</h3><p className="mt-1 text-sm text-[#5f7489]">{doctor.specialty}</p><p className="mt-3 text-sm leading-6 text-[#6b7f91]">{doctor.description}</p><div className="mt-3 flex items-center justify-between"><p className="flex items-center gap-1 text-xs font-semibold text-[#e59b21]"><Star className="size-3.5 fill-current" /> {doctor.rating} <span className="font-normal text-[#8da0b6]">patient rating</span></p><span className="text-xs text-[#6c91ba]">Available today</span></div><Link href={`/doctors/${doctor.id}`} className="mt-5 block rounded-lg border border-[#2563eb] py-2.5 text-center text-sm font-semibold text-[#2563eb] hover:text-[#5f8ae9] transition-colors">View profile</Link></div>)}</div></section>

                <section className="border-x border-b border-[#cfe0f5] bg-white px-6 py-10 sm:px-10 sm:py-12">
                    <SectionHeading number="6" color="blue" title="Testimonials - Patient reviews"
                        subtitle="Trust built by better experiences" />
                        <p className="mt-4 max-w-2xl text-sm leading-6 
                        text-[#60758b] sm:text-base">Good healthcare is not only about treatment. It is also about feeling 
                        heard, informed, and supported from the first question to the final appointment.</p>
                        <div className="mt-8 grid gap-4 md:grid-cols-2">
                            {testimonials.map(([name, quote]) => (
                             <div key={name} className="relative overflow-hidden rounded-2xl border border-[#cfe0f5] bg-linear-to-br from-[#f4f9ff] to-white p-6 shadow-sm">
                                <span className="absolute right-5 top-1 text-6xl font-serif leading-none text-[#cfe0f5]">&quot;</span>
                                <div className="relative flex items-center gap-3">
                                    <div className="flex size-11 items-center justify-center rounded-full bg-[#e4efff]
                                        text-sm font-bold text-[#2563eb]">{name[0]}</div>
                                    <div>
                                    <p className="text-sm font-bold text-[#173b68]">{name}</p>
                                    <div className="mt-1 flex text-[#f59e0b]">{[1, 2, 3, 4, 5].map((star) => 
                                        <Star key={star} className="size-3.5 fill-current" />)}
                                    </div>
                                </div>
                            </div>
                            <p className="relative mt-5 text-sm leading-7 text-[#60758b]">&quot;{quote}&quot;</p>
                            <p className="mt-4 text-xs font-semibold text-[#2563eb]">Verified patient experience</p>
                        </div>
                            ))}
                        </div>
                </section>

                <section className="border-x border-b border-[#dedede] bg-white px-6 py-10 sm:px-10 sm:py-12"><div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#4f46e5] px-6 py-10 text-center text-white shadow-xl shadow-[#2563eb]/20 sm:px-10"><div className="absolute -right-16 -top-20 size-52 rounded-full border border-white/20" /><div className="absolute -bottom-24 -left-10 size-56 rounded-full border border-white/15" /><div className="relative"><span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-blue-100"><Sparkles className="size-3.5" /> Your care journey starts here</span><h2 className="mx-auto mt-4 max-w-2xl text-2xl font-bold tracking-[-0.02em] sm:text-3xl">Ready to get started? Join thousands of patients today.</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-blue-100">Take the first step toward clearer health decisions. Chat with MedNoviAI, explore trusted doctors, and book your appointment when you are ready.</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/signup" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-[#2563eb] shadow-sm transition-colors hover:bg-blue-50">Register for Free <ArrowRight className="size-4" /></Link><Link href="/login" className="inline-flex h-11 items-center justify-center rounded-lg border border-white/60 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10">Login</Link></div></div></div></section>
                <FAQSection />
				<DoctorProfileLinkFix />
            </main>
            <Footer />
        </div>
    );
}

function SectionHeading({ number, color, title, subtitle }: { number: string; color: "blue" | "green" | "purple"; title: string; subtitle: string }) {
    const colors = { blue: "bg-[#e8f1ff] text-[#2563eb]", green: "bg-[#e8f1ff] text-[#2563eb]", purple: "bg-[#e8f1ff] text-[#2563eb]" };
    return <div className="flex items-center gap-3"><span className={`flex size-9 items-center justify-center rounded-full text-sm font-bold ${colors[color]}`}>{number}</span><div><h2 className="text-lg font-bold">{title}</h2><p className="text-sm text-[#888]">{subtitle}</p></div></div>;
}

function Tag({ text }: { text: string }) {
    return <span className="rounded-md border border-[#ddd] bg-[#fafafa] px-2.5 py-1">{text}</span>;
}
