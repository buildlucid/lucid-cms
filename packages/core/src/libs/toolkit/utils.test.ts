import { describe, expect, expectTypeOf, test, vi } from "vitest";
import z from "zod";
import {
	normalizeDocumentQuery,
	normalizePaginatedDocumentQuery,
	runToolkitService,
} from "./utils.js";

describe("runToolkitService", () => {
	const message = {
		key: "core.toolkit.media.upload-file.error.message",
		defaultMessage: "Lucid toolkit could not upload media.",
	};

	test("passes schema defaults and transformed values to the handler", async () => {
		const result = await runToolkitService({
			schema: z.object({
				id: z.string().transform(async (value) => Number(value)),
				public: z.boolean().default(false),
			}),
			input: { id: "42" },
			handler: async (input) => {
				expectTypeOf(input).toEqualTypeOf<{ id: number; public: boolean }>();
				return { error: undefined, data: input };
			},
			message,
		});

		expect(result).toEqual({
			error: undefined,
			data: { id: 42, public: false },
		});
	});

	test("returns validation issues without invoking the handler", async () => {
		const handler = vi.fn(async () => ({ error: undefined, data: 42 }));
		const result = await runToolkitService({
			schema: z.object({ id: z.number().positive() }),
			input: { id: -1 },
			handler,
			message,
		});

		expect(handler).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			error: {
				type: "validation",
				status: 400,
				zod: { issues: [{ path: ["id"], code: "too_small" }] },
			},
			data: undefined,
		});
	});

	test("supports asynchronous refinements", async () => {
		const handler = vi.fn(async () => ({ error: undefined, data: 42 }));
		const result = await runToolkitService({
			schema: z.string().refine(async (value) => value === "allowed"),
			input: "denied",
			handler,
			message,
		});

		expect(handler).not.toHaveBeenCalled();
		expect(result.error).toMatchObject({ type: "validation", status: 400 });
	});

	test("preserves handler results when no schema is supplied", async () => {
		const response = { error: undefined, data: undefined };
		const result = await runToolkitService({
			handler: async () => response,
			message,
		});

		expect(result).toBe(response);
	});

	test("converts handler exceptions after validation into service errors", async () => {
		const result = await runToolkitService({
			schema: z.number(),
			input: 42,
			handler: async () => {
				throw new Error("Upload failed");
			},
			message,
		});

		expect(result).toMatchObject({
			error: { type: "basic", status: 500 },
			data: undefined,
		});
	});
});

describe("toolkit document query normalization", () => {
	test("keeps object filters as top-level AND filters", () => {
		expect(
			normalizeDocumentQuery({
				filter: {
					_fullSlug: {
						value: "/about",
					},
				},
				include: ["bricks"],
			}),
		).toEqual({
			filter: {
				_fullSlug: {
					value: "/about",
				},
			},
			include: ["bricks"],
		});
	});

	test("flattens implicit and explicit relation document filters", () => {
		expect(
			normalizeDocumentQuery({
				filter: {
					_author: {
						_firstName: { value: "Will" },
						people: {
							_surname: { value: "Yallop" },
						},
					},
				},
			}),
		).toEqual({
			filter: {
				"_author._firstName": { value: "Will" },
				"_author.people._surname": { value: "Yallop" },
			},
		});
	});

	test("converts filter arrays into grouped OR filters", () => {
		expect(
			normalizeDocumentQuery({
				filter: [
					{
						_fullSlug: {
							value: "/",
						},
					},
					{
						_fullSlug: {
							value: "/about",
						},
						banner: {
							_title: {
								value: "About",
								operator: "contains",
							},
						},
					},
				],
			}),
		).toEqual({
			filterOr: [
				[
					{
						key: "_fullSlug",
						value: "/",
					},
				],
				[
					{
						key: "_fullSlug",
						value: "/about",
					},
					{
						key: "banner._title",
						value: "About",
						operator: "contains",
					},
				],
			],
		});
	});

	test("keeps pagination defaults while normalizing OR filter shorthand", () => {
		expect(
			normalizePaginatedDocumentQuery({
				filter: [
					{
						_fullSlug: {
							value: "/",
						},
					},
				],
			}),
		).toEqual({
			filterOr: [
				[
					{
						key: "_fullSlug",
						value: "/",
					},
				],
			],
			page: 1,
			perPage: 10,
		});
	});
});
