export interface ProjectCardDetails {
    id: number;
    title: string;
    description: string;
    image: string;
    imageWidth?: number;
    imageHeight?: number;
    preview?: string;
    url: string;
    tags: string[];
}
