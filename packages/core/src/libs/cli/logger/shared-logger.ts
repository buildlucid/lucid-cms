import { colors } from "./helpers.js";

export type LoggerIssues = Array<{
	type: string;
	key: string;
	level: "unsupported" | "notice";
	message?: string;
}>;

export type SharedLogger = {
	error: (message: string, error?: unknown) => void;
	info: (message: string) => void;
	warn: (message: string) => void;
	envValidationFailed: (message?: string) => void;
	issueGroup: (issues: LoggerIssues) => void;
};

const sharedLogger = (silent?: boolean): SharedLogger => ({
	error: (message: string, error?: unknown) => {
		if (silent) return;

		console.error(`${colors.textRed}${message}${colors.reset}`);
		if (error) {
			console.error(error);
		}
	},
	info: (message: string) => {
		if (silent) return;

		console.log(`${colors.textBlue}${message}${colors.reset}`);
	},
	warn: (message: string) => {
		if (silent) return;

		console.warn(`${colors.textYellow}${message}${colors.reset}`);
	},
	envValidationFailed: (message?: string) => {
		if (silent || !message) return;
		console.error(
			`${colors.textRed}❌ Environment validation failed${colors.reset}`,
		);
		console.log("");
		console.log(message);
		console.log("");
	},
	issueGroup: (issues: LoggerIssues) => {
		if (silent || issues.length === 0) return;

		const unsupportedIssues = issues.filter((i) => i.level === "unsupported");
		const noticeIssues = issues.filter((i) => i.level === "notice");

		if (unsupportedIssues.length > 0 || noticeIssues.length > 0) {
			console.log();
		}

		if (unsupportedIssues.length > 0) {
			for (const issue of unsupportedIssues) {
				console.log(
					`${colors.textRed}×${colors.reset} ${colors.textGray}${colors.bold}${issue.key}${colors.reset}${colors.textGray} (${issue.type})${colors.reset}`,
				);
				if (issue.message) {
					console.log(`${colors.textGray}${issue.message}${colors.reset}`);
				}
			}
		}

		if (noticeIssues.length > 0) {
			for (const issue of noticeIssues) {
				console.log(
					`${colors.textYellow}◐${colors.reset} ${colors.textGray}${colors.bold}${issue.key}${colors.reset}${colors.textGray} (${issue.type})${colors.reset}`,
				);
				if (issue.message) {
					console.log(`${colors.textGray}${issue.message}${colors.reset}`);
				}
			}
		}
	},
});

export default sharedLogger;
