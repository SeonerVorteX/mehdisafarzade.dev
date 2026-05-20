'use client';

import { ProjectCardDetails } from '@/types/types';
import Image from 'next/image';
import './styles.css';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createObserver } from '@/utils';

interface ProjectCardProps {
    details: ProjectCardDetails;
}

function truncate(text: string, maxLength: number): string {
    const words = text.split(' ');
    let result = '';
    for (const word of words) {
        result += word + ' ';
        if (result.length > maxLength) break;
    }
    return result.trimEnd();
}

export default function ProjectCard({ details }: ProjectCardProps) {
    const { title, description, image, preview, url, tags } = details;

    const [expanded, setExpanded] = useState(false);
    const slideProjectUp = useRef(null);

    useEffect(() => {
        const observer = createObserver(['slide-project-up']);
        if (slideProjectUp.current) observer.observe(slideProjectUp.current);
    }, []);

    const isLong = description.length > 100;
    const target = preview ?? url;

    return (
        <article ref={slideProjectUp} className="project-border-wrap hidden">
            <div className="project-item">
                <div className="content">
                    <Link href={target} target="_blank">
                        <img src={image.src} alt={image.alt ?? title} />
                    </Link>
                    <Link href={url} target="_blank">
                        <h3>{title}</h3>
                    </Link>
                    <p>
                        {isLong ? (
                            expanded ? (
                                <>
                                    {description}{' '}
                                    <span onClick={() => setExpanded(false)} className="readless">
                                        ...read less
                                    </span>
                                </>
                            ) : (
                                <>
                                    {truncate(description, 45)}{' '}
                                    <span onClick={() => setExpanded(true)} className="readmore">
                                        ...read more
                                    </span>
                                </>
                            )
                        ) : (
                            description
                        )}
                    </p>
                </div>
                <div className="tags">
                    {tags.map((tag, index) => (
                        <span key={index} className="tag">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </article>
    );
}
