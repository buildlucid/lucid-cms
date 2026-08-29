import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

/** Resolves the compiled worker consumer used by the queue adapter. */
const resolveWorkerConsumerUrl = (): URL => {
	// fallow-ignore-next-line unresolved-import -- consumer.ts compiles to consumer.mjs beside this adapter
	const localConsumerUrl = new URL("../adapter/consumer.mjs", import.meta.url);

	try {
		const require = createRequire(import.meta.url);
		const packageJsonPath = require.resolve(
			"@lucidcms/plugin-worker-queues/package.json",
		);
		return pathToFileURL(
			join(dirname(packageJsonPath), "dist", "adapter", "consumer.mjs"),
		);
	} catch {
		return localConsumerUrl;
	}
};

export default resolveWorkerConsumerUrl;
