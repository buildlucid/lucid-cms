import type { DocumentWorkflow } from "@lucidcms/types";
import {
	agentAttributionsTable,
	usersTable,
} from "../../../libs/db/tables/index.js";
import type { RefTarget } from "../../../libs/refs/types.js";
import type { DocumentQueryResponse } from "../../../libs/repositories/documents.js";

const addUserId = (ids: Set<number>, value: number | null | undefined) => {
	if (typeof value === "number") ids.add(value);
};

const addRunId = (ids: Set<string>, value: string | null | undefined) => {
	if (typeof value === "string") ids.add(value);
};

/** Contributes refs for the built-in user and agent run IDs exposed by document responses. */
const collectDocumentRefTargets = (props: {
	documents: DocumentQueryResponse[];
	includeMeta: boolean;
	workflows?: Array<DocumentWorkflow | null | undefined>;
}): RefTarget[] => {
	const userIds = new Set<number>();
	const runIds = new Set<string>();

	for (const document of props.documents) {
		if (props.includeMeta) {
			addUserId(userIds, document.created_by);
			addUserId(userIds, document.updated_by);
			addRunId(runIds, document.created_by_run_id);
			addRunId(runIds, document.updated_by_run_id);
			//* the version read, which may be an older revision than any listed below
			addUserId(userIds, document.version_created_by);
			addRunId(runIds, document.version_created_by_run_id);
			for (const version of document.versions ?? []) {
				addUserId(userIds, version.created_by);
				addRunId(runIds, version.created_by_run_id);
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

	return [
		...Array.from(userIds, (value) => ({
			resource: "users" as const,
			table: usersTable.name,
			value,
		})),
		...Array.from(runIds, (value) => ({
			resource: "agents" as const,
			table: agentAttributionsTable.name,
			value,
		})),
	];
};

export default collectDocumentRefTargets;
