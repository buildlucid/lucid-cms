import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { colors, formatDuration } from "./helpers.js";

/**
 * To log when the SPA build starts and ends
 */
export const startAdminBuild = (silent?: boolean) => {
	if (silent) return;
	const startTime = process.hrtime();

	const require = createRequire(import.meta.url);
	const adminPackagePath = require.resolve("@lucidcms/admin/package.json");
	const adminPackage = JSON.parse(readFileSync(adminPackagePath, "utf8"));

	console.log(
		`┃ 🏗️  Building Admin SPA ${colors.textGray}v${adminPackage.version}${colors.reset}`,
	);

	return () => {
		if (silent) return;
		const diff = process.hrtime(startTime);
		const milliseconds = diff[0] * 1000 + diff[1] / 1000000;

		console.log(
			`┃ ✨ Admin SPA built ${colors.textGreen}successfully${colors.reset} in ${formatDuration(milliseconds)}`,
		);
	};
};

/**
 * To log if the admin SPA vite build is skipped
 */
export const skipAdminBuild = (silent?: boolean) => {
	if (silent) return;

	console.log(
		`┃ ⏭️  Admin SPA build skipped ${colors.textGray}(no changes detected)${colors.reset}`,
	);
};
