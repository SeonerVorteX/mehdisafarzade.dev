import About from "@/components/about/About";
import Additional from "@/components/additional/Additional";
import Hero from "@/components/hero/Hero";
import Projects from "@/components/projects/Projects";
import ScrollUp from "@/components/scroll-up/ScrollUp";
import Technologies from "@/components/technologies/Technologies";
import Typed, { TypedOptions } from "typed.js";

export default function Home() {
    return (
        <>
            <ScrollUp />
            <Hero />
            <Projects />
            <Technologies />
            <Additional />
            <About />
        </>
    );
}
