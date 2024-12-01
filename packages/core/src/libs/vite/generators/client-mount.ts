import T from "../../../translations/index.js";
import fs from "node:fs/promises";
import constants from "../../../constants/constants.js";
import getPaths from "../services/get-paths.js";
import type { ServiceResponse } from "../../../types.js";

/**
 * Generate the client mount js for the admin SPA. This is placed in the CWD .lucid directory and used by the Vite build that happens on startup
 * @todo When we have plugin custom component support: this will need to imports them and pass them to the App.
 * @todo When we have plugin custom component support: this will need to read config for user specified css entry files and use that instead of @lucidcms/admin/assets/index.css.
 */
const generateClientMount = async (): ServiceResponse<undefined> => {
	try {
		const paths = getPaths();

		const content = `
        import { render } from 'solid-js/web';
        import LucidAdmin from '@lucidcms/admin';
        import '@lucidcms/admin/assets/fonts.css';
        import '@lucidcms/admin/assets/index.css';

        render(
            LucidAdmin,
            document.getElementById('${constants.vite.rootSelector}')
        );`;

		await fs.mkdir(paths.clientDirectory, { recursive: true });
		await fs.writeFile(paths.clientMount, content, "utf-8");

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
						: T("vite_client_mount_generation_error"),
			},
		};
	}
};

export default generateClientMount;
