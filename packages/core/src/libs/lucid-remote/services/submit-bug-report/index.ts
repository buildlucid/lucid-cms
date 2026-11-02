import type { ServiceFn } from "../../../../utils/services/types.js";
import { getLucidRemoteClient } from "../../client.js";
import { lucidRemotePaths } from "../../constants.js";

export type BugReportRequest = {
	/** The message rendered to HTML. */
	message: string;
	/** The Markdown diagnostics report, or null when the reporter left it out. */
	diagnostics: string | null;
	/** The admin path the reporter was on. */
	page: string | null;
	lucidVersion: string;
	/** PNG, JPEG or WebP images as base64, without a data URL prefix. */
	images: string[];
};

/** Sends a bug report to Lucid, which stores it against the connected organisation. */
const submitBugReport: ServiceFn<
	[{ accessToken: string; report: BugReportRequest }],
	undefined
> = async (context, input) => {
	const result = await getLucidRemoteClient(context).request<unknown>(
		lucidRemotePaths.submitBugReport,
		{
			method: "POST",
			retries: 0,
			accessToken: input.accessToken,
			body: input.report,
		},
	);
	if (result.error) return result;

	return { error: undefined, data: undefined };
};

export default submitBugReport;
