import { describe, expect, test } from "vitest";
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

	test("returns not found for a missing template", async () => {
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
