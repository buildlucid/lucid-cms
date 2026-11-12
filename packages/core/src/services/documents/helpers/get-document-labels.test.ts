import { beforeEach, describe, expect, test, vi } from "vitest";
import type { CollectionTableNames } from "../../../exports/types.js";
import defineCollection from "../../../libs/collection/define-collection.js";
import field from "../../../libs/collection/definitions/fields/field.js";
import { copy } from "../../../libs/i18n/index.js";
import type { DocumentBricksRepository } from "../../../libs/repositories/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getDocumentLabels from "./get-document-labels.js";

vi.mock(
	"../../../libs/collection/schema/runtime/runtime-schema-selectors.js",
	() => ({
		getDocumentFieldsTableSchema: vi.fn().mockResolvedValue({
			error: undefined,
			data: {
				columns: [{ name: "_status" }],
			},
		}),
	}),
);

describe("getDocumentLabels", () => {
	const tables = {
		document: "lucid_document_pages",
		version: "lucid_document_versions_pages",
		documentFields: "lucid_document_fields_pages",
	} as CollectionTableNames;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("uses select option labels for useAsLabel values, and falls back for versions without one", async () => {
		const collection = defineCollection({
			key: "pages",
			mode: "multiple",
			details: {
				labels: {
					singular: "Page",
					plural: "Pages",
				},
			},
			fields: [
				field.select("status", {
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
				}),
			],
		});
		const bricks = {
			selectColumnByVersionIds: vi.fn().mockResolvedValue({
				error: undefined,
				data: [
					{ document_version_id: 2, _status: null },
					{ document_version_id: 2, _status: "published" },
				],
			}),
		};

		const result = await getDocumentLabels({
			context: { translate: () => "Page" } as unknown as ServiceContext,
			bricks: bricks as unknown as DocumentBricksRepository,
			collection,
			tables,
			versions: [
				{ documentId: 1, versionId: 2 },
				{ documentId: 3, versionId: 4 },
			],
		});

		expect(result.error).toBeUndefined();
		expect(result.data).toEqual(["Published", "Page #3"]);
		expect(bricks.selectColumnByVersionIds).toHaveBeenCalledOnce();
	});
});
