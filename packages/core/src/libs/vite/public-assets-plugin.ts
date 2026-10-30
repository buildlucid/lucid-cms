import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import mime from "mime";
import { normalizePath, type Plugin } from "vite";
import type { ResourceFile } from "../resources/types.js";
import listPublicAssets from "./list-public-assets.js";

/** Serves Lucid and project public files in development and emits them into client builds by output path, leaving matching Vite `publicDir` paths untouched. */
const publicAssetsPlugin = (files: ResourceFile[]): Plugin => {
	let publicDir: string | false = false;
	let listing: ReturnType<typeof listPublicAssets> | undefined;

	const getAssets = () => {
		const directory = publicDir;
		listing ??= listPublicAssets(
			directory
				? files.filter((file) => {
						const relative = path.relative(directory, file.path);
						if (relative.startsWith("..") || path.isAbsolute(relative)) {
							return true;
						}

						return (
							normalizePath(relative) !==
							normalizePath(file.name).replace(/^\/+/, "")
						);
					})
				: files,
		);

		return listing;
	};

	return {
		name: "lucid:public-assets",
		applyToEnvironment: (environment) => environment.name === "client",
		configResolved(config) {
			publicDir = config.publicDir === "" ? false : config.publicDir;
		},
		configureServer(server) {
			server.middlewares.use((request, response, next) => {
				if (request.method !== "GET" && request.method !== "HEAD") {
					return next();
				}

				let pathname: string;
				try {
					pathname = decodeURIComponent(
						new URL(request.url ?? "/", "http://lucid.local").pathname,
					);
				} catch {
					// A malformed path names no public file.
					return next();
				}

				getAssets()
					.then((assets) => {
						const file = assets.get(pathname);
						if (!file) return next();

						const type = mime.getType(file) ?? "application/octet-stream";
						response.setHeader(
							"Content-Type",
							type.startsWith("text/") || type.endsWith("json")
								? `${type}; charset=utf-8`
								: type,
						);
						response.setHeader("Cache-Control", "no-cache");
						if (request.method === "HEAD") return response.end();
						createReadStream(file).on("error", next).pipe(response);
					})
					.catch(next);
			});
		},
		async generateBundle() {
			for (const [pathname, file] of await getAssets()) {
				this.emitFile({
					type: "asset",
					fileName: pathname.slice(1),
					source: await readFile(file),
				});
			}
		},
	};
};

export default publicAssetsPlugin;
