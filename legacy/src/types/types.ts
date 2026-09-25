export type SkillLevel = 'advanced' | 'regular' | 'beginner';

export interface Language {
    name: string;
    level: SkillLevel;
}

export interface ProjectCardDetails {
    id: number;
    title: string;
    description: string;
    image: {
        src: string;
        alt?: string;
        width?: number;
        height?: number;
    };
    preview?: string;
    url: string;
    tags: string[];
}
