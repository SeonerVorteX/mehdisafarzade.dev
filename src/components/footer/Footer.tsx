'use client';

import './styles.css';
import data from '@/data/data';
import { createObserver } from '@/utils';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

export default () => {
    const slideFooterRight = useRef(null);
    const slideFooterLeft = useRef(null);
    const slideFooterUp = useRef(null);
    const { email, socials } = data.about;

    useEffect(() => {
        const slideRightObserver = createObserver(['slide-footer-right']);
        const slideLeftObserver = createObserver(['slide-footer-left']);

        if (slideFooterRight.current) {
            slideRightObserver.observe(slideFooterRight.current);
        }

        if (slideFooterLeft.current) {
            slideLeftObserver.observe(slideFooterLeft.current);
        }
    }, []);

    return (
        <footer id="contact">
            <div className="container">
                <div className="footer-content flexible-opacity">
                    <div ref={slideFooterRight} className="footer-left hidden">
                        <div className="footer-socials">
                            <Link href={socials.github} target="_blank">
                                <i className="fa-brands fa-github"></i>
                            </Link>
                            <Link href={socials.linkedin} target="_blank">
                                <i className="fa-brands fa-linkedin"></i>
                            </Link>
                            <Link href={socials.discord} target="_blank">
                                <i className="fa-brands fa-discord"></i>
                            </Link>
                        </div>
                        <p>Developed with Love and Coffee</p>
                    </div>
                    <div ref={slideFooterLeft} className="footer-right hidden">
                        <h4 className="email">
                            <Link href={`mailto:${email}`}>{email}</Link>
                        </h4>
                        <h4 className="contact">Feel free to contact me</h4>
                    </div>
                </div>

                <div className="copyright">
                    Copyright © 2024 Mehdi Safarzade. All rights reserved.
                </div>
            </div>
        </footer>
    );
};
