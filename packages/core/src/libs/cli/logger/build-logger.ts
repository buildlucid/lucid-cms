import { colors, divider, formatBadge, formatDuration } from "./helpers.js";
import sharedLogger, { type SharedLogger } from "./shared-logger.js";

export interface BuildLogger extends SharedLogger {
	appBuildStart: (adapterName: string) => [number, number];
	appBuildComplete: (startTime: [number, number]) => void;
	buildFailed: (error: unknown) => void;
	buildComplete: (startTime: [number, number]) => void;
	buildStart: () => void;
}

const createBuildLogger = (silent?: boolean): BuildLogger => ({
	appBuildStart: (adapterName: string): [number, number] => {
		if (silent) return process.hrtime();

		console.log(`┃ 🏗️  Building for production with ${adapterName} adapter...`);
		return process.hrtime();
	},
	appBuildComplete: (startTime: [number, number]) => {
		if (silent) return;

		const diff = process.hrtime(startTime);
		const milliseconds = diff[0] * 1000 + diff[1] / 1000000;

		console.log(
			`┃ ✨ Build completed ${colors.textGreen}successfully${colors.reset} in ${formatDuration(milliseconds)}`,
		);
	},

	buildFailed: (error: unknown) => {
		if (silent) return;

		console.error(`${colors.textRed}Build failed${colors.reset}`);
		console.error(error);
	},
	buildStart: () => {
		if (silent) return;

		console.log(`\n${divider}\n`);
	},
	buildComplete: (startTime: [number, number]) => {
		if (silent) return;

		const diff = process.hrtime(startTime);
		const milliseconds = diff[0] * 1000 + diff[1] / 1000000;
		console.log(
			`\n${formatBadge("READY", colors.bgLimeGreen, colors.textGreen)} Build completed ${colors.textGreen}successfully${colors.reset} in ${formatDuration(milliseconds)}\n`,
		);
	},

	...sharedLogger(),
});

export default createBuildLogger;
