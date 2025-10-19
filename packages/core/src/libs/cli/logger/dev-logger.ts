import constants from "../../../constants/constants.js";
import { colors, divider, formatBadge, formatDuration } from "./helpers.js";
import sharedLogger, { type SharedLogger } from "./shared-logger.js";
import type { AddressInfo } from "node:net";
import logger from "../../logger/index.js";

export interface DevLogger extends SharedLogger {
	serverStarting: (adapterName: string) => void;
	serverStarted: (address: AddressInfo | string | null) => void;
	error: (message: string, error?: unknown) => void;
	info: (message: string) => void;
}

const createDevLogger = (): DevLogger => ({
	serverStarting: (adapterName: string) => {
		console.log(`\n${divider}\n`);
		console.log(`🚀 Starting ${adapterName} development server...`);
	},
	serverStarted: (address: AddressInfo | string | null) => {
		const serverUrl =
			typeof address === "string"
				? address
				: address
					? `http://${address.address === "::" ? "localhost" : address.address}:${address.port}`
					: "unknown";

		console.log(`\n${divider}\n`);
		console.log(
			`${formatBadge("READY", colors.bgLimeGreen, colors.textGreen)} ${colors.textLimeGreen}Development server ready${colors.reset}\n`,
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
		console.log();

		//* set buffering to false on runtime logger so any logs it captured during commands are flushed to the console post startup
		logger.setBuffering(false);
	},
	...sharedLogger(),
});

export default createDevLogger;
