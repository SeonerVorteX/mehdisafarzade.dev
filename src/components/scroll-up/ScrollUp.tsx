"use client";

import { useEffect, useState } from "react";
import "./styles.css";

export default () => {
    const [visible, setVisible] = useState(false);
    const [loaded, setLoaded] = useState(true);

    const handleScroll = () => {
        setLoaded(false);
        if (window.scrollY > 750) {
            setVisible(true);
        } else {
            setVisible(false);
        }
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    useEffect(() => {
        window.addEventListener("scroll", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    return (
        <div
            className={`scroll scroll-up circle  ${
                visible || loaded ? "visible" : "hidden"
            }`}
            onClick={scrollToTop}
        >
            <i className="fa-solid fa-arrow-up"></i>
        </div>
    );
};
