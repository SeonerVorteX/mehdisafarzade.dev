import Technology from "./components/Technology";
import data from "@/data/data";
import "./styles.css";

export default () => {
    const languages = data.technologies.languages;

    return (
        <section id="technologies">
            <div className="container">
                <div className="technologies-heading">
                    <h2>Technologies</h2>
                    <p>
                        Here are some of the technologies that I have worked
                        with.
                    </p>
                </div>
                <div className="technologies">
                    {languages.map((language, index) => (
                        <Technology key={index} language={language} />
                    ))}
                </div>
            </div>
        </section>
    );
};
