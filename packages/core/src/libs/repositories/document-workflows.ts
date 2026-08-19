import type { LucidDatabase } from "../db/client/index.js";
import { documentWorkflowsTable } from "../db/tables/document-workflows.js";
import type {
	LucidDocumentWorkflowAssignees,
	LucidDocumentWorkflows,
} from "../db/tables/index.js";
import type { Select } from "../db/types.js";
import type { MediaPosterPropsT } from "../formatters/media.js";
import { activeMediaCropSelect } from "./helpers/media-selects.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export interface DocumentWorkflowDetailedQueryResponse
	extends Select<LucidDocumentWorkflows> {
	assignees: Array<
		Select<LucidDocumentWorkflowAssignees> & {
			email?: string | null;
			username?: string | null;
			first_name?: string | null;
			last_name?: string | null;
			profile_picture?: MediaPosterPropsT[];
		}
	>;
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
							.leftJoin(
								"lucid_users",
								"lucid_users.id",
								"lucid_document_workflow_assignees.user_id",
							)
							.select((userEb) => [
								"lucid_document_workflow_assignees.id",
								"lucid_document_workflow_assignees.workflow_id",
								"lucid_document_workflow_assignees.user_id",
								"lucid_document_workflow_assignees.assigned_by",
								"lucid_document_workflow_assignees.assigned_at",
								"lucid_users.email",
								"lucid_users.username",
								"lucid_users.first_name",
								"lucid_users.last_name",
								this.database.fn
									.jsonArrayFrom(
										userEb
											.selectFrom("lucid_media")
											.select((mediaEb) => [
												"lucid_media.id",
												"lucid_media.key",
												"lucid_media.origin",
												"lucid_media.type",
												"lucid_media.mime_type",
												"lucid_media.file_extension",
												"lucid_media.file_name",
												"lucid_media.file_size",
												"lucid_media.width",
												"lucid_media.height",
												"lucid_media.duration",
												"lucid_media.focal_x",
												"lucid_media.focal_y",
												"lucid_media.blur_hash",
												"lucid_media.average_color",
												"lucid_media.base64",
												"lucid_media.is_dark",
												"lucid_media.is_light",
												activeMediaCropSelect(this.database, "lucid_media.id"),
												this.database.fn
													.jsonArrayFrom(
														mediaEb
															.selectFrom("lucid_media_translations")
															.select([
																"lucid_media_translations.title",
																"lucid_media_translations.alt",
																"lucid_media_translations.description",
																"lucid_media_translations.summary",
																"lucid_media_translations.locale_code",
															])
															.whereRef(
																"lucid_media_translations.media_id",
																"=",
																"lucid_media.id",
															),
													)
													.as("translations"),
											])
											.whereRef(
												"lucid_media.id",
												"=",
												"lucid_users.profile_picture_media_id",
											)
											.where(
												"lucid_media.is_deleted",
												"=",
												this.dbAdapter.getDefault("boolean", "false"),
											),
									)
									.as("profile_picture"),
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

	async selectMultipleDetailedByDocumentIds<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				collectionKey: string;
				documentIds: number[];
			}
		>,
	) {
		if (props.documentIds.length === 0) {
			return {
				error: undefined,
				data: [],
			};
		}

		const query = this.db
			.selectFrom("lucid_document_workflows")
			.where("collection_key", "=", props.collectionKey)
			.where("document_id", "in", props.documentIds)
			.selectAll("lucid_document_workflows")
			.select((eb) => [
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_document_workflow_assignees")
							.leftJoin(
								"lucid_users",
								"lucid_users.id",
								"lucid_document_workflow_assignees.user_id",
							)
							.select((userEb) => [
								"lucid_document_workflow_assignees.id",
								"lucid_document_workflow_assignees.workflow_id",
								"lucid_document_workflow_assignees.user_id",
								"lucid_document_workflow_assignees.assigned_by",
								"lucid_document_workflow_assignees.assigned_at",
								"lucid_users.email",
								"lucid_users.username",
								"lucid_users.first_name",
								"lucid_users.last_name",
								this.database.fn
									.jsonArrayFrom(
										userEb
											.selectFrom("lucid_media")
											.select((mediaEb) => [
												"lucid_media.id",
												"lucid_media.key",
												"lucid_media.origin",
												"lucid_media.type",
												"lucid_media.mime_type",
												"lucid_media.file_extension",
												"lucid_media.file_name",
												"lucid_media.file_size",
												"lucid_media.width",
												"lucid_media.height",
												"lucid_media.duration",
												"lucid_media.focal_x",
												"lucid_media.focal_y",
												"lucid_media.blur_hash",
												"lucid_media.average_color",
												"lucid_media.base64",
												"lucid_media.is_dark",
												"lucid_media.is_light",
												activeMediaCropSelect(this.database, "lucid_media.id"),
												this.database.fn
													.jsonArrayFrom(
														mediaEb
															.selectFrom("lucid_media_translations")
															.select([
																"lucid_media_translations.title",
																"lucid_media_translations.alt",
																"lucid_media_translations.description",
																"lucid_media_translations.summary",
																"lucid_media_translations.locale_code",
															])
															.whereRef(
																"lucid_media_translations.media_id",
																"=",
																"lucid_media.id",
															),
													)
													.as("translations"),
											])
											.whereRef(
												"lucid_media.id",
												"=",
												"lucid_users.profile_picture_media_id",
											)
											.where(
												"lucid_media.is_deleted",
												"=",
												this.dbAdapter.getDefault("boolean", "false"),
											),
									)
									.as("profile_picture"),
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
			() => query.execute() as Promise<DocumentWorkflowDetailedQueryResponse[]>,
			{
				method: "selectMultipleDetailedByDocumentIds",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
		});
	}
}
