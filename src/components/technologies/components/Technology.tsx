import "./styles.css";

interface TechnologyProps {
    language: {
        name: string;
        level: string;
    };
}

export default ({ language }: TechnologyProps) => {
    const { name, level } = language;
    return (
        <div className="technology">
            <div className="scrollbar-heading">
                <h3>{name}</h3>
                <h4 className="level">
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                </h4>
            </div>
            <div className="scrollbar">
                <div className={`bar ${level.toLowerCase()}`}></div>
            </div>
        </div>
    );
};
