import { join } from "node:path";
import fs from "node:fs/promises";
import constants from "../../../constants/constants.js";

const generateClientMount = async () => {
	const cwd = process.cwd();

	// TODO: when plugin support registering components, this needs to extract them and pass them down to the app
	const content = `
        import { render } from 'solid-js/web';
        import { app } from '@lucidcms/core';

        render(
            app,
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
