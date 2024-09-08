'use client';

import Link from 'next/link';
import React, { useEffect, useRef } from 'react';
import data from '@/data/data';
import './styles.css';
import { createObserver } from '@/utils';

export default () => {
    const { socials } = data.about;
    const slideRight = useRef(null);
    const slideLeft = useRef(null);
    const slideDown = useRef(null);

    useEffect(() => {
        const slideRightObserver = createObserver(['slide-nav-right']);
        const slideLeftObserver = createObserver(['slide-nav-left']);
        const slideDownObserver = createObserver(['slide-nav-down']);

        if (slideRight.current) {
            slideRightObserver.observe(slideRight.current);
        }

        if (slideLeft.current) {
            slideLeftObserver.observe(slideLeft.current);
        }

        if (slideDown.current) {
            slideDownObserver.observe(slideDown.current);
        }
    }, []);

    return (
        <div className="container flexible-opacity">
            <div ref={slideRight} className="nav-heading hidden">
                <h3>
                    <Link href="/#">M.S. Portfolio</Link>
                </h3>
            </div>
            <div ref={slideDown} className="nav-links hidden">
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

            <div ref={slideLeft} className="nav-socials hidden">
                <Link href={socials.github} target="_blank">
                    <i className="fa-brands fa-github"></i>
                </Link>
                <Link href={socials.linkedin} target="_blank">
                    <i className="fa-brands fa-linkedin"></i>
                </Link>
                <Link href={socials.discord} target="_blank">
                    <i className="fa-brands fa-discord"></i>
                </Link>
                <Link href={socials.instagram} target="_blank">
                    <i className="fa-brands fa-instagram"></i>
                </Link>
            </div>
        </div>
    );
};
