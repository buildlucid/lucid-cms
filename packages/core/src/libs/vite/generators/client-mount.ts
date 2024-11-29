import { join } from "node:path";
import fs from "node:fs/promises";
import constants from "../../../constants/constants.js";

const generateClientMount = async () => {
	const cwd = process.cwd();

	// TODO: when plugin support registering components, this needs to extract them and pass them down to the app
	// TODO: add config option for users to specify their own css entryy
	// - In this case users will need to import tailwind and the admin css file within theirs
	// - We then dont add our own to this client mount and theirs instead
	const content = `
        import { render } from 'solid-js/web';
        import LucidAdmin from '@lucidcms/admin';
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
