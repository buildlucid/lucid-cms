import type { DeployProviderRun } from "@lucidcms/core/types";

export type GitHubActionsOptions = {
	/** A fine-grained token, or a GitHub App token, with read and write access to the repository's Actions. */
	token: string;
	/** The repository the workflow lives in, such as `acme/site`. */
	repository: string;
	/** The workflow's file name, such as `deploy.yml`, or its ID. It needs a `workflow_dispatch` trigger. */
	workflow: string;
	/** The branch or tag to run the workflow on. */
	ref: string;
	/**
	 * Inputs for the dispatch, such as the run's `callbackUrl`. The workflow must declare each one
	 * under `workflow_dispatch.inputs`, or GitHub rejects the dispatch.
	 */
	inputs?: (run: DeployProviderRun) => Record<string, string>;
	/**
	 * Secret of a repository webhook sending "Workflow runs" events to the deploy's webhook URL. When
	 * set, Lucid takes run status from GitHub's webhooks instead of polling, checking once more before
	 * a run times out.
	 */
	webhookSecret?: string;
	/** The REST API's base URL, for GitHub Enterprise Server. Defaults to `https://api.github.com`. */
	apiUrl?: string;
	/** Seconds before a run that hasn't finished times out. Defaults to the deploy's or Lucid's timeout. */
	timeoutSeconds?: number;
};

/** The parts of a workflow run Lucid reads, from the REST API or a `workflow_run` webhook. */
export type GitHubWorkflowRun = {
	id: number;
	html_url: string;
	status: string | null;
	conclusion: string | null;
};
