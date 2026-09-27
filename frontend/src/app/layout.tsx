import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
    title: "MedNoviAI",
    description: "AI Healthcare Assistant Platform",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}