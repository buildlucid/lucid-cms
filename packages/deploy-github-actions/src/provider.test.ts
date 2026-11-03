import crypto from "node:crypto";
import { afterEach, describe, expect, test, vi } from "vitest";
import githubActions from "./provider.js";

afterEach(() => vi.unstubAllGlobals());

const context = {} as never;
const run = {
	id: 7,
	deployKey: "production",
	source: "manual" as const,
	triggerCount: 2,
	callbackUrl: "https://cms.example.com/api/v1/deploys/runs/7/callback?token=t",
};
const options = {
	token: "token",
	repository: "acme/site",
	workflow: "deploy.yml",
	ref: "main",
};

const respond = (response: Response) => {
	const fetch = vi.fn(async () => response);
	vi.stubGlobal("fetch", fetch);
	return fetch;
};

const webhookRequest = (props: {
	event: string;
	payload: unknown;
	secret?: string;
}) => {
	const body = JSON.stringify(props.payload);
	const signature = crypto
		.createHmac("sha256", props.secret ?? "secret")
		.update(body)
		.digest("hex");

	return new Request(
		"https://cms.example.com/api/v1/deploys/production/webhook",
		{
			method: "POST",
			headers: {
				"x-github-event": props.event,
				"x-hub-signature-256": `sha256=${signature}`,
			},
			body,
		},
	);
};

describe("GitHub Actions deploy provider", () => {
	test("dispatches the workflow with its inputs and returns the run it started", async () => {
		const fetch = respond(
			Response.json({
				workflow_run_id: 123,
				run_url: "https://api.github.com/repos/acme/site/actions/runs/123",
				html_url: "https://github.com/acme/site/actions/runs/123",
			}),
		);

		const result = await githubActions({
			...options,
			inputs: (run) => ({ callback_url: run.callbackUrl }),
		}).trigger(context, run);

		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(
			"https://api.github.com/repos/acme/site/actions/workflows/deploy.yml/dispatches",
		);
		expect(new Headers(init.headers).get("authorization")).toBe("Bearer token");
		expect(JSON.parse(String(init.body))).toEqual({
			ref: "main",
			inputs: { callback_url: run.callbackUrl },
			return_run_details: true,
		});
		expect(result).toEqual({
			status: "running",
			externalId: "123",
			url: "https://github.com/acme/site/actions/runs/123",
		});
	});

	test("ends as triggered when GitHub returns no run details, and throws GitHub's message on errors", async () => {
		const provider = githubActions(options);

		respond(new Response(null, { status: 204 }));
		expect(await provider.trigger(context, run)).toEqual({
			status: "triggered",
		});

		respond(
			Response.json(
				{ message: 'Unexpected inputs provided: ["callback_url"]' },
				{ status: 422 },
			),
		);
		await expect(provider.trigger(context, run)).rejects.toThrow(
			'GitHub responded with 422: Unexpected inputs provided: ["callback_url"]',
		);
	});

	test("polls runs until they complete, then maps their conclusion", async () => {
		const provider = githubActions(options);
		const html_url = "https://github.com/acme/site/actions/runs/123";
		const check = (status: string, conclusion: string | null) => {
			respond(Response.json({ id: 123, html_url, status, conclusion }));
			return provider.status?.(context, { ...run, externalId: "123" });
		};

		expect(await check("in_progress", null)).toBeNull();
		expect(await check("completed", "success")).toEqual({
			status: "succeeded",
			url: html_url,
		});
		expect(await check("completed", "cancelled")).toEqual({
			status: "failed",
			url: html_url,
			message: "The workflow run was cancelled.",
		});
	});

	test("cancels the workflow run, and throws when GitHub won't", async () => {
		const provider = githubActions(options);
		const fetch = respond(new Response(null, { status: 202 }));

		await provider.cancel?.(context, { ...run, externalId: "123" });
		expect(fetch).toHaveBeenCalledWith(
			"https://api.github.com/repos/acme/site/actions/runs/123/cancel",
			expect.objectContaining({ method: "POST" }),
		);

		respond(
			Response.json(
				{ message: "Cannot cancel a workflow run that is completed." },
				{ status: 409 },
			),
		);
		await expect(
			provider.cancel?.(context, { ...run, externalId: "123" }),
		).rejects.toThrow("Cannot cancel a workflow run that is completed.");
	});

	test("takes signed workflow run webhooks when a secret is set", async () => {
		const provider = githubActions({ ...options, webhookSecret: "secret" });
		const workflowRun = {
			id: 123,
			html_url: "https://github.com/acme/site/actions/runs/123",
			status: "in_progress",
			conclusion: null,
		};

		expect(
			await provider.webhook?.(
				context,
				webhookRequest({
					event: "workflow_run",
					payload: { action: "in_progress", workflow_run: workflowRun },
				}),
			),
		).toEqual({
			status: "running",
			url: workflowRun.html_url,
			externalId: "123",
		});
		expect(
			await provider.webhook?.(
				context,
				webhookRequest({
					event: "workflow_run",
					payload: {
						action: "completed",
						workflow_run: {
							...workflowRun,
							status: "completed",
							conclusion: "failure",
						},
					},
				}),
			),
		).toEqual({
			status: "failed",
			url: workflowRun.html_url,
			message: "The workflow failed.",
			externalId: "123",
		});
		expect(
			await provider.webhook?.(
				context,
				webhookRequest({ event: "ping", payload: { zen: "Keep it simple." } }),
			),
		).toBeNull();
		await expect(
			provider.webhook?.(
				context,
				webhookRequest({
					event: "workflow_run",
					payload: { workflow_run: workflowRun },
					secret: "other",
				}),
			),
		).rejects.toThrow("The webhook signature doesn't match.");
	});
});
