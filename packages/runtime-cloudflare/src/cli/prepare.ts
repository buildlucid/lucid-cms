import { copyFile, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import type { PrepareHandler } from "@lucidcms/core/types";
import writeWranglerConfig from "../services/write-wrangler-config.js";
import type { AdapterOptions, PreparedWranglerConfig } from "../types.js";

const toDisplayPath = (filePath: string) =>
	`/${path.relative(process.cwd(), filePath).split(path.sep).join("/")}`;

const getLocalEnvFilenames = (environment: string | undefined) => [
	".env",
	".env.local",
	...(environment ? [`.env.${environment}`, `.env.${environment}.local`] : []),
	".dev.vars",
	...(environment ? [`.dev.vars.${environment}`] : []),
];

const pathExists = async (filePath: string) => {
	try {
		const stats = await stat(filePath);
		return stats.isFile();
	} catch {
		return false;
	}
};

const mirrorLocalEnvFiles = async (props: {
	projectRoot: string;
	outputPath: string;
	environment?: string;
}) => {
	await mkdir(props.outputPath, { recursive: true });
	await Promise.all(
		getLocalEnvFilenames(props.environment).map(async (filename) => {
			const sourcePath = path.resolve(props.projectRoot, filename);
			const targetPath = path.resolve(props.outputPath, filename);

			if (await pathExists(sourcePath)) {
				await copyFile(sourcePath, targetPath);
				return;
			}

			await rm(targetPath, { force: true });
		}),
	);
};

const prepareCommand =
	(
		options: AdapterOptions | undefined,
		prepareState: {
			setPreparedWranglerConfig: (
				config: PreparedWranglerConfig | undefined,
			) => void;
		},
	): PrepareHandler =>
	async (props) => {
		const outputPath = path.resolve(path.dirname(props.configPath), ".lucid");
		const wranglerConfig = await writeWranglerConfig({
			configPath: props.configPath,
			outputPath,
			options,
			target: "prepare",
		});

		if (!wranglerConfig.generatedConfigPath) {
			prepareState.setPreparedWranglerConfig(undefined);
			return;
		}

		await mirrorLocalEnvFiles({
			projectRoot: props.projectRoot,
			outputPath,
			environment: options?.platformProxy?.environment,
		});

		prepareState.setPreparedWranglerConfig({
			configPath: props.configPath,
			generatedConfigPath: wranglerConfig.generatedConfigPath,
			projectRoot: props.projectRoot,
		});

		props.logger.instance.info(
			"Wrangler config generated:",
			props.logger.instance.color.green(
				toDisplayPath(wranglerConfig.generatedConfigPath),
			),
			{
				silent: props.logger.silent,
			},
		);
	};

export default prepareCommand;
