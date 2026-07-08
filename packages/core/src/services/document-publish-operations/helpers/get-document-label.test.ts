import { beforeEach, describe, expect, test, vi } from "vitest";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { copy } from "../../../libs/i18n/index.js";
import type { DocumentBricksRepository } from "../../../libs/repositories/index.js";
import type { CollectionTableNames } from "../../../types.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getDocumentLabel from "./get-document-label.js";

vi.mock(
	"../../../libs/collection/schema/runtime/runtime-schema-selectors.js",
	() => ({
		getDocumentFieldsTableSchema: vi.fn().mockResolvedValue({
			error: undefined,
			data: {
				columns: [],
			},
		}),
	}),
);

describe("getDocumentLabel", () => {
	const tables = {
		document: "lucid_document_pages",
		version: "lucid_document_versions_pages",
		documentFields: "lucid_document_fields_pages",
	} as CollectionTableNames;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("uses select option labels for useAsLabel values", async () => {
		const collection = new CollectionBuilder("pages", {
			mode: "multiple",
			details: {
				name: "Pages",
				singularName: "Page",
			},
		}).addSelect("status", {
			showInList: true,
			useAsLabel: true,
			options: [
				{
					value: "draft",
					label: "Draft",
				},
				{
					value: "published",
					label: copy("admin:tests.status.published", {
						defaultMessage: "Published",
					}),
				},
			],
		});
		const bricks = {
			selectMultipleByVersionId: vi.fn().mockResolvedValue({
				error: undefined,
				data: {
					[tables.documentFields]: [
						{
							_status: "published",
						},
					],
				},
			}),
		};

		const result = await getDocumentLabel({
			context: {} as ServiceContext,
			bricks: bricks as unknown as DocumentBricksRepository,
			collection,
			tables,
			operation: {
				document_id: 1,
				source_version_id: 2,
			},
		});

		expect(result.error).toBeUndefined();
		expect(result.data).toBe("Published");
	});
});
