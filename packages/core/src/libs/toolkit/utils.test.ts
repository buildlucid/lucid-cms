import { describe, expect, test } from "vitest";
import {
	normalizeDocumentQuery,
	normalizePaginatedDocumentQuery,
} from "./utils.js";

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
								operator: "ilike",
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
						operator: "ilike",
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
