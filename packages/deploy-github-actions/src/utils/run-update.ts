import type { DeployProviderUpdate } from "@lucidcms/core/types";
import type { GitHubWorkflowRun } from "../types.js";

const conclusionMessages: Record<string, string> = {
	failure: "The workflow failed.",
	cancelled: "The workflow run was cancelled.",
	timed_out: "The workflow run timed out on GitHub.",
	action_required: "The workflow run is waiting for approval on GitHub.",
	startup_failure: "The workflow couldn't start.",
	skipped: "The workflow run was skipped.",
	stale: "The workflow run went stale.",
};

/** Maps a finished workflow run to a deploy status, or null while it's still going. */
const runUpdate = (run: GitHubWorkflowRun): DeployProviderUpdate | null => {
	if (run.status !== "completed") return null;
	if (run.conclusion === "success") {
		return { status: "succeeded", url: run.html_url };
	}

	return {
		status: "failed",
		url: run.html_url,
		message:
			conclusionMessages[run.conclusion ?? ""] ??
			`The workflow run finished as ${run.conclusion ?? "unknown"}.`,
	};
};

export default runUpdate;
