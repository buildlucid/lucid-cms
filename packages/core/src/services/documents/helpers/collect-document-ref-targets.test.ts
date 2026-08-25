import { describe, expect, it } from "vitest";
import type { DocumentQueryResponse } from "../../../libs/repositories/documents.js";
import collectDocumentRefTargets from "./collect-document-ref-targets.js";

const document = {
	id: 1,
	collection_key: "page",
	collection_migration_id: 1,
	order: null,
	is_deleted: false,
	is_deleted_at: null,
	deleted_by: 1,
	created_by: 10,
	created_at: "2026-08-21T10:00:00.000Z",
	updated_by: 20,
	updated_at: "2026-08-21T11:00:00.000Z",
	workflow_updated_by: 40,
	workflow_assignees: [
		{
			id: 1,
			workflow_id: 1,
			user_id: 50,
			assigned_by: 60,
			assigned_at: "2026-08-21T10:30:00.000Z",
		},
	],
	versions: [
		{
			id: 1,
			collection_key: "page",
			collection_migration_id: 1,
			document_id: 1,
			type: "latest",
			promoted_from: null,
			content_id: "content-id",
			created_by: 30,
			updated_by: null,
			created_at: "2026-08-21T10:00:00.000Z",
			updated_at: null,
		},
	],
} satisfies DocumentQueryResponse;

const workflow = {
	stage: "review",
	assignees: [
		{
			id: 2,
			userId: 80,
			assignedBy: 90,
			assignedAt: "2026-08-21T11:30:00.000Z",
		},
	],
	createdAt: "2026-08-21T10:00:00.000Z",
	updatedAt: "2026-08-21T11:30:00.000Z",
	updatedBy: 70,
};

const getTargetIds = (includeMeta: boolean) =>
	collectDocumentRefTargets({
		documents: [document, document],
		includeMeta,
		workflows: [workflow],
	}).map((target) => target.value);

describe("collectDocumentRefTargets", () => {
	it("contributes deduplicated metadata and workflow user targets", () => {
		expect(getTargetIds(true)).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90]);
	});

	it("omits document metadata when the content response excludes it", () => {
		expect(getTargetIds(false)).toEqual([40, 50, 60, 70, 80, 90]);
	});
});
