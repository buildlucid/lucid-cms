import projectPackage from "../../../package.json" assert { type: "json" };
import adminPackage from "@lucidcms/admin/package.json" assert { type: "json" };
import constants from "../../constants/constants.js";

const colors = {
	bgBlue: "\x1b[44m",
	bgYellow: "\x1b[43m",
	textBlue: "\x1b[34m",
	textYellow: "\x1b[33m",
	textGreen: "\x1b[32m",
	textLimeGreen: "\x1b[92m",
	bgLimeGreen: "\x1b[102m",
	textGray: "\x1b[90m",
	reset: "\x1b[0m",
	bold: "\x1b[1m",
} as const;

/**
 * To log when the SPA build starts and ends
 */
export const startAdminBuild = (viteSilent: boolean) => {
	if (!viteSilent) return;

	const startTime = process.hrtime();
	console.log("");
	console.log(
		`${colors.bgBlue}${colors.textBlue}${colors.bold} BUILD ${colors.reset} Building Admin SPA ${colors.textGray}v${adminPackage.version}${colors.reset}`,
	);

	return () => {
		if (!viteSilent) return;
		const [, nanoseconds] = process.hrtime(startTime);
		const milliseconds = Math.round(nanoseconds / 1000000);
		console.log(
			`${colors.bgBlue}${colors.textBlue}${colors.bold} DONE ${colors.reset} Admin SPA built ${colors.textGreen}successfully${colors.reset}${milliseconds ? ` ${colors.textGray}in ${milliseconds}ms${colors.reset}` : ""}`,
		);
		console.log("");
	};
};

/**
 * To log if the admin SPA vite build is skipped
 */
export const skipAdminBuild = () => {
	console.log("");
	console.log(
		`${colors.bgYellow}${colors.textYellow}${colors.bold} SKIP ${colors.reset} Admin SPA build skipped ${colors.textGray}(no changes detected)${colors.reset}`,
	);
	console.log("");
};

/**
 * To log once the server has finished being initialsed
 */
export const serverStarted = (address: string, start: [number, number]) => {
	const loadTime = Math.round(process.hrtime(start)[1] / 1000000);
	console.log(
		"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
	);
	console.log("");
	console.log(
		`${colors.bgLimeGreen}${colors.textGreen}${colors.bold} LUCID CMS ${colors.reset} ${colors.textLimeGreen}v${projectPackage.version}${colors.reset} ready in ${colors.textGreen}${loadTime} ms\n${colors.reset}`,
	);
	console.log(
		`┃ 🔐 Admin            ${colors.textBlue}${address}/admin${colors.reset}`,
	);
	console.log(
		`┃ 📖 Documentation    ${colors.textBlue}${constants.documentation}${colors.reset}`,
	);
	// console.log(`┃ 🖥️  Lucid UI         ${colors.textBlue}${constants.lucidUi}${colors.reset}`);
	console.log("");
	console.log(
		`${colors.textGray}Press CTRL-C to stop the server${colors.reset}`,
	);
	console.log("");
};
