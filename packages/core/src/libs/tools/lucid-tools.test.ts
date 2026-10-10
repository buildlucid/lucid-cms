import { expect, test } from "vitest";
import defineAgent from "../agent/define-agent.js";
import { agentTools, mcpTools } from "./lucid-tools.js";

const options = {
	key: "research",
	name: "Research",
	description: "Researches topics.",
};

test("built-in features are enabled by default and explicit bundles flatten", () => {
	const agent = defineAgent({ ...options, tools: [agentTools.read()] });
	expect(agent.tools.map((tool) => tool.name)).toEqual([
		"media_analyze",
		"media_read_file",
		"web_search",
		"web_fetch",
		"media_add_to_library",
		...agentTools.read().map((tool) => tool.name),
	]);
	expect(mcpTools.all().map((tool) => tool.name)).toContain("media_preview");
});

test("bundles never share a tool, so any of them can be combined", () => {
	const names = [
		agentTools.read(),
		agentTools.edit(),
		agentTools.review(),
		agentTools.system(),
	].flatMap((bundle) => bundle.map((tool) => tool.name));
	expect(new Set(names).size).toBe(names.length);
});

test("namespaced tools create the tool they are named after", () => {
	expect(agentTools.documents.find().name).toBe("documents_find");
	expect(agentTools.jobs.runSchedule().name).toBe("jobs_run_schedule");
	expect(agentTools.aiUsage.get().name).toBe("ai_usage_get");
	expect(mcpTools.media.preview().name).toBe("media_preview");
});

test("all features can be disabled without registering supporting tools", () => {
	const agent = defineAgent({
		...options,
		features: {
			media: { upload: false, attach: false, analyze: false, readFile: false },
			documents: { attach: false },
			web: { search: false, read: false },
		},
	});
	expect(agent.tools).toEqual([]);
});

test("library promotion follows uploads, as personal files only come from them", () => {
	const promotion = (media: { upload: boolean; attach: boolean }) =>
		defineAgent({ ...options, features: { media } }).tools.find(
			(tool) => tool.name === "media_add_to_library",
		);
	expect(promotion({ upload: true, attach: false })?.requiresConfirmation).toBe(
		true,
	);
	expect(promotion({ upload: false, attach: true })).toBeUndefined();
});

test("web features reject invalid domains when the config loads", () => {
	expect(() =>
		defineAgent({
			...options,
			features: { web: { allowedDomains: ["https://example.com"] } },
		}),
	).toThrow("public hostnames");
	expect(() =>
		defineAgent({
			...options,
			features: { web: { allowedDomains: [" Example.com "] } },
		}),
	).not.toThrow();
});

test("the system bundle holds the reads, and the system writes ask first", () => {
	expect(agentTools.system().map((tool) => tool.name)).toEqual([
		"emails_find",
		"emails_get",
		"jobs_find",
		"jobs_get",
		"jobs_list_schedules",
		"settings_get",
		"ai_usage_get",
	]);
	expect(agentTools.system().every((tool) => tool.readOnly)).toBe(true);
	expect(agentTools.emails.resend().requiresConfirmation).toBe(true);
	expect(agentTools.jobs.runSchedule().requiresConfirmation).toBe(true);
});
