import path from "node:path";
import type { PrepareHandler } from "@lucidcms/core/types";
import writeWranglerConfig from "../services/write-wrangler-config.js";
import type { AdapterOptions, PreparedWranglerConfig } from "../types.js";

const toDisplayPath = (filePath: string) =>
	`/${path.relative(process.cwd(), filePath).split(path.sep).join("/")}`;

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
