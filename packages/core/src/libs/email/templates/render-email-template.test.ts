import { describe, expect, test } from "vitest";
import type {
	ResolvedLucidConfig,
	ServiceContext,
} from "../../../exports/types.js";
import { copy } from "../../i18n/index.js";
import renderEmailTemplate from "./render-email-template.js";

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

describe("renderEmailTemplate", () => {
	test("renders data with the email context as a global", async () => {
		const result = await renderEmailTemplate(
			createServiceContext({
				welcome:
					'{% props name: string, ...data %}<p>Hello {{ name }} from {{ context.brand.name ?? "Lucid" }}</p>',
			}),
			{
				template: "welcome",
				data: {
					name: "<Ada>",
					lastName: "Lovelace",
					context: {
						brand: { name: "Acme", logoPath: "/logo.png" },
						host: "https://example.com",
					},
				},
			},
		);

		expect(result).toEqual({
			error: undefined,
			data: "<p>Hello &lt;Ada&gt; from Acme</p>",
		});
	});

	test("returns an error when data is missing a required prop", async () => {
		const result = await renderEmailTemplate(
			createServiceContext({
				welcome: "{% props name: string %}<p>Hello {{ name }}</p>",
			}),
			{
				template: "welcome",
				data: {},
			},
		);

		expect(result.error?.status).toBe(500);
	});

	test("renders previews when redacted values don't match prop types", async () => {
		const result = await renderEmailTemplate(
			createServiceContext({
				receipt: "{% props total: number %}<p>Total: {{ total }}</p>",
			}),
			{
				template: "receipt",
				data: { total: "[REDACTED]" },
				preview: true,
			},
		);

		expect(result).toEqual({
			error: undefined,
			data: "<p>Total: [REDACTED]</p>",
		});
	});

	test("returns not found for a missing template", async () => {
		const result = await renderEmailTemplate(createServiceContext({}), {
			template: "missing",
			data: null,
		});

		expect(result.error).toMatchObject({
			message: copy("server:core.email.templates.not.found.message"),
			status: 404,
		});
	});
});
