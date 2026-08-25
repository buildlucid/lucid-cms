import type { DocumentWorkflow } from "@lucidcms/types";
import { usersTable } from "../../../libs/db/tables/index.js";
import type { RefTarget } from "../../../libs/refs/types.js";
import type { DocumentQueryResponse } from "../../../libs/repositories/documents.js";

const addUserId = (ids: Set<number>, value: number | null | undefined) => {
	if (typeof value === "number") ids.add(value);
};

/** Contributes refs for built-in user IDs exposed by document responses. */
const collectDocumentRefTargets = (props: {
	documents: DocumentQueryResponse[];
	includeMeta: boolean;
	workflows?: Array<DocumentWorkflow | null | undefined>;
}): RefTarget[] => {
	const userIds = new Set<number>();

	for (const document of props.documents) {
		if (props.includeMeta) {
			addUserId(userIds, document.created_by);
			addUserId(userIds, document.updated_by);
			for (const version of document.versions ?? []) {
				addUserId(userIds, version.created_by);
			}
		}

		addUserId(userIds, document.workflow_updated_by);
		for (const assignee of document.workflow_assignees ?? []) {
			addUserId(userIds, assignee.user_id);
			addUserId(userIds, assignee.assigned_by);
		}
	}

	for (const workflow of props.workflows ?? []) {
		addUserId(userIds, workflow?.updatedBy);
		for (const assignee of workflow?.assignees ?? []) {
			addUserId(userIds, assignee.userId);
			addUserId(userIds, assignee.assignedBy);
		}
	}

	return Array.from(userIds, (value) => ({
		resource: "users",
		table: usersTable.name,
		value,
	}));
};

export default collectDocumentRefTargets;
