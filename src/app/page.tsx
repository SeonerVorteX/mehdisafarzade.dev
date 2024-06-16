"use client";

import About from "@/components/about/About";
import Additional from "@/components/additional/Additional";
import Hero from "@/components/hero/Hero";
import Projects from "@/components/projects/Projects";
import ScrollUp from "@/components/scroll-up/ScrollUp";
import Technologies from "@/components/technologies/Technologies";
import { useEffect } from "react";

export default function Home() {
    useEffect(() => {
        const observer = new IntersectionObserver(
            (e) => {
                e.forEach((entry) => {
                    const ratio = entry.intersectionRatio;
                    const target = entry.target as HTMLElement;
                    if (target.classList.contains("flexible-opacity")) {
                        target.style.opacity = ratio.toString();
                        if (target.classList.contains("blured"))
                            target.style.filter = `blur(${
                                1.5 - 1.5 * ratio > 1.5
                                    ? 1.5
                                    : 1.5 - 1.5 * ratio
                            }px)`;
                    } else if (
                        target.classList.contains("flexible-opacity-30")
                    ) {
                        const screenWidth = window.innerWidth;
                        if (screenWidth > 768) {
                            target.style.opacity = (
                                ratio * 3 > 1 ? 1 : ratio * 3
                            ).toString();
                        } else {
                            target.style.opacity = (
                                ratio * 5.5 > 1 ? 1 : ratio * 5.5
                            ).toString();
                        }
                    }
                });
            },
            {
                threshold: Array.from(Array(101).keys(), (x) => x / 100),
                root: null,
                rootMargin: "0px",
            }
        );

        // flexible-opacity && flexible-opacity-30
        const elements = document.querySelectorAll(
            ".flexible-opacity, .flexible-opacity-30"
        );
        elements.forEach((el) => observer.observe(el));
    }, []);

    return (
        <>
            <ScrollUp />
            <Hero />
            <Projects />
            <Technologies />
            <Additional />
            <About />
        </>
    );
}
