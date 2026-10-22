import path from "node:path";
import type { PrepareHandler } from "@lucidcms/core/types";
import writeWranglerConfig from "../services/write-wrangler-config.js";
import type { AdapterOptions, PreparedWranglerConfig } from "../types.js";
import toDisplayPath from "../utils/path-to-display.js";

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
		const outputPath = path.resolve(path.dirname(props.configPath));

		const wranglerConfig = await writeWranglerConfig({
			configPath: props.configPath,
			outputPath,
			options,
			prepareArtifacts: props.prepareArtifacts,
			target: "prepare",
		});

		if (!wranglerConfig.configPath) {
			prepareState.setPreparedWranglerConfig(undefined);
			return;
		}

		prepareState.setPreparedWranglerConfig({
			lucidConfigPath: props.configPath,
			wranglerConfigPath: wranglerConfig.configPath,
			generated: wranglerConfig.generated,
			projectRoot: props.projectRoot,
			prepareArtifacts: props.prepareArtifacts,
		});

		if (!wranglerConfig.generatedConfigPath) {
			return;
		}

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
