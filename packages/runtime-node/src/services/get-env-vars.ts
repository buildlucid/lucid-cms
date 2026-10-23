import type {
	EnvironmentVariables,
	GetEnvVarsLogger,
} from "@lucidcms/core/types";

const getEnvVars = async ({
	logger,
}: {
	logger: GetEnvVarsLogger;
}): Promise<EnvironmentVariables> => {
	try {
		const { config } = await import("dotenv");
		const loaded = new Set(Object.keys(process.env));
		const result = config({
			quiet: true,
		});

		if (result.parsed) {
			// Lucid loads the env more than once per process, such as for a command and its dev server, so it reports the
			// file only when it adds variables.
			const added = Object.keys(result.parsed).some((key) => !loaded.has(key));
			const envFile = process.env.DOTENV_CONFIG_PATH || ".env";

			logger.instance.info(
				"Loading environment variables from",
				logger.instance.color.blue(envFile),
				"file",
				{
					silent: logger.silent || !added,
				},
			);
		} else if (result.error) {
			logger.instance.warn(
				"No .env file found, using system environment variables",
				{
					silent: logger.silent,
				},
			);
		}
	} catch {
		logger.instance.warn(
			"dotenv not installed, using system environment variables",
			{
				silent: logger.silent,
			},
		);
	}

	return process.env as EnvironmentVariables;
};

export default getEnvVars;
