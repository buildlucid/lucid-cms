import { join } from "node:path";
import fs from "node:fs/promises";
import C from "../../../constants/constants.js";

const generateClientMount = async () => {
	const cwd = process.cwd();

	// TODO: when plugin support registering components, this needs to extract them and pass them down to the app
	const content = `
        import { render } from 'solid-js/web';
        import { app } from '@lucidcms/core';

        render(
            app,
            document.getElementById('${C.vite.rootSelector}')
        );`;

	await fs.mkdir(join(cwd, C.vite.outputDir), { recursive: true });
	await fs.writeFile(
		join(cwd, C.vite.outputDir, C.vite.mount),
		content,
		"utf-8",
	);
};

export default generateClientMount;
