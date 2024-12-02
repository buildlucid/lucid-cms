import projectPackage from "../../../package.json" with { type: "json" };
import adminPackage from "@lucidcms/admin/package.json" with { type: "json" };
import constants from "../../constants/constants.js";
import type { AddressInfo } from "node:net";

const colors = {
	bgBlue: "\x1b[44m",
	bgYellow: "\x1b[43m",
	bgGreen: "\x1b[42m",
	textBlue: "\x1b[34m",
	textYellow: "\x1b[33m",
	textGreen: "\x1b[32m",
	textLimeGreen: "\x1b[92m",
	bgLimeGreen: "\x1b[102m",
	textGray: "\x1b[90m",
	reset: "\x1b[0m",
	bold: "\x1b[1m",
} as const;

const formatBadge = (text: string, bg: string, textColor: string) =>
	`${bg}${textColor}${colors.bold} ${text} ${colors.reset}`;

const formatDuration = (milliseconds: number): string => {
	if (milliseconds < 1000) {
		return `${Math.round(milliseconds)}ms`;
	}
	return `${(milliseconds / 1000).toFixed(2)}s`;
};
/**
 * To log when the SPA build starts and ends
 */
export const startAdminBuild = (viteSilent: boolean) => {
	if (!viteSilent) return;
	const startTime = process.hrtime();

	console.log(
		`\n${formatBadge("BUILD", colors.bgBlue, colors.textBlue)} 🏗️  Building Admin SPA ${colors.textGray}v${adminPackage.version}${colors.reset}`,
	);

	return () => {
		if (!viteSilent) return;
		const diff = process.hrtime(startTime);
		const milliseconds = diff[0] * 1000 + diff[1] / 1000000;

		console.log(
			`${formatBadge("DONE", colors.bgGreen, colors.textGreen)} ✨ Admin SPA built ${colors.textGreen}successfully${colors.reset} in ${formatDuration(milliseconds)}`,
		);
	};
};

/**
 * To log if the admin SPA vite build is skipped
 */
export const skipAdminBuild = () => {
	console.log(
		`\n${formatBadge("SKIP", colors.bgYellow, colors.textYellow)} ⏭️  Admin SPA build skipped ${colors.textGray}(no changes detected)${colors.reset}`,
	);
};

/**
 * To log once the server has finished being initialized
 */
export const serverStarted = (
	address: AddressInfo | string | null,
	start: [number, number],
) => {
	const diff = process.hrtime(start);
	const milliseconds = diff[0] * 1000 + diff[1] / 1000000;

	const divider = `${colors.textGray}${"─".repeat(70)}${colors.reset}`;

	//* lovely ternaries
	const serverUrl =
		typeof address === "string"
			? address
			: address
				? `http://${address.address === "::" ? "localhost" : address.address}:${address.port}`
				: "unknown";

	console.log(`\n${divider}\n`);
	console.log(
		`${formatBadge("LUCID CMS", colors.bgLimeGreen, colors.textGreen)} ${colors.textLimeGreen}v${projectPackage.version}${colors.reset} ready in ${formatDuration(milliseconds)}\n`,
	);
	console.log(
		`┃ 🔐 Admin            ${colors.textBlue}${serverUrl}/admin${colors.reset}`,
	);
	console.log(
		`┃ 📖 Documentation    ${colors.textBlue}${constants.documentation}${colors.reset}`,
	);
	// console.log(`┃ 🖥️  Lucid UI         ${colors.textBlue}${constants.lucidUi}${colors.reset}`);
	console.log(
		`\n${colors.textGray}Press CTRL-C to stop the server${colors.reset}`,
	);
};
