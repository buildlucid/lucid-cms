import T from "../../../translations/index.js";
import fs from "node:fs/promises";
import constants from "../../../constants/constants.js";
import type { VitePaths } from "../services/get-paths.js";
import type { ServiceResponse } from "../../../types.js";

/**
 * Generates the vite index.html entry point
 ** This needs to be kept in sync with the @lucidcms/admin/index.html file
 */
const generateHTML = async (paths: VitePaths): ServiceResponse<undefined> => {
	try {
		const content = `<!doctype html>
        <html lang="en" class="h-full">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="theme-color" content="#000000" />
                <link rel="shortcut icon" type="image/ico" href="/admin/assets/favicon.ico" />
                <title>Lucid CMS</title>
            </head>
            <body class="h-full bg-container-1">
                <noscript>You need to enable JavaScript to run this app.</noscript>
                <div id="${constants.vite.rootSelector}" class="h-full"></div>
                <script src="/${constants.vite.mount}" type="module"></script>
            </body>
        </html>`;

		await fs.mkdir(paths.publicDist, { recursive: true });
		await fs.writeFile(paths.clientHtml, content, "utf-8");

		return {
			data: undefined,
			error: undefined,
		};
	} catch (err) {
		return {
			data: undefined,
			error: {
				message:
					err instanceof Error
						? err.message
						: T("vite_client_index_generation_error"),
			},
		};
	}
};

export default generateHTML;
