import { build } from "vite";
import createAdminVite, {
	type AdminViteOptions,
} from "./vite/create-admin-vite.js";

/** Builds the admin separately for hosts such as Astro, using shared Vite plugins to write `admin/index.html` and `assetsDir` under `outDir` for copying into client output. */
export const buildAdmin = async (
	options: AdminViteOptions & {
		projectRoot: string;
		outDir: string;
		/** The folder Lucid serves built assets from, which runtimes cache. */
		assetsDir: string;
	},
) => {
	await build({
		root: options.projectRoot,
		configFile: false,
		mode: "production",
		logLevel: "warn",
		publicDir: false,
		plugins: createAdminVite(options).plugins,
		build: {
			outDir: options.outDir,
			emptyOutDir: true,
			assetsDir: options.assetsDir,
			chunkSizeWarningLimit: Infinity,
			// The admin compiles with each build, which Rolldown's timing warnings would report though nobody can act on it.
			rolldownOptions: { checks: { bundlerTimings: false } },
		},
	});
};
