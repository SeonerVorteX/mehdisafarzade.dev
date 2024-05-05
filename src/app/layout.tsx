import type { Metadata } from "next";
import "./globals.css";
import "./styles.css";
import Navbar from "@/components/navbar/Navbar";
import Footer from "@/components/footer/Footer";

("/");
export const metadata: Metadata = {
    title: "M.S Portfolio",
    description: "Personal Portfolio of M.S.",
    keywords: ["Developer", "Portfolio", "M.S.", "Frontend", "Backend"],
    authors: [{ name: "Mehdi Safarzade", url: "https://mehdisafarzade.dev" }],
    metadataBase: new URL("https://mehdisafarzade.dev"),
    openGraph: {
        title: "Personal Portfolio Website",
        type: "website",
        url: "https://mehdisafarzade.dev",
        description: "Personal Portfolio of M.S.",
        images: [
            {
                url: "/images/Portfolio.png",
                width: 800,
                height: 600,
                alt: "Personal Portfolio",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        site: "@SeonerVorteX",
        creator: "@SeonerVorteX",
        title: "Personal Portfolio Website",
        description: "Personal Portfolio of M.S.",
        images: [
            {
                url: "/images/Portfolio.png",
                width: 800,
                height: 600,
                alt: "Personal Portfolio",
            },
        ],
    },
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
