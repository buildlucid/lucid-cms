import { join } from "node:path";
import fs from "node:fs/promises";
import C from "../../../constants/constants.js";

const generateHTML = async () => {
	const cwd = process.cwd();

	//* this needs to be kept in sync with apps/cms/index.html
	// TODO: solution for favicon needed
	const content = `<!doctype html>
        <html lang="en" class="h-full">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="theme-color" content="#000000" />
                <link rel="shortcut icon" type="image/ico" href="/src/assets/favicon.ico" />
                <title>Lucid CMS</title>
            </head>
            <body class="h-full bg-container-1">
                <noscript>You need to enable JavaScript to run this app.</noscript>
                <div id="${C.vite.rootSelector}" class="h-full"></div>
                <script src="/${C.vite.mount}" type="module"></script>
            </body>
        </html>`;

	await fs.mkdir(join(cwd, C.vite.outputDir), { recursive: true });
	await fs.writeFile(
		join(cwd, C.vite.outputDir, C.vite.html),
		content,
		"utf-8",
	);
};

export default generateHTML;
