"use client";

import { ProjectCardDetails } from "@/types/types";
import Image from "next/image";
import "./styles.css";
import { Key, useState } from "react";
import Link from "next/link";

interface ProjectCardProps {
    details: ProjectCardDetails;
}

export default ({ details }: ProjectCardProps) => {
    const {
        id,
        title,
        description,
        image,
        imageWidth,
        imageHeight,
        preview,
        url,
        tags,
    } = details;

    const [expanded, setExpanded] = useState(false);

    const handleClickReadMore = () => {
        setExpanded(true);
    };

    const handleClickReadLess = () => {
        setExpanded(false);
    };

    const substringSentence = (sentence: string, length: number) => {
        let list = sentence.split(" ");
        let newSentence = "";

        for (let i = 0; i < list.length; i++) {
            newSentence += list[i] + " ";
            if (newSentence.length > length) {
                break;
            }
        }

        return newSentence;
    };

    return (
        <article className="project-border-wrap">
            <div className="project-item">
                <div className="content">
                    <Link href={preview ? preview : url} target="_blank">
                        <Image
                            src={image}
                            width={imageWidth ? imageWidth : 300}
                            height={imageHeight ? imageHeight : 150}
                            alt={title}
                            priority
                        />
                    </Link>
                    <Link href={url}>
                        <h3>{title}</h3>
                    </Link>
                    <p className={`description-${id}`}>
                        {description.length > 100 ? (
                            <>
                                {expanded ? (
                                    <>
                                        {description}
                                        {"  "}
                                        <span
                                            onClick={handleClickReadLess}
                                            className="readless"
                                        >
                                            ...read less
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        {`${substringSentence(
                                            description,
                                            100
                                        )}`}{" "}
                                        <span
                                            onClick={handleClickReadMore}
                                            className="readmore"
                                        >
                                            ...read more
                                        </span>
                                    </>
                                )}
                            </>
                        ) : (
                            description
                        )}
                    </p>
                </div>
                <div className="tags">
                    {tags.map((tag: string, index: Key) => (
                        <span key={index} className="tag">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </article>
    );
};
