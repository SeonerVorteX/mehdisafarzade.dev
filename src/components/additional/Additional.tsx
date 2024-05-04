import data from "@/data/data";
import "./styles.css";

export default () => {
    const { tools, skills, experiences } = data.technologies;

    return (
        <section className="additional">
            <div className="container">
                <div className="heading">
                    <h2>Additional technologies and skills</h2>
                </div>
                <div className="details">
                    <div className="tools">
                        <ul>
                            {tools.map((tool, index) => (
                                <li key={index}>
                                    <div className="circle"></div>
                                    <h3>{tool}</h3>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="experiences">
                        <ul>
                            {experiences.map((experience, index) => (
                                <li key={index}>
                                    <div className="circle"></div>
                                    <h3>{experience}</h3>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="skills">
                        <ul>
                            {skills.map((skill, index) => (
                                <li key={index}>
                                    <div className="circle"></div>
                                    <h3>{skill}</h3>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
};
