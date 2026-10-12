import { expect, test } from "vitest";
import z from "zod";
import isPlainObject from "../../utils/helpers/is-plain-object.js";
import defineAgent from "../agent/define-agent.js";
import runnerTools from "../agent/runner-tools.js";
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
		"media_generate_image",
		"media_edit_image",
		"media_generate_audio",
		"web_search",
		"web_fetch",
		"media_add_to_library",
		"lucid_builder_read",
		"lucid_builder_focus",
		"lucid_builder_update",
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
			media: {
				upload: false,
				attach: false,
				analyze: false,
				readFile: false,
				generate: false,
			},
			documents: { attach: false },
			builder: { read: false },
			web: { search: false, read: false },
		},
	});
	expect(agent.tools).toEqual([]);
});

test("builder editing needs builder reading, and the builder tools only appear on a document screen", () => {
	const names = (builder: { read?: boolean; edit?: boolean }) =>
		defineAgent({ ...options, features: { builder } })
			.tools.filter((tool) => tool.name.startsWith("lucid_builder_"))
			.map((tool) => tool.name);
	expect(names({ edit: false })).toEqual([
		"lucid_builder_read",
		"lucid_builder_focus",
	]);
	expect(names({ read: false, edit: true })).toEqual([]);

	const [read] = defineAgent(options).tools.filter(
		(tool) => tool.name === "lucid_builder_read",
	);
	const config = {} as never;
	expect(read?.available?.({ config, aiAccess: [], screen: "document" })).toBe(
		true,
	);
	expect(read?.available?.({ config, aiAccess: [], screen: "media" })).toBe(
		false,
	);
	expect(read?.available?.({ config, aiAccess: [] })).toBe(false);
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

const allowsNull = (schema: unknown): boolean =>
	isPlainObject(schema) &&
	(schema.type === "null" ||
		(Array.isArray(schema.type) && schema.type.includes("null")) ||
		(Array.isArray(schema.anyOf) && schema.anyOf.some(allowsNull)));

/** Paths of optional properties that also take null. */
const optionalNullable = (schema: unknown, path = ""): string[] => {
	if (Array.isArray(schema)) {
		return schema.flatMap((item) => optionalNullable(item, path));
	}
	if (!isPlainObject(schema)) return [];

	const required = new Set(
		Array.isArray(schema.required) ? schema.required : [],
	);
	const properties = isPlainObject(schema.properties) ? schema.properties : {};
	return [
		...Object.entries(properties).flatMap(([key, value]) => [
			...(!required.has(key) && allowsNull(value) ? [`${path}${key}`] : []),
			...optionalNullable(value, `${path}${key}.`),
		]),
		...["items", "anyOf", "oneOf", "allOf", "additionalProperties"].flatMap(
			(key) => optionalNullable(schema[key], path),
		),
	];
};

//* models fill every optional key that takes null with null, so null can't also mean "clear it"
test("agent tool inputs never take null in an optional field", () => {
	const tools = [
		...defineAgent(options).tools,
		...Object.values(agentTools).flatMap((group) =>
			typeof group === "function"
				? []
				: Object.values(group).map((create) => create()),
		),
		...Object.values(runnerTools),
	];
	const found = tools.flatMap((tool) =>
		optionalNullable(z.toJSONSchema(tool.input, { io: "input" })).map(
			(path) => `${tool.name}: ${path}`,
		),
	);
	expect(found).toEqual([]);
});
