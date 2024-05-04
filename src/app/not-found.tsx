import Image from "next/image";

export default () => {
    return (
        <div className="container">
            <div className="notfound">
                <div className="heading">
                    <h1>404 - Page Not Found</h1>
                    <p>
                        The page you are looking for might have been removed,
                        had its name changed or is temporarily unavailable.
                    </p>
                </div>
                <div
                    className="image"
                    style={{
                        position: "relative",
                        width: "100%",
                        minHeight: "600px",
                    }}
                >
                    <Image
                        src="/images/404.svg"
                        alt="404"
                        fill
                        style={{ objectFit: "cover" }}
                        priority={true}
                    />
                </div>
            </div>
        </div>
    );
};
