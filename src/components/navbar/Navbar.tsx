import Link from "next/link";
import React from "react";
import data from "@/data/data";
import "./styles.css";

export default () => {
    const { socials } = data.about;

    return (
        <div className="container">
            <div className="nav-heading">
                <h3>
                    <Link href="/#">M.S. Portfolio</Link>
                </h3>
            </div>
            <div className="nav-links">
                <ul>
                    <li>
                        <Link href="/#projects">Projects</Link>
                    </li>
                    <li>
                        <Link href="/#technologies">Technologies </Link>
                    </li>
                    <li>
                        <Link href="/#about">About Me</Link>
                    </li>
                    <li>
                        <Link href="/#contact">Contact</Link>
                    </li>
                </ul>
            </div>

            <div className="nav-socials">
                <Link href={socials.linkedin} target="_blank">
                    <i className="fa-brands fa-linkedin"></i>
                </Link>
                <Link href={socials.github} target="_blank">
                    <i className="fa-brands fa-github"></i>
                </Link>
                <Link href={socials.instagram} target="_blank">
                    <i className="fa-brands fa-instagram"></i>
                </Link>
            </div>
        </div>
    );
};
