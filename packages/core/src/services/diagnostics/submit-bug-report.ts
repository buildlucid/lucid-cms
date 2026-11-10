import type { RichTextJSON } from "@lucidcms/richtext";
import { generateHTML, generateText } from "@lucidcms/richtext/server";
import packageJson from "../../../package.json" with { type: "json" };
import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import submitRemoteBugReport, {
	type BugReportRequest,
} from "../../libs/lucid-remote/services/submit-bug-report/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import handleRemoteError from "../connection/helpers/handle-remote-error.js";
import getAccessToken from "../connection/token-manager.js";

/** Sends the report with an HTML message and CMS version. Requires a Lucid connection. */
const submitBugReport: ServiceFn<
	[
		Omit<BugReportRequest, "message" | "lucidVersion"> & {
			message: RichTextJSON;
		},
	],
	undefined
> = async (context, data) => {
	if (!generateText(data.message).trim()) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.routes.diagnostics.bug.report.empty"),
				status: 400,
			},
			data: undefined,
		};
	}

	const message = generateHTML(data.message);
	if (message.length > constants.bugReports.maxMessageLength) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.routes.diagnostics.bug.report.too.long"),
				status: 400,
			},
			data: undefined,
		};
	}

	const token = await getAccessToken(context, {});
	if (token.error) return token;

	const result = await submitRemoteBugReport(context, {
		accessToken: token.data.accessToken,
		report: { ...data, message, lucidVersion: packageJson.version },
	});
	if (result.error) await handleRemoteError(context, result.error);

	return result;
};

export default submitBugReport;
