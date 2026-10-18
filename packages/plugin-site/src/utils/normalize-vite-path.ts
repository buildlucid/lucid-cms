/** Writes a path within the site directory as Vite's manifest keys it, so `./styles/site.css` and `/styles/site.css` become `styles/site.css`. */
const normalizeVitePath = (value: string) => {
	const segments = value
		.split("/")
		.filter((segment) => segment !== "" && segment !== ".");
	if (segments.length === 0 || segments.includes("..")) {
		throw new Error(`"${value}" isn't a file inside the site directory.`);
	}
	return segments.join("/");
};

export default normalizeVitePath;
