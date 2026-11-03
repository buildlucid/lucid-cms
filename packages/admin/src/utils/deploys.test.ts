import type { Deploy, DeployRun, DeployRunStatus } from "@types";
import { describe, expect, it } from "vitest";
import { getLeadingDeploy } from "./deploys";

const run = (status: DeployRunStatus, at: string): DeployRun => ({
	id: 1,
	deployKey: "production",
	status,
	source: "manual",
	triggerCount: 0,
	startedBy: null,
	agent: null,
	url: null,
	message: null,
	createdAt: at,
	startedAt: at,
	finishedAt: status === "running" ? null : at,
});

const deploy = (key: string, overrides: Partial<Deploy>): Deploy => ({
	key,
	name: key,
	description: null,
	links: [],
	provider: "webhook",
	cancellable: false,
	enabled: true,
	disabledAt: null,
	disabledBy: null,
	triggers: [],
	schedule: null,
	webhookUrl: null,
	pending: null,
	queuedRun: null,
	runningRun: null,
	recentRuns: [],
	...overrides,
});

const now = Date.parse("2026-11-03T10:10:00.000Z");

describe("leading deploy", () => {
	it("shows the deploy that finished last, rather than an older failure", () => {
		const leading = getLeadingDeploy(
			[
				deploy("production", {
					recentRuns: [run("failed", "2026-11-03T10:00:00.000Z")],
				}),
				deploy("staging", {
					recentRuns: [run("succeeded", "2026-11-03T10:05:00.000Z")],
				}),
			],
			now,
		);

		expect(leading?.deploy.key).toBe("staging");
	});

	it("keeps a deploy in progress in front of one that finished since", () => {
		const leading = getLeadingDeploy(
			[
				deploy("production", {
					runningRun: run("running", "2026-11-03T10:00:00.000Z"),
				}),
				deploy("staging", {
					recentRuns: [run("succeeded", "2026-11-03T10:05:00.000Z")],
				}),
			],
			now,
		);

		expect(leading?.deploy.key).toBe("production");
	});
});
