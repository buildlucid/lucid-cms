import { createToolkit } from "@lucidcms/core/toolkit";

let toolkitPromise:
	| Promise<Awaited<ReturnType<typeof createToolkit>>>
	| undefined;

const getToolkit = async () => {
	if (!toolkitPromise) {
		toolkitPromise = createToolkit().catch((error) => {
			toolkitPromise = undefined;
			throw error;
		});
	}

	return toolkitPromise;
};

export default getToolkit;
