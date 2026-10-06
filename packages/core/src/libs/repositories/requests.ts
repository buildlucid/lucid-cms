import { type ExpressionBuilder, sql } from "kysely";
import type { GetMultipleQueryParams } from "../../schemas/requests.js";
import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder from "../db/query-builder/index.js";
import type {
	LucidRequestDocuments,
	LucidRequests,
} from "../db/tables/index.js";
import { requestsTable } from "../db/tables/requests.js";
import type { LucidDB, Select } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export interface RequestSummaryQueryResponse
	extends Pick<
		Select<LucidRequests>,
		| "id"
		| "type"
		| "title"
		| "status"
		| "revision"
		| "approved_revision"
		| "scheduled_at"
		| "scheduled_timezone"
		| "failure"
		| "completed_at"
		| "created_by"
		| "created_at"
		| "updated_at"
	> {
	documents: Array<
		Pick<
			Select<LucidRequestDocuments>,
			"id" | "collection_key" | "document_id" | "source" | "source_version_id"
		> & { targets: Array<{ target: string }> }
	>;
	reviewers: Array<{ user_id: number }>;
}

/** Requests are visible to users who can read every included collection. */
type RequestAccess = {
	userId: number;
	/** Null skips the collection check, eg. for super admins. */
	collectionKeys: string[] | null;
};

export default class RequestsRepository extends StaticRepository<"lucid_requests"> {
	constructor(db: LucidDatabase) {
		super(db, requestsTable);
	}

	/** Reads execution state with the same collection visibility as the request list. */
	async selectExecution(props: { id: number; access: RequestAccess }) {
		const query = this.db
			.selectFrom("lucid_requests")
			.leftJoin(
				"lucid_jobs",
				"lucid_jobs.job_id",
				"lucid_requests.execution_job_id",
			)
			.select([
				"lucid_requests.id",
				"lucid_jobs.job_id",
				"lucid_jobs.status",
				"lucid_jobs.available_at",
				"lucid_jobs.error_message",
				"lucid_requests.revision",
				"lucid_requests.failure",
				"lucid_jobs.created_by_user_id",
			])
			.where("lucid_requests.id", "=", props.id)
			.where((eb) => this.accessible(eb, props.access));
		const result = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectExecution",
		});
		return result.response;
	}

	async selectMultipleSummaries<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				access: RequestAccess;
				queryParams: GetMultipleQueryParams;
			}
		>,
	) {
		const { main, count } = queryBuilder.main(
			{
				main: this.db
					.selectFrom("lucid_requests")
					.where((eb) => this.accessible(eb, props.access)),
				count: this.db
					.selectFrom("lucid_requests")
					.select(sql<number>`count(*)`.as("count"))
					.where((eb) => this.accessible(eb, props.access)),
			},
			{
				queryParams: props.queryParams,
				database: this.dbAdapter.config,
				meta: {
					...this.config.queryConfig,
					customFilters: {
						collectionKey: ({ eb, filter }) =>
							eb.exists(
								eb
									.selectFrom("lucid_request_documents")
									.select(sql.lit(1).as("one"))
									.whereRef(
										"lucid_request_documents.request_id",
										"=",
										"lucid_requests.id",
									)
									.where(
										"lucid_request_documents.collection_key",
										"=",
										String(filter.value),
									),
							),
						documentId: ({ eb, filter }) => {
							let documents = eb
								.selectFrom("lucid_request_documents")
								.select(sql.lit(1).as("one"))
								.whereRef(
									"lucid_request_documents.request_id",
									"=",
									"lucid_requests.id",
								)
								.where(
									"lucid_request_documents.document_id",
									"=",
									Number(filter.value),
								);
							const collectionKey =
								props.queryParams.filter?.collectionKey?.value;
							if (collectionKey !== undefined) {
								documents = documents.where(
									"lucid_request_documents.collection_key",
									"=",
									String(collectionKey),
								);
							}
							return eb.exists(documents);
						},
						approval: ({ eb, filter }) => {
							const approved = eb(
								"lucid_requests.approved_revision",
								"=",
								eb.ref("lucid_requests.revision"),
							);
							return filter.value === "approved"
								? approved
								: eb.or([
										eb("lucid_requests.approved_revision", "is", null),
										eb.not(approved),
									]);
						},
						failed: ({ eb, filter }) =>
							eb(
								"lucid_requests.failure",
								this.isTrue(filter.value) ? "is not" : "is",
								null,
							),
						scheduled: ({ eb, filter }) =>
							eb(
								"lucid_requests.scheduled_at",
								this.isTrue(filter.value) ? "is not" : "is",
								null,
							),
						assignedToMe: ({ eb, filter }) => {
							const assigned = eb.exists(
								eb
									.selectFrom("lucid_request_reviewers")
									.select(sql.lit(1).as("one"))
									.whereRef(
										"lucid_request_reviewers.request_id",
										"=",
										"lucid_requests.id",
									)
									.where(
										"lucid_request_reviewers.user_id",
										"=",
										props.access.userId,
									),
							);
							return this.isTrue(filter.value) ? assigned : eb.not(assigned);
						},
						//* requests the user reviews or made, for their own to-do lists
						involvesMe: ({ eb, filter }) => {
							const involved = eb.or([
								eb("lucid_requests.created_by", "=", props.access.userId),
								eb.exists(
									eb
										.selectFrom("lucid_request_reviewers")
										.select(sql.lit(1).as("one"))
										.whereRef(
											"lucid_request_reviewers.request_id",
											"=",
											"lucid_requests.id",
										)
										.where(
											"lucid_request_reviewers.user_id",
											"=",
											props.access.userId,
										),
								),
							]);
							return this.isTrue(filter.value) ? involved : eb.not(involved);
						},
					},
				},
			},
		);
		const query = main.select((eb) => [
			"lucid_requests.id",
			"lucid_requests.type",
			"lucid_requests.title",
			"lucid_requests.status",
			"lucid_requests.revision",
			"lucid_requests.approved_revision",
			"lucid_requests.scheduled_at",
			"lucid_requests.scheduled_timezone",
			"lucid_requests.failure",
			"lucid_requests.completed_at",
			"lucid_requests.created_by",
			"lucid_requests.created_at",
			"lucid_requests.updated_at",
			this.database.fn
				.jsonArrayFrom(
					eb
						.selectFrom("lucid_request_documents")
						.select([
							"id",
							"collection_key",
							"document_id",
							"source",
							"source_version_id",
						])
						.whereRef(
							"lucid_request_documents.request_id",
							"=",
							"lucid_requests.id",
						)
						.orderBy("lucid_request_documents.id", "asc")
						.select((eb) => [
							this.database.fn
								.jsonArrayFrom(
									eb
										.selectFrom("lucid_request_targets")
										.select("target")
										.whereRef(
											"lucid_request_targets.request_document_id",
											"=",
											"lucid_request_documents.id",
										),
								)
								.as("targets"),
						]),
				)
				.as("documents"),
			this.database.fn
				.jsonArrayFrom(
					eb
						.selectFrom("lucid_request_reviewers")
						.select("lucid_request_reviewers.user_id")
						.whereRef(
							"lucid_request_reviewers.request_id",
							"=",
							"lucid_requests.id",
						)
						.orderBy("lucid_request_reviewers.assigned_at", "asc"),
				)
				.as("reviewers"),
		]);

		const countQuery = count?.$narrowType<{ count: number }>();
		const exec = await this.executeQuery(
			() => Promise.all([query.execute(), countQuery?.executeTakeFirst()]),
			{
				method: "selectMultipleSummaries",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple-count",
			select: [
				"id",
				"type",
				"title",
				"status",
				"revision",
				"approved_revision",
				"scheduled_at",
				"scheduled_timezone",
				"failure",
				"completed_at",
				"created_by",
				"created_at",
				"updated_at",
				"documents",
				"reviewers",
			],
		});
	}
	/** Counts open requests for each request type. Types without open requests are left out. */
	async selectOverview<V extends boolean = false>(
		props: QueryProps<V, { access: RequestAccess }>,
	) {
		const approved = sql<boolean>`lucid_requests.approved_revision = lucid_requests.revision`;
		const query = this.db
			.selectFrom("lucid_requests")
			.where("lucid_requests.status", "=", "open")
			.where((eb) => this.accessible(eb, props.access))
			.groupBy("lucid_requests.type")
			.select((eb) => [
				"lucid_requests.type",
				sql<number>`sum(case when ${approved} then 0 else 1 end)`.as(
					"awaiting_approval",
				),
				sql<number>`sum(case when ${approved} then 1 else 0 end)`.as(
					"approved",
				),
				sql<number>`sum(case when ${approved} and lucid_requests.scheduled_at is not null then 1 else 0 end)`.as(
					"scheduled",
				),
				sql<number>`sum(case when lucid_requests.failure is not null then 1 else 0 end)`.as(
					"failed",
				),
				sql<number>`sum(case when ${eb.exists(
					eb
						.selectFrom("lucid_request_reviewers")
						.select(sql.lit(1).as("one"))
						.whereRef(
							"lucid_request_reviewers.request_id",
							"=",
							"lucid_requests.id",
						)
						.where("lucid_request_reviewers.user_id", "=", props.access.userId),
				)} and not (${approved}) then 1 else 0 end)`.as("assigned_to_me"),
			]);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectOverview",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
		});
	}
	/** Claims the request for one writer. Returns the number of rows claimed. */
	async lock(props: { id: number; token: string }) {
		const query = this.db
			.updateTable("lucid_requests")
			.set({ lock_token: props.token })
			.where("id", "=", props.id)
			.where("lock_token", "is", null);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "lock",
		});
		if (exec.response.error) return exec.response;

		return {
			error: undefined,
			data: Number(exec.response.data?.numUpdatedRows ?? 0),
		};
	}
	async unlock(props: { id: number; token: string }) {
		const query = this.db
			.updateTable("lucid_requests")
			.set({ lock_token: null })
			.where("id", "=", props.id)
			.where("lock_token", "=", props.token);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "unlock",
		});
		return exec.response;
	}
	/** Of the given requests, returns the open ones whose current revision is approved. */
	async selectApprovedIds(props: { ids: number[] }) {
		const query = this.db
			.selectFrom("lucid_requests")
			.select(["id"])
			.where("id", "in", props.ids)
			.where("status", "=", "open")
			.whereRef("approved_revision", "=", "revision");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectApprovedIds",
		});
		if (exec.response.error) return exec.response;

		return {
			error: undefined,
			data: (exec.response.data ?? []).map((request) => request.id),
		};
	}
	/** Moves open requests to a new revision so any approval no longer applies. */
	async dismissApproval(props: { ids: number[] }) {
		const query = this.db
			.updateTable("lucid_requests")
			.set((eb) => ({
				revision: eb("revision", "+", 1),
				approved_revision: null,
				failure: null,
				failure_request_document_id: null,
				failure_target: null,
				approved_by: null,
				approved_at: null,
				execution_job_id: null,
				updated_at: new Date().toISOString(),
			}))
			.where("id", "in", props.ids)
			.where("status", "=", "open");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "dismissApproval",
		});
		return exec.response;
	}
	/** Finds requests affected by writes to their proposal or selected destinations. */
	async selectAffectedRequestIds(props: {
		collectionKey: string;
		documentIds: number[];
		versionType?: string;
		versionId?: number;
	}) {
		let query = this.db
			.selectFrom("lucid_request_documents")
			.innerJoin(
				"lucid_requests",
				"lucid_requests.id",
				"lucid_request_documents.request_id",
			)
			.select("lucid_requests.id")
			.distinct()
			.where("lucid_requests.status", "=", "open")
			.where("lucid_request_documents.collection_key", "=", props.collectionKey)
			.where("lucid_request_documents.document_id", "in", props.documentIds);
		if (props.versionType !== undefined) {
			const versionType = props.versionType;
			query = query.where((eb) =>
				eb.exists(
					eb
						.selectFrom("lucid_request_targets")
						.select(sql.lit(1).as("one"))
						.whereRef(
							"lucid_request_targets.request_document_id",
							"=",
							"lucid_request_documents.id",
						)
						.where("lucid_request_targets.target", "=", versionType),
				),
			);
		}
		if (props.versionId !== undefined) {
			query = query.where(
				"lucid_request_documents.source_version_id",
				"=",
				props.versionId,
			);
		}

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectAffectedRequestIds",
		});
		if (exec.response.error) return exec.response;

		return {
			error: undefined,
			data: (exec.response.data ?? []).map((request) => request.id),
		};
	}
	/** Finds the request that owns a proposal or snapshot, with what is needed to check access. */
	async selectVersionOwner(props: {
		collectionKey: string;
		documentId: number;
		versionId: number;
	}) {
		const query = this.db
			.selectFrom("lucid_request_documents")
			.innerJoin(
				"lucid_requests",
				"lucid_requests.id",
				"lucid_request_documents.request_id",
			)
			.select((eb) => [
				"lucid_requests.id",
				"lucid_requests.type",
				"lucid_requests.status",
				"lucid_requests.created_by",
				"lucid_request_documents.source",
				"lucid_request_documents.source_version_id",
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_request_documents as members")
							.select([
								"members.collection_key",
								"members.document_id",
								"members.source",
								"members.source_version_id",
							])
							.whereRef("members.request_id", "=", "lucid_requests.id"),
					)
					.as("documents"),
			])
			.where("lucid_request_documents.collection_key", "=", props.collectionKey)
			.where("lucid_request_documents.document_id", "=", props.documentId)
			.where((eb) =>
				eb.or([
					eb("lucid_request_documents.source_version_id", "=", props.versionId),
					eb(
						"lucid_request_documents.approved_version_id",
						"=",
						props.versionId,
					),
				]),
			);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectVersionOwner",
		});
		return exec.response;
	}

	private accessible(
		eb: ExpressionBuilder<LucidDB, "lucid_requests">,
		access: RequestAccess,
	) {
		if (access.collectionKeys === null) return sql<boolean>`1 = 1`;
		if (access.collectionKeys.length === 0) return sql<boolean>`1 = 0`;
		return eb.not(
			eb.exists(
				eb
					.selectFrom("lucid_request_documents")
					.select(sql.lit(1).as("one"))
					.whereRef(
						"lucid_request_documents.request_id",
						"=",
						"lucid_requests.id",
					)
					.where(
						"lucid_request_documents.collection_key",
						"not in",
						access.collectionKeys,
					),
			),
		);
	}

	private isTrue(value: unknown) {
		return value === true || value === "true" || value === "1" || value === 1;
	}
}
