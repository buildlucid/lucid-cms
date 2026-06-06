import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type {
	KyselyDB,
	LucidDocumentWorkflowAssignees,
	LucidDocumentWorkflows,
	Select,
} from "../db/types.js";
import type { MediaPosterPropsT } from "../formatters/media.js";
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
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_document_workflows");
	}
	tableSchema = z.object({
		id: z.number(),
		collection_key: z.string(),
		document_id: z.number(),
		stage_key: z.string(),
		created_by: z.number().nullable(),
		updated_by: z.number().nullable(),
		created_at: z.union([z.string(), z.date()]),
		updated_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		collection_key: this.dbAdapter.getDataType("text"),
		document_id: this.dbAdapter.getDataType("integer"),
		stage_key: this.dbAdapter.getDataType("text"),
		created_by: this.dbAdapter.getDataType("integer"),
		updated_by: this.dbAdapter.getDataType("integer"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;

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
				this.dbAdapter
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
								this.dbAdapter
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
												"lucid_media.focal_x",
												"lucid_media.focal_y",
												"lucid_media.blur_hash",
												"lucid_media.average_color",
												"lucid_media.base64",
												"lucid_media.is_dark",
												"lucid_media.is_light",
												this.dbAdapter
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
				this.dbAdapter
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
								this.dbAdapter
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
												"lucid_media.focal_x",
												"lucid_media.focal_y",
												"lucid_media.blur_hash",
												"lucid_media.average_color",
												"lucid_media.base64",
												"lucid_media.is_dark",
												"lucid_media.is_light",
												this.dbAdapter
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
