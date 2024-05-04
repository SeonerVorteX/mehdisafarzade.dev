"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import Typed from "typed.js";
import "./styles.css";

export default function Hero() {
    const element = useRef(null);

    const handleDownloadCV = () => {
        const link = document.createElement("a");
        link.href = "/documents/Resume.pdf";
        link.download = "Resume.pdf";
        link.click();
    };

    useEffect(() => {
        const typed = new Typed(element.current, {
            strings: [
                "Student",
                "Web Developer",
                "Back-End Developer",
                "Front-End Developer",
                "Bot Developer",
            ],
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
                    <div className="home-text">
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
                        className="home-img"
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
