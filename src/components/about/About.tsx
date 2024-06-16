"use client";

import { useEffect, useRef } from "react";
import "./styles.css";
import data from "@/data/data";
import { createObserver } from "@/utils";

export default () => {
    const slideAboutRight = useRef(null);
    const slideAboutUp1 = useRef(null);
    const slideAboutUp2 = useRef(null);
    const slideAboutUp3 = useRef(null);
    const { description, skills, expectations } = data.about;

    useEffect(() => {
        const slideRightObserver = createObserver(["slide-about-right"]);
        const slideUpObserver = createObserver(["slide-about-up"]);

        if (slideAboutRight.current) {
            slideRightObserver.observe(slideAboutRight.current);
        }

        if (slideAboutUp1.current) {
            slideUpObserver.observe(slideAboutUp1.current);
        }

        if (slideAboutUp2.current) {
            slideUpObserver.observe(slideAboutUp2.current);
        }

        if (slideAboutUp3.current) {
            slideUpObserver.observe(slideAboutUp3.current);
        }
    }, []);

    return (
        <section id="about">
            <div className="container">
                <div
                    ref={slideAboutRight}
                    className="about-heading hidden flexible-opacity"
                >
                    <h2>About Me</h2>
                    <p>Here is a brief introduction about me.</p>
                </div>
                <div className="about-content flexible-opacity">
                    <article ref={slideAboutUp1} className="feature hidden">
                        <h3>Who am I?</h3>
                        <p>{description}</p>
                    </article>
                    <article ref={slideAboutUp2} className="feature hidden">
                        <h3>What do I do?</h3>
                        <p>{skills}</p>
                    </article>
                    <article ref={slideAboutUp3} className="feature hidden">
                        <h3>What am I looking for?</h3>
                        <p>{expectations}</p>
                    </article>
                </div>
            </div>
        </section>
    );
};
