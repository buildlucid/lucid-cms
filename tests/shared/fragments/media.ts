import os from "node:os";
import path from "node:path";
import { filesystem } from "@lucidcms/filesystem";

/**
 * Registers filesystem storage using `HARNESS_UPLOADS`. Keeps the plugin registered without a
 * directory so CLI and test configs match.
 */
export const media = (directory: string | undefined) =>
	filesystem({
		uploadDir: directory ?? path.join(os.tmpdir(), "lucid-harness-uploads"),
	});
