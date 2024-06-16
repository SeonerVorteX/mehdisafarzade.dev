"use client";

import "./styles.css";
import data from "@/data/data";
import ProjectCard from "./components/ProjectCard";
import { useEffect, useRef } from "react";
import { createObserver } from "@/utils";

export default () => {
    const { projects } = data;
    const slideProjectsRight = useRef(null);

    useEffect(() => {
        const slideProjectsRightObserver = createObserver([
            "slide-projects-right",
        ]);

        if (slideProjectsRight.current) {
            slideProjectsRightObserver.observe(slideProjectsRight.current);
        }
    }, []);

    return (
        <section id="projects">
            <div className="container">
                <div
                    ref={slideProjectsRight}
                    className="projects-heading hidden flexible-opacity"
                >
                    <h2>Projects</h2>
                    <p>Here are some of my projects that I have worked on.</p>
                </div>
                <div className="projects flexible-opacity-30">
                    {projects.map((project, index) => (
                        <ProjectCard key={index} details={project} />
                    ))}
                </div>
            </div>
        </section>
    );
};
