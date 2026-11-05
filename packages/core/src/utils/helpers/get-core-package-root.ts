import path from "node:path";
import { fileURLToPath } from "node:url";

/** Resolves core's package directory independently of the caller's bundle location. */
const getCorePackageRoot = () =>
	path.dirname(
		fileURLToPath(import.meta.resolve("@lucidcms/core/package.json")),
	);

export default getCorePackageRoot;
