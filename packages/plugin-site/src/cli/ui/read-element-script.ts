import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

/** The `<client-component>` element's built script, which builds copy as is and development serves through Vite. */
const readElementScript = () =>
	readFile(
		fileURLToPath(
			import.meta.resolve("@lucidcms/plugin-site/client/component.js"),
		),
		"utf8",
	);

export default readElementScript;
