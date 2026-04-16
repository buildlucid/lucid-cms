import { createToolkitServiceContext } from "./config.js";
import createDocumentsToolkit from "./documents/index.js";
import type { CreateToolkitOptions, Toolkit } from "./types.js";

const createToolkit = async (
	options?: CreateToolkitOptions,
): Promise<Toolkit> => {
	const context = await createToolkitServiceContext(options);

	return {
		documents: createDocumentsToolkit(context),
	};
};

export default createToolkit;
