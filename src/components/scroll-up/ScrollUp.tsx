'use client';

import { useEffect, useState } from 'react';
import './styles.css';

export default function ScrollUp() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => setVisible(window.scrollY > 750);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div
            className={`scroll scroll-up circle ${visible ? 'visible' : 'hidden'}`}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
            <i className="fa-solid fa-arrow-up"></i>
        </div>
    );
}
