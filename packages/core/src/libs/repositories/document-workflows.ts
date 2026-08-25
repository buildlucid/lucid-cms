import type { LucidDatabase } from "../db/client/index.js";
import { documentWorkflowsTable } from "../db/tables/document-workflows.js";
import type {
	LucidDocumentWorkflowAssignees,
	LucidDocumentWorkflows,
} from "../db/tables/index.js";
import type { Select } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export interface DocumentWorkflowDetailedQueryResponse
	extends Select<LucidDocumentWorkflows> {
	assignees: Array<Select<LucidDocumentWorkflowAssignees>>;
}

export default class DocumentWorkflowsRepository extends StaticRepository<"lucid_document_workflows"> {
	constructor(db: LucidDatabase) {
		super(db, documentWorkflowsTable);
	}

	async selectSingleDetailed<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				collectionKey: string;
				documentId: number;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_document_workflows")
			.where("collection_key", "=", props.collectionKey)
			.where("document_id", "=", props.documentId)
			.selectAll("lucid_document_workflows")
			.select((eb) => [
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_document_workflow_assignees")
							.select([
								"lucid_document_workflow_assignees.id",
								"lucid_document_workflow_assignees.workflow_id",
								"lucid_document_workflow_assignees.user_id",
								"lucid_document_workflow_assignees.assigned_by",
								"lucid_document_workflow_assignees.assigned_at",
							])
							.whereRef(
								"lucid_document_workflow_assignees.workflow_id",
								"=",
								"lucid_document_workflows.id",
							)
							.orderBy("lucid_document_workflow_assignees.assigned_at", "asc"),
					)
					.as("assignees"),
			]);

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as Promise<
					DocumentWorkflowDetailedQueryResponse | undefined
				>,
			{
				method: "selectSingleDetailed",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
		});
	}
}
