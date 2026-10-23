import { mkdir, mkdtemp, realpath, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import filesystemCli from "./cli.js";

const toGlob = (directory: string) =>
	`${directory.split(path.sep).join("/")}/**`;

/** Returns the config the plugin's Vite plugin adds on top of `userConfig`. */
const resolvePluginConfig = async (
	uploadDir: string,
	projectRoot: string,
	userConfig: { server?: { watch?: null } } = {},
) => {
	const vite = await filesystemCli({ uploadDir }).hooks?.vite?.({
		config: {} as never,
		projectRoot,
		runtime: "node",
	});
	const plugin = vite?.plugins?.[0];
	return plugin &&
		typeof plugin === "object" &&
		"config" in plugin &&
		typeof plugin.config === "function"
		? plugin.config.call(undefined as never, userConfig, {
				command: "serve",
				mode: "development",
			})
		: undefined;
};

test("keeps the upload directory away from the dev server by its configured and resolved paths", async () => {
	const root = await mkdtemp(path.join(os.tmpdir(), "lucid-filesystem-"));
	try {
		const realProject = path.join(root, "real-project");
		const linkedProject = path.join(root, "linked-project");
		const media = path.join(root, "media");
		await mkdir(realProject);
		await mkdir(media);
		await symlink(realProject, linkedProject, "dir");
		await symlink(media, path.join(realProject, "linked-media"), "dir");

		const uploads = expect.arrayContaining([
			toGlob(path.join(linkedProject, "linked-media")),
			// Vite resolves a symlinked root, but not the request path inside it.
			toGlob(path.join(await realpath(realProject), "linked-media")),
			toGlob(await realpath(media)),
		]);

		expect(await resolvePluginConfig("./linked-media", linkedProject)).toEqual({
			server: { watch: { ignored: uploads }, fs: { deny: uploads } },
		});
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("leaves the watcher off for servers that turn it off", async () => {
	const root = await mkdtemp(path.join(os.tmpdir(), "lucid-filesystem-"));
	try {
		const config = await resolvePluginConfig("./uploads", root, {
			server: { watch: null },
		});

		expect(config).toHaveProperty("server.watch", undefined);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
