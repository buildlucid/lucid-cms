import { type ExpressionBuilder, sql } from "kysely";
import type { GetMultipleQueryParams } from "../../schemas/releases.js";
import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder from "../db/query-builder/index.js";
import type {
	LucidReleaseDocuments,
	LucidReleases,
} from "../db/tables/index.js";
import { releasesTable } from "../db/tables/releases.js";
import type { LucidDB, Select } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export interface ReleaseSummaryQueryResponse
	extends Pick<
		Select<LucidReleases>,
		| "id"
		| "title"
		| "status"
		| "revision"
		| "approved_revision"
		| "scheduled_at"
		| "scheduled_timezone"
		| "failure"
		| "released_at"
		| "created_by"
		| "created_at"
		| "updated_at"
	> {
	documents: Array<
		Pick<
			Select<LucidReleaseDocuments>,
			"id" | "collection_key" | "document_id" | "source" | "source_version_id"
		> & { targets: Array<{ target: string }> }
	>;
	reviewers: Array<{ user_id: number }>;
}

/** Releases are visible to users who can read every included collection. */
type ReleaseAccess = {
	userId: number;
	/** Null skips the collection check, eg. for super admins. */
	collectionKeys: string[] | null;
};

export default class ReleasesRepository extends StaticRepository<"lucid_releases"> {
	constructor(db: LucidDatabase) {
		super(db, releasesTable);
	}

	/** Reads execution state with the same collection visibility as the release list. */
	async selectExecution(props: { id: number; access: ReleaseAccess }) {
		const query = this.db
			.selectFrom("lucid_releases")
			.leftJoin(
				"lucid_jobs",
				"lucid_jobs.job_id",
				"lucid_releases.execution_job_id",
			)
			.select([
				"lucid_releases.id",
				"lucid_jobs.job_id",
				"lucid_jobs.status",
				"lucid_jobs.available_at",
				"lucid_jobs.error_message",
				"lucid_releases.revision",
				"lucid_releases.failure",
				"lucid_jobs.created_by_user_id",
			])
			.where("lucid_releases.id", "=", props.id)
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
				access: ReleaseAccess;
				queryParams: GetMultipleQueryParams;
			}
		>,
	) {
		const { main, count } = queryBuilder.main(
			{
				main: this.db
					.selectFrom("lucid_releases")
					.where((eb) => this.accessible(eb, props.access)),
				count: this.db
					.selectFrom("lucid_releases")
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
									.selectFrom("lucid_release_documents")
									.select(sql.lit(1).as("one"))
									.whereRef(
										"lucid_release_documents.release_id",
										"=",
										"lucid_releases.id",
									)
									.where(
										"lucid_release_documents.collection_key",
										"=",
										String(filter.value),
									),
							),
						documentId: ({ eb, filter }) => {
							let documents = eb
								.selectFrom("lucid_release_documents")
								.select(sql.lit(1).as("one"))
								.whereRef(
									"lucid_release_documents.release_id",
									"=",
									"lucid_releases.id",
								)
								.where(
									"lucid_release_documents.document_id",
									"=",
									Number(filter.value),
								);
							const collectionKey =
								props.queryParams.filter?.collectionKey?.value;
							if (collectionKey !== undefined) {
								documents = documents.where(
									"lucid_release_documents.collection_key",
									"=",
									String(collectionKey),
								);
							}
							return eb.exists(documents);
						},
						approval: ({ eb, filter }) => {
							const approved = eb(
								"lucid_releases.approved_revision",
								"=",
								eb.ref("lucid_releases.revision"),
							);
							return filter.value === "approved"
								? approved
								: eb.or([
										eb("lucid_releases.approved_revision", "is", null),
										eb.not(approved),
									]);
						},
						failed: ({ eb, filter }) =>
							eb(
								"lucid_releases.failure",
								this.isTrue(filter.value) ? "is not" : "is",
								null,
							),
						scheduled: ({ eb, filter }) =>
							eb(
								"lucid_releases.scheduled_at",
								this.isTrue(filter.value) ? "is not" : "is",
								null,
							),
						assignedToMe: ({ eb, filter }) => {
							const assigned = eb.exists(
								eb
									.selectFrom("lucid_release_reviewers")
									.select(sql.lit(1).as("one"))
									.whereRef(
										"lucid_release_reviewers.release_id",
										"=",
										"lucid_releases.id",
									)
									.where(
										"lucid_release_reviewers.user_id",
										"=",
										props.access.userId,
									),
							);
							return this.isTrue(filter.value) ? assigned : eb.not(assigned);
						},
					},
				},
			},
		);
		const query = main.select((eb) => [
			"lucid_releases.id",
			"lucid_releases.title",
			"lucid_releases.status",
			"lucid_releases.revision",
			"lucid_releases.approved_revision",
			"lucid_releases.scheduled_at",
			"lucid_releases.scheduled_timezone",
			"lucid_releases.failure",
			"lucid_releases.released_at",
			"lucid_releases.created_by",
			"lucid_releases.created_at",
			"lucid_releases.updated_at",
			this.database.fn
				.jsonArrayFrom(
					eb
						.selectFrom("lucid_release_documents")
						.select([
							"id",
							"collection_key",
							"document_id",
							"source",
							"source_version_id",
						])
						.whereRef(
							"lucid_release_documents.release_id",
							"=",
							"lucid_releases.id",
						)
						.orderBy("lucid_release_documents.id", "asc")
						.select((eb) => [
							this.database.fn
								.jsonArrayFrom(
									eb
										.selectFrom("lucid_release_targets")
										.select("target")
										.whereRef(
											"lucid_release_targets.release_document_id",
											"=",
											"lucid_release_documents.id",
										),
								)
								.as("targets"),
						]),
				)
				.as("documents"),
			this.database.fn
				.jsonArrayFrom(
					eb
						.selectFrom("lucid_release_reviewers")
						.select("lucid_release_reviewers.user_id")
						.whereRef(
							"lucid_release_reviewers.release_id",
							"=",
							"lucid_releases.id",
						)
						.orderBy("lucid_release_reviewers.assigned_at", "asc"),
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
				"title",
				"status",
				"revision",
				"approved_revision",
				"scheduled_at",
				"scheduled_timezone",
				"failure",
				"released_at",
				"created_by",
				"created_at",
				"updated_at",
				"documents",
				"reviewers",
			],
		});
	}
	async selectOverview<V extends boolean = false>(
		props: QueryProps<V, { access: ReleaseAccess }>,
	) {
		const approved = sql<boolean>`lucid_releases.approved_revision = lucid_releases.revision`;
		const query = this.db
			.selectFrom("lucid_releases")
			.where("lucid_releases.status", "=", "open")
			.where((eb) => this.accessible(eb, props.access))
			.select((eb) => [
				sql<number>`sum(case when ${approved} then 0 else 1 end)`.as(
					"awaiting_approval",
				),
				sql<number>`sum(case when ${approved} then 1 else 0 end)`.as(
					"approved",
				),
				sql<number>`sum(case when ${approved} and lucid_releases.scheduled_at is not null then 1 else 0 end)`.as(
					"scheduled",
				),
				sql<number>`sum(case when lucid_releases.failure is not null then 1 else 0 end)`.as(
					"failed",
				),
				sql<number>`sum(case when ${eb.exists(
					eb
						.selectFrom("lucid_release_reviewers")
						.select(sql.lit(1).as("one"))
						.whereRef(
							"lucid_release_reviewers.release_id",
							"=",
							"lucid_releases.id",
						)
						.where("lucid_release_reviewers.user_id", "=", props.access.userId),
				)} and not (${approved}) then 1 else 0 end)`.as("assigned_to_me"),
			]);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectOverview",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
		});
	}
	/** Claims the release for one writer. Returns the number of rows claimed. */
	async lock(props: { id: number; token: string }) {
		const query = this.db
			.updateTable("lucid_releases")
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
			.updateTable("lucid_releases")
			.set({ lock_token: null })
			.where("id", "=", props.id)
			.where("lock_token", "=", props.token);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "unlock",
		});
		return exec.response;
	}
	/** Of the given releases, returns the open ones whose current revision is approved. */
	async selectApprovedIds(props: { ids: number[] }) {
		const query = this.db
			.selectFrom("lucid_releases")
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
			data: (exec.response.data ?? []).map((release) => release.id),
		};
	}
	/** Moves open releases to a new revision so any approval no longer applies. */
	async dismissApproval(props: { ids: number[] }) {
		const query = this.db
			.updateTable("lucid_releases")
			.set((eb) => ({
				revision: eb("revision", "+", 1),
				approved_revision: null,
				failure: null,
				failure_release_document_id: null,
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
	/** Finds releases affected by writes to their proposal or selected destinations. */
	async selectAffectedReleaseIds(props: {
		collectionKey: string;
		documentIds: number[];
		versionType?: string;
		versionId?: number;
	}) {
		let query = this.db
			.selectFrom("lucid_release_documents")
			.innerJoin(
				"lucid_releases",
				"lucid_releases.id",
				"lucid_release_documents.release_id",
			)
			.select("lucid_releases.id")
			.distinct()
			.where("lucid_releases.status", "=", "open")
			.where("lucid_release_documents.collection_key", "=", props.collectionKey)
			.where("lucid_release_documents.document_id", "in", props.documentIds);
		if (props.versionType !== undefined) {
			const versionType = props.versionType;
			query = query.where((eb) =>
				eb.exists(
					eb
						.selectFrom("lucid_release_targets")
						.select(sql.lit(1).as("one"))
						.whereRef(
							"lucid_release_targets.release_document_id",
							"=",
							"lucid_release_documents.id",
						)
						.where("lucid_release_targets.target", "=", versionType),
				),
			);
		}
		if (props.versionId !== undefined) {
			query = query.where(
				"lucid_release_documents.source_version_id",
				"=",
				props.versionId,
			);
		}

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectAffectedReleaseIds",
		});
		if (exec.response.error) return exec.response;

		return {
			error: undefined,
			data: (exec.response.data ?? []).map((release) => release.id),
		};
	}
	/** Finds the release that owns a proposal or snapshot, with what is needed to check access. */
	async selectVersionOwner(props: {
		collectionKey: string;
		documentId: number;
		versionId: number;
	}) {
		const query = this.db
			.selectFrom("lucid_release_documents")
			.innerJoin(
				"lucid_releases",
				"lucid_releases.id",
				"lucid_release_documents.release_id",
			)
			.select((eb) => [
				"lucid_releases.id",
				"lucid_releases.status",
				"lucid_releases.created_by",
				"lucid_release_documents.source",
				"lucid_release_documents.source_version_id",
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_release_documents as members")
							.select("members.collection_key")
							.whereRef("members.release_id", "=", "lucid_releases.id"),
					)
					.as("documents"),
			])
			.where("lucid_release_documents.collection_key", "=", props.collectionKey)
			.where("lucid_release_documents.document_id", "=", props.documentId)
			.where((eb) =>
				eb.or([
					eb("lucid_release_documents.source_version_id", "=", props.versionId),
					eb(
						"lucid_release_documents.approved_version_id",
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
		eb: ExpressionBuilder<LucidDB, "lucid_releases">,
		access: ReleaseAccess,
	) {
		if (access.collectionKeys === null) return sql<boolean>`1 = 1`;
		if (access.collectionKeys.length === 0) return sql<boolean>`1 = 0`;
		return eb.not(
			eb.exists(
				eb
					.selectFrom("lucid_release_documents")
					.select(sql.lit(1).as("one"))
					.whereRef(
						"lucid_release_documents.release_id",
						"=",
						"lucid_releases.id",
					)
					.where(
						"lucid_release_documents.collection_key",
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
