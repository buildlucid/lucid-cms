import { join } from "node:path";
import fs from "node:fs/promises";
import constants from "../../../constants/constants.js";

/**
 * Generate the client mount js for the admin SPA. This is placed in the CWD .lucid directory and used by the Vite build that happens on startup
 * @todo When we have plugin custom component support: this will need to imports them and pass them to the App.
 * @todo When we have plugin custom component support: this will need to read config for user specified css entry files and use that instead of @lucidcms/admin/assets/index.css.
 */
const generateClientMount = async () => {
	const cwd = process.cwd();

	const content = `
        import { render } from 'solid-js/web';
        import LucidAdmin from '@lucidcms/admin';
        import '@lucidcms/admin/assets/fonts.css';
        import '@lucidcms/admin/assets/index.css';

        render(
            LucidAdmin,
            document.getElementById('${constants.vite.rootSelector}')
        );`;

	await fs.mkdir(join(cwd, constants.vite.outputDir), { recursive: true });
	await fs.writeFile(
		join(cwd, constants.vite.outputDir, constants.vite.mount),
		content,
		"utf-8",
	);
};

export default generateClientMount;
