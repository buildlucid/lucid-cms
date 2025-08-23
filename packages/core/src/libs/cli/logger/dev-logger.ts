import constants from "../../../constants/constants.js";
import { colors, divider, formatBadge, formatDuration } from "./helpers.js";
import sharedLogger, { type SharedLogger } from "./shared-logger.js";
import type { AddressInfo } from "node:net";

export interface DevLogger extends SharedLogger {
	serverStarting: (adapterName: string) => void;
	serverStarted: (
		address: AddressInfo | string | null,
		startTime: [number, number],
	) => void;
	error: (message: string, error?: unknown) => void;
	info: (message: string) => void;
}

const createDevLogger = (): DevLogger => ({
	serverStarting: (adapterName: string) => {
		console.log(`\n${divider}\n`);
		console.log(`🚀 Starting ${adapterName} development server...`);
	},
	serverStarted: (
		address: AddressInfo | string | null,
		startTime: [number, number],
	) => {
		const diff = process.hrtime(startTime);
		const milliseconds = diff[0] * 1000 + diff[1] / 1000000;

		const serverUrl =
			typeof address === "string"
				? address
				: address
					? `http://${address.address === "::" ? "localhost" : address.address}:${address.port}`
					: "unknown";

		console.log(`\n${divider}\n`);
		console.log(
			`${formatBadge("READY", colors.bgLimeGreen, colors.textGreen)} ${colors.textLimeGreen}Development server ready${colors.reset} in ${formatDuration(milliseconds)}\n`,
		);

		console.log(
			`┃ 🔐 Admin panel       ${colors.textBlue}${serverUrl}/admin${colors.reset}`,
		);
		console.log(
			`┃ 📖 Documentation     ${colors.textBlue}${constants.documentation}${colors.reset}`,
		);
		console.log(
			`\n${colors.textGray}Press CTRL-C to stop the server${colors.reset}`,
		);
	},
	...sharedLogger(),
});

export default createDevLogger;
