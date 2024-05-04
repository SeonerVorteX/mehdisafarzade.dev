import type { Metadata } from "next";
import "./globals.css";
import "./styles.css";
import Navbar from "@/components/navbar/Navbar";
import ScrollUp from "@/components/scroll-up/ScrollUp";
import Hero from "@/components/hero/Hero";
import Technologies from "@/components/technologies/Technologies";
import Additional from "@/components/additional/Additional";
import Projects from "@/components/projects/Projects";
import About from "@/components/about/About";
import Footer from "@/components/footer/Footer";
("/");
export const metadata: Metadata = {
    title: "M.S Portfolio",
    description: "Personal Portfolio of M.S.",
    keywords: ["Developer", "Portfolio", "M.S.", "Frontend", "Backend"],
    authors: [{ name: "Mehdi Safarzade", url: "https://mehdisafarzade.dev" }],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <head>
                <link
                    rel="icon"
                    type="image/png"
                    sizes="16x16"
                    href="/images/Favicon.png"
                />
            </head>
            <body>
                <Navbar />
                {children}
                <Footer />
            </body>
        </html>
    );
}
