import data from "@/data/data";
import "./styles.css";

export default () => {
    const { description, skills, expectations } = data.about;

    return (
        <section id="about">
            <div className="container">
                <div className="about-heading">
                    <h2>About Me</h2>
                    <p>Here is a brief introduction about me.</p>
                </div>
                <div className="about-content">
                    <article className="feature">
                        <h3>Who am I?</h3>
                        <p>{description}</p>
                    </article>
                    <article className="feature">
                        <h3>What do I do?</h3>
                        <p>{skills}</p>
                    </article>
                    <article className="feature">
                        <h3>What am I looking for?</h3>
                        <p>{expectations}</p>
                    </article>
                </div>
            </div>
        </section>
    );
};
