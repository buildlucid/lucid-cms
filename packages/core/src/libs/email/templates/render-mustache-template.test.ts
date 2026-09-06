import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import constants from "../../../constants/constants.js";
import defaultConfig from "../../../constants/default-config.js";
import type {
	ResolvedLucidConfig,
	ServiceContext,
} from "../../../exports/types.js";
import { copy } from "../../i18n/index.js";
import renderMustacheTemplate from "./render-mustache-template.js";

const createServiceContext = (
	renderedTemplates: Record<string, string>,
): ServiceContext =>
	({
		config: {
			email: {
				templates: renderedTemplates,
			},
		} as ResolvedLucidConfig,
	}) as ServiceContext;

describe("renderMustacheTemplate", () => {
	test("renders injected pre-rendered templates", async () => {
		const result = await renderMustacheTemplate(
			createServiceContext({
				welcome: "<p>Hello {{name}}</p>",
			}),
			{
				template: "welcome",
				data: {
					name: "Ada",
				},
			},
		);

		expect(result).toEqual({
			error: undefined,
			data: "<p>Hello Ada</p>",
		});
	});

	test("does not fall back to the filesystem when injected templates are missing a key", async () => {
		const result = await renderMustacheTemplate(createServiceContext({}), {
			template: "missing",
			data: null,
		});

		expect(result.error).toMatchObject({
			message: copy("server:core.email.templates.not.found.message"),
			status: 404,
		});
	});
});

test("loads the template artifact from build.outDir when templates are not injected", async () => {
	const outDir = await mkdtemp(path.join(tmpdir(), "lucid-render-template-"));
	try {
		await writeFile(
			path.join(outDir, constants.email.renderedOutput),
			JSON.stringify({
				welcome: {
					html: "Hello {{name}}",
					lastModified: "2026-09-05T00:00:00.000Z",
				},
			}),
		);
		const context = createServiceContext({});
		context.config.email = { ...defaultConfig.email };
		context.config.build = { ...defaultConfig.build, outDir };
		const result = await renderMustacheTemplate(context, {
			template: "welcome",
			data: { name: "Ada" },
		});
		expect(result).toEqual({ error: undefined, data: "Hello Ada" });
	} finally {
		await rm(outDir, { recursive: true, force: true });
	}
});
