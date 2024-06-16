"use client";

import "./styles.css";
import { useEffect, useRef } from "react";
import { createObserver } from "@/utils";

interface TechnologyProps {
    language: {
        name: string;
        level: string;
    };
}

export default ({ language }: TechnologyProps) => {
    const slideTechUp = useRef(null);
    const { name, level } = language;

    useEffect(() => {
        const slideTechUpObserver = createObserver(["slide-tech-up"]);

        if (slideTechUp.current) {
            slideTechUpObserver.observe(slideTechUp.current);
        }
    }, []);

    return (
        <div ref={slideTechUp} className="technology hidden">
            <div className="scrollbar-heading">
                <h3>{name}</h3>
                <h4 className="level">
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                </h4>
            </div>
            <div className="scrollbar">
                <div className={`bar ${level.toLowerCase()}`}></div>
            </div>
        </div>
    );
};
