"use client";

import Technology from "./components/Technology";
import data from "@/data/data";
import "./styles.css";
import { useEffect, useRef } from "react";
import { createObserver } from "@/utils";

export default () => {
    const slideTechsRight = useRef(null);
    const languages = data.technologies.languages;

    useEffect(() => {
        const slideTechsRightObserver = createObserver(["slide-techs-right"]);

        if (slideTechsRight.current) {
            slideTechsRightObserver.observe(slideTechsRight.current);
        }
    }, []);

    return (
        <section id="technologies">
            <div className="container">
                <div
                    ref={slideTechsRight}
                    className="technologies-heading hidden flexible-opacity"
                >
                    <h2>Technologies</h2>
                    <p>
                        Here are some of the technologies that I have worked
                        with.
                    </p>
                </div>
                <div className="technologies flexible-opacity">
                    {languages.map((language, index) => (
                        <Technology key={index} language={language} />
                    ))}
                </div>
            </div>
        </section>
    );
};
