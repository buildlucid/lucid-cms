import type { DeployProviderInstance } from "@lucidcms/core/types";
import constants from "./constants.js";
import type { GitHubActionsOptions, GitHubWorkflowRun } from "./types.js";
import githubRequest from "./utils/github-request.js";
import runUpdate from "./utils/run-update.js";
import verifySignature from "./utils/verify-signature.js";

/**
 * A deploy provider that dispatches a GitHub Actions workflow. Lucid polls the workflow run for its
 * status, or takes it from GitHub's workflow run webhooks when `webhookSecret` is set, checking
 * once more before a run times out in case a webhook went missing. Cancelling a run in the admin
 * cancels the workflow run.
 *
 * @example
 * defineDeploy({
 * 	key: "production",
 * 	name: "Production",
 * 	provider: githubActions({
 * 		token: env.GITHUB_TOKEN,
 * 		repository: "acme/site",
 * 		workflow: "deploy.yml",
 * 		ref: "main",
 * 	}),
 * });
 */
const githubActions = (
	options: GitHubActionsOptions,
): DeployProviderInstance => {
	const apiUrl = (options.apiUrl ?? constants.apiUrl).replace(/\/+$/, "");
	const repositoryUrl = `${apiUrl}/repos/${options.repository}`;
	const webhookSecret = options.webhookSecret;

	return {
		type: "deploy-provider",
		key: "github-actions",
		timeoutSeconds: options.timeoutSeconds,
		trigger: async (_context, run) => {
			const response = await githubRequest({
				url: `${repositoryUrl}/actions/workflows/${encodeURIComponent(options.workflow)}/dispatches`,
				token: options.token,
				method: "POST",
				body: {
					ref: options.ref,
					...(options.inputs && { inputs: options.inputs(run) }),
					return_run_details: true,
				},
			});

			//* GitHub Enterprise Server versions without run details answer 204 with no body
			const details: unknown =
				response.status === 204
					? null
					: await response.json().catch(() => null);
			if (
				typeof details !== "object" ||
				details === null ||
				!("workflow_run_id" in details) ||
				typeof details.workflow_run_id !== "number"
			) {
				return { status: "triggered" };
			}

			return {
				status: "running",
				externalId: String(details.workflow_run_id),
				...("html_url" in details &&
					typeof details.html_url === "string" && { url: details.html_url }),
			};
		},
		status: async (_context, run) => {
			const response = await githubRequest({
				url: `${repositoryUrl}/actions/runs/${encodeURIComponent(run.externalId)}`,
				token: options.token,
			});

			return runUpdate((await response.json()) as GitHubWorkflowRun);
		},
		cancel: async (_context, run) => {
			await githubRequest({
				url: `${repositoryUrl}/actions/runs/${encodeURIComponent(run.externalId)}/cancel`,
				token: options.token,
				method: "POST",
			});
		},
		...(webhookSecret && {
			webhook: async (_context, request) => {
				const body = await request.text();
				if (
					!verifySignature({
						secret: webhookSecret,
						body,
						signature: request.headers.get("x-hub-signature-256"),
					})
				) {
					throw new Error("The webhook signature doesn't match.");
				}
				if (request.headers.get("x-github-event") !== "workflow_run") {
					return null;
				}

				const run = (JSON.parse(body) as { workflow_run?: GitHubWorkflowRun })
					.workflow_run;
				if (!run) return null;

				return {
					...(runUpdate(run) ?? { status: "running", url: run.html_url }),
					externalId: String(run.id),
				};
			},
		}),
	};
};

export default githubActions;
