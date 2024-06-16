"use client";

import { useEffect, useRef } from "react";
import "./styles.css";
import data from "@/data/data";
import { createObserver } from "@/utils";

export default () => {
    const { tools, skills, experiences } = data.technologies;
    const slideAdditionalRight = useRef(null);
    const slideAdditionalUp = useRef(null);

    useEffect(() => {
        const slideRightObserver = createObserver(["slide-additional-right"]);
        const slideUpObserver = createObserver(["slide-additional-up"]);

        if (slideAdditionalRight.current) {
            slideRightObserver.observe(slideAdditionalRight.current);
        }

        if (slideAdditionalUp.current) {
            slideUpObserver.observe(slideAdditionalUp.current);
        }
    }, []);

    return (
        <section className="additional">
            <div className="container">
                <div
                    ref={slideAdditionalRight}
                    className="heading hidden flexible-opacity"
                >
                    <h2>Additional technologies and skills</h2>
                </div>
                <div ref={slideAdditionalUp} className="details hidden">
                    <div className="tools flexible-opacity">
                        <ul>
                            {tools.map((tool, index) => (
                                <li key={index}>
                                    <div className="circle"></div>
                                    <h3>{tool}</h3>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="experiences flexible-opacity">
                        <ul>
                            {experiences.map((experience, index) => (
                                <li key={index}>
                                    <div className="circle"></div>
                                    <h3>{experience}</h3>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="skills flexible-opacity">
                        <ul>
                            {skills.map((skill, index) => (
                                <li key={index}>
                                    <div className="circle"></div>
                                    <h3>{skill}</h3>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
};
