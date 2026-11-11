import os from "node:os";
import path from "node:path";
import { filesystem } from "@lucidcms/filesystem";
import { sharp } from "@lucidcms/sharp";

/**
 * Registers filesystem storage in `HARNESS_UPLOADS` and Sharp for Node. Keeps storage configured
 * for CLI runs. Separate from Worker-compatible `media.ts`.
 */
export const nodeMediaPlugins = (directory: string | undefined) => [
	filesystem({
		uploadDir: directory ?? path.join(os.tmpdir(), "lucid-harness-uploads"),
	}),
	sharp(),
];
