import "./styles.css";
import data from "@/data/data";
import ProjectCard from "./components/ProjectCard";

export default () => {
    const { projects } = data;

    return (
        <section id="projects">
            <div className="container">
                <div className="projects-heading">
                    <h2>Projects</h2>
                    <p>Here are some of my projects that I have worked on.</p>
                </div>
                <div className="projects">
                    {projects.map((project, index) => (
                        <ProjectCard key={index} details={project} />
                    ))}
                </div>
            </div>
        </section>
    );
};
