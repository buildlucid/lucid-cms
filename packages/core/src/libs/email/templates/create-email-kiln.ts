import { createKiln, memoryLoader } from "@lucidkiln/core";
import type { EmailContextData } from "../types.js";

const defaultContext: EmailContextData = {
	brand: {
		name: "",
		logoPath: "",
	},
	host: "",
};

/** Creates a Kiln environment with a global email `context` and strict sends by default, allowing lenient previews of redacted or unstored data. */
const createEmailKiln = (
	templates: Record<string, string>,
	options?: { strict?: boolean },
) =>
	createKiln({
		loader: memoryLoader(templates),
		globals: { context: defaultContext },
		strict: options?.strict ?? true,
	});

export default createEmailKiln;
