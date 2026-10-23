import path from "node:path";
import type { LucidPluginCliFactory } from "@lucidcms/core/types";
import { listResolvedPaths } from "@lucidcms/core/vite";

/** Excludes configured upload paths and symlink targets from Vite serving and watching, preventing its dev server from bypassing Lucid's routes and permissions. */
const filesystemCli: LucidPluginCliFactory<{ uploadDir: string }> = (
	options,
) => ({
	hooks: {
		vite: ({ projectRoot }) => {
			const uploads = listResolvedPaths(
				path.resolve(projectRoot, options.uploadDir),
			).map((target) => `${target.split(path.sep).join("/")}/**`);

			return {
				plugins: [
					{
						name: "lucid:filesystem-uploads",
						config: (userConfig) => ({
							server: {
								// Vite's merge replaces a `null` watch, which task servers set to turn the watcher off, so it's left alone.
								watch:
									userConfig.server?.watch === null
										? undefined
										: { ignored: uploads },
								fs: { deny: uploads },
							},
						}),
					},
				],
			};
		},
	},
});

export default filesystemCli;
