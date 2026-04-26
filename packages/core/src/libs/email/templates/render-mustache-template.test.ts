import { describe, expect, test } from "vitest";
import type { Config, ServiceContext } from "../../../types.js";
import renderMustacheTemplate from "./render-mustache-template.js";

const createServiceContext = (
	preRenderedEmailTemplates: Record<string, string>,
): ServiceContext =>
	({
		config: {
			preRenderedEmailTemplates,
		} as Config,
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
			message: "The template you are trying to use cannot be found.",
			status: 404,
		});
	});
});
