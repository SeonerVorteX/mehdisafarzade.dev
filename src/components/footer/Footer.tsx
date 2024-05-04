import data from "@/data/data";
import "./styles.css";
import Link from "next/link";

export default () => {
    const { email, socials } = data.about;

    return (
        <footer id="contact">
            <div className="container">
                <div className="footer-content">
                    <div className="footer-left">
                        <div className="footer-socials">
                            <a href={socials.linkedin} target="_blank">
                                <i className="fa-brands fa-linkedin"></i>
                            </a>
                            <a href={socials.github} target="_blank">
                                <i className="fa-brands fa-github"></i>
                            </a>
                            <a href={socials.instagram} target="_blank">
                                <i className="fa-brands fa-instagram"></i>
                            </a>
                        </div>
                        <p>Developed with Love and Coffee</p>
                    </div>
                    <div className="footer-right">
                        <h4 className="email">
                            <Link href={`mailto:${email}`}>{email}</Link>
                        </h4>
                        <h4 className="contact">Feel free to contact me</h4>
                    </div>
                </div>

                <div className="copyright">
                    Copyright © 2024 Mehdi Safarzade. All rights reserved.
                </div>
            </div>
        </footer>
    );
};
