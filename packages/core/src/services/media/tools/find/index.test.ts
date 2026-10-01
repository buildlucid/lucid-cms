import { afterAll, expect, test, vi } from "vitest";
import z from "zod";
import { createTranslationStore } from "../../../../libs/i18n/index.js";
import { toolDefinitionInternal } from "../../../../libs/tools/registry.js";
import type { Media } from "../../../../types/response.js";
import createServiceContext from "../../../../utils/services/create-service-context.js";
import getTestConfig from "../../../../utils/test-helpers/get-test-config.js";
import getMultiple from "../../get-multiple.js";
import { findMediaMcpTool } from "./index.js";
import { inputSchema } from "./schema.js";

vi.mock("../../get-multiple.js");

const testConfig = getTestConfig();
afterAll(testConfig.destroy);

const image = {
	id: 4,
	type: "image",
	status: "ready",
	folderId: null,
	origin: "human",
	title: { en: "Waterfall", fr: "Cascade" },
	public: false,
	isDeleted: false,
	isDeletedAt: null,
	deletedBy: null,
	createdAt: null,
	updatedAt: null,
	alt: { en: "A waterfall", fr: "Une cascade" },
	key: "private/waterfall",
	url: "https://cms.example.com/private/waterfall",
	fileName: "waterfall.png",
	meta: {
		mimeType: "image/png",
		extension: "png",
		fileSize: 100,
		width: 800,
		height: 600,
		focalPoint: null,
		blurHash: null,
		averageColor: null,
		base64: null,
		isDark: null,
		isLight: null,
	},
	delivery: {
		adapter: "passthrough",
		data: null,
		supportsPresetQuery: false,
	},
	sourceType: "original",
} satisfies Media;

const makeContext = async () => {
	const base = await testConfig.getConfig();
	return createServiceContext({
		config: {
			...base,
			localization: {
				locales: [
					{ code: "en", label: "English" },
					{ code: "fr", label: "French" },
				],
				defaultLocale: "en",
			},
		},
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
};

test("uses media filters and returns localized, bounded search details", async () => {
	vi.mocked(getMultiple).mockResolvedValue({
		error: undefined,
		data: { data: [image], count: 21 },
	});
	const context = await makeContext();
	const prepared = await findMediaMcpTool()[
		toolDefinitionInternal
	].prepareInput({
		query: {
			filter: [{ key: "title", value: "Cascade", operator: "contains" }],
		},
		contentLocale: "fr",
	});
	if (prepared.type !== "ready") throw new Error("Expected valid input");
	const result = await prepared.data.run({
		context,
		execution: {
			authority: { principal: { type: "system" }, scopes: ["media:read"] },
			signal: new AbortController().signal,
		},
	});
	expect(vi.mocked(getMultiple).mock.calls[0]?.[1].query).toMatchObject({
		filter: {
			isDeleted: { value: false, operator: "=" },
		},
		filterOr: [[{ key: "title", value: "Cascade", operator: "contains" }]],
		page: 1,
		perPage: 20,
	});
	expect(vi.mocked(getMultiple).mock.calls[0]?.[1].query.filter).toEqual({
		isDeleted: { value: false, operator: "=" },
	});
	expect(result.type).toBe("success");
	if (result.type !== "success") return;
	expect(result.data.output).toMatchObject({
		data: [
			{
				id: 4,
				title: "Cascade",
				alt: "Une cascade",
				width: 800,
				height: 600,
				fileName: "waterfall.png",
				mimeType: "image/png",
				url: null,
			},
		],
		pagination: { count: 21, page: 1, perPage: 20, nextPage: 2 },
		meta: { contentLocale: "fr" },
	});
	expect(JSON.stringify(result.data)).not.toContain("private/waterfall");
});

test("model schemas offer selected conditions and accept a type-only search", () => {
	const schema = z.toJSONSchema(inputSchema, { io: "input" });
	const filter = schema.properties?.query.properties?.filter;
	expect(filter?.type).toBe("array");
	expect(
		inputSchema.parse({ query: { filter: [{ key: "type", value: "image" }] } }),
	).toEqual({
		query: {
			filterOr: [[{ key: "type", value: "image" }]],
			page: 1,
			perPage: 20,
		},
	});
	expect(
		inputSchema.safeParse({
			query: { filter: [{ key: "unknown-column", value: "image" }] },
		}).success,
	).toBe(false);
});

test("preserves ranges and combines selected filters with OR groups", () => {
	const filter = [
		{ key: "width", value: 600, operator: ">=" },
		{ key: "width", value: 1200, operator: "<=" },
	];
	const groups = [
		[{ key: "type", value: "image" }],
		[{ key: "type", value: "video" }],
	];
	expect(
		inputSchema.parse({ query: { filter, filterOr: groups } }).query,
	).toEqual({
		filterOr: groups.map((group) => [...filter, ...group]),
		page: 1,
		perPage: 20,
	});
});
