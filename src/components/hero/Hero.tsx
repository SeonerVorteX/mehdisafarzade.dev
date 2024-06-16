"use client";

import { useEffect, useRef } from "react";
import data from "@/data/data";
import Image from "next/image";
import Typed from "typed.js";
import "./styles.css";
import { createObserver } from "@/utils";

export default function Hero() {
    const element = useRef(null);
    const slideRight = useRef(null);
    const slideLeft = useRef(null);

    const handleDownloadCV = () => {
        const link = document.createElement("a");
        link.href = "/documents/Resume.pdf";
        link.download = "Resume.pdf";
        link.click();
    };

    useEffect(() => {
        const leftObserver = createObserver(["slide-hero-left"]);

        const rightObserver = createObserver(["slide-hero-right"]);

        if (slideRight.current) {
            rightObserver.observe(slideRight.current);
        }

        if (slideLeft.current) {
            leftObserver.observe(slideLeft.current);
        }

        const typed = new Typed(element.current, {
            strings: data.typingTexts,
            typeSpeed: 80,
            backSpeed: 50,
            loop: true,
        });
        return () => {
            typed.destroy();
        };
    }, []);

    return (
        <header>
            <div className="container">
                <div className="home-content">
                    <div
                        ref={slideRight}
                        className="home-text hidden flexible-opacity"
                    >
                        <h1>
                            <span className="sp">
                                Hello, I'm Mehdi Safarzade
                            </span>
                            <br />
                            <span ref={element}></span>
                        </h1>
                        <p>
                            Young, talented software student who is passionate
                            about his work and creates amazing things
                        </p>
                        <a
                            className="home-btn"
                            download
                            onClick={handleDownloadCV}
                            title="Click to download my CV"
                        >
                            Download CV
                        </a>
                    </div>
                    <div
                        ref={slideLeft}
                        className="home-img hidden flexible-opacity"
                        style={{
                            position: "relative",
                            width: "100%",
                            minHeight: "600px",
                        }}
                    >
                        <Image
                            src="/images/Illustration.svg"
                            fill
                            style={{ objectFit: "cover" }}
                            priority={true}
                            alt="Illustration"
                        />
                    </div>
                </div>
            </div>
        </header>
    );
}
