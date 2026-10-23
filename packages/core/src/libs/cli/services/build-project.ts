import path from "node:path";
import { createBuilder } from "vite";
import findLucidViteApi from "../../vite/find-lucid-vite-api.js";
import type { LucidViteProject } from "../../vite/types.js";
import cliLogger from "../logger.js";
import cliSpinner from "../spinner.js";
import createViteConfig from "./create-vite-config.js";
import measureOutput from "./measure-output.js";

/** Counts the project's collections, bricks and fields for the build summary, counting shared bricks once. */
const summarize = (project: LucidViteProject) => {
	let fields = 0;
	const collections = new Set<string>();
	const bricks = new Set<string>();

	for (const collection of project.config.collections) {
		if (!collection.key) continue;
		collections.add(collection.key);

		for (const brick of collection.brickInstances) {
			if (bricks.has(brick.key)) continue;
			bricks.add(brick.key);
			fields += brick.flatFields.length;
		}

		fields += collection.flatFields.length;
	}

	return { collections: collections.size, bricks: bricks.size, fields };
};

const plural = (count: number, word: string) =>
	`${word}${count === 1 ? "" : "s"}`;

/** Builds Vite environments, logs warnings and output sizes, calls `onProject` before building, shows progress unless `silent` and replaces the badge with an info line for `step`. */
const buildProject = async (props: {
	configPath: string;
	silent: boolean;
	step?: boolean;
	/** Builds only for `lucidcms serve` to preview locally. */
	preview?: boolean;
	onProject?: (project: LucidViteProject) => void;
}) => {
	const { silent, step = false } = props;
	const elapsed = cliLogger.startTimer();

	// The result badge ends the spinner unless the build is a step; callers stop it on failure.
	if (!silent) cliSpinner.start("Loading project");
	const builder = await createBuilder(
		createViteConfig({
			configPath: props.configPath,
			mode: "production",
			logLevel: silent ? "silent" : "warn",
			preview: props.preview,
		}),
	);
	const project = findLucidViteApi(builder.config.plugins).project;
	props.onProject?.(project);

	const counts = summarize(project);
	cliLogger.info(
		cliLogger.color.yellow(counts.collections),
		`${plural(counts.collections, "collection")} with`,
		cliLogger.color.yellow(counts.bricks),
		`${plural(counts.bricks, "brick")} and`,
		cliLogger.color.yellow(counts.fields),
		plural(counts.fields, "field"),
		{ silent },
	);
	cliLogger.info(
		cliLogger.color.yellow(project.config.plugins.length),
		`${plural(project.config.plugins.length, "plugin")} loaded`,
		{ silent },
	);

	if (!silent) cliSpinner.start("Building");
	await builder.buildApp();
	if (silent) return project;

	const outDir = (environment: { config: { build: { outDir: string } } }) =>
		path.resolve(builder.config.root, environment.config.build.outDir);
	const { client, ...others } = builder.environments;
	const server = Object.values(others).find(
		(environment) => environment.config.consumer === "server",
	);
	const clientDir = client ? outDir(client) : undefined;

	const completed = [
		"Build completed",
		"successfully",
		"in",
		cliLogger.color.green(cliLogger.formatMilliseconds(elapsed())),
	];
	if (step) {
		cliLogger.info(...completed);
	} else {
		cliLogger.log(cliLogger.createBadge("LUCID CMS"), ...completed, {
			spaceBefore: true,
		});
	}

	if (server) {
		const output = await measureOutput(outDir(server), clientDir);
		const external =
			server.config.resolve.external === true
				? ", packages load from node_modules"
				: "";
		cliLogger.log(
			"Server",
			cliLogger.color.yellow(cliLogger.formatBytes(output.size)),
			cliLogger.color.gray(
				`(${cliLogger.formatBytes(output.gzipSize)} gzipped${external})`,
			),
			{ indent: 2, symbol: "child" },
		);
	}

	if (clientDir) {
		const output = await measureOutput(clientDir);
		cliLogger.log(
			"Assets",
			cliLogger.color.yellow(cliLogger.formatBytes(output.size)),
			cliLogger.color.gray(
				`(admin and public files in ./${path.relative(process.cwd(), clientDir)})`,
			),
			{ indent: 2, symbol: "child" },
		);
	}

	if (!step) cliLogger.log("");

	return project;
};

export default buildProject;
