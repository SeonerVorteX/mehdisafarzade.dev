import type { Metadata } from 'next';
import './globals.css';
import './styles.css';
import Navbar from '@/components/navbar/Navbar';
import Footer from '@/components/footer/Footer';

export const metadata: Metadata = {
    title: 'Mehdi Safarzade',
    description: 'Full-stack developer from Baku, Azerbaijan. Building scalable web applications with Next.js, NestJS, and TypeScript.',
    keywords: ['Developer', 'Portfolio', 'Full-Stack', 'Next.js', 'NestJS', 'TypeScript', 'Mehdi Safarzade'],
    authors: [{ name: 'Mehdi Safarzade', url: 'https://mehdisafarzade.dev' }],
    metadataBase: new URL('https://mehdisafarzade.dev'),
    openGraph: {
        title: 'Mehdi Safarzade — Full-Stack Developer',
        type: 'website',
        url: 'https://mehdisafarzade.dev',
        description: 'Full-stack developer from Baku, Azerbaijan. Building scalable web applications with Next.js, NestJS, and TypeScript.',
        images: [
            {
                url: '/images/Portfolio.png',
                width: 800,
                height: 600,
                alt: 'Mehdi Safarzade Portfolio',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        site: '@SeonerVorteX',
        creator: '@SeonerVorteX',
        title: 'Mehdi Safarzade — Full-Stack Developer',
        description: 'Full-stack developer from Baku, Azerbaijan. Building scalable web applications with Next.js, NestJS, and TypeScript.',
        images: [
            {
                url: '/images/Portfolio.png',
                width: 800,
                height: 600,
                alt: 'Mehdi Safarzade Portfolio',
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
                <link rel="icon" type="image/png" sizes="16x16" href="/images/Favicon.png" />
            </head>
            <body>
                <Navbar />
                {children}
                <Footer />
            </body>
        </html>
    );
}
