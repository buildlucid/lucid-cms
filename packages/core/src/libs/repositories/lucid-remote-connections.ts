import { sql } from "kysely";
import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type {
	KyselyDB,
	LucidRemoteConnections,
	Select,
	Update,
} from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

const connectionColumns = [
	"id",
	"scope_key",
	"tenant_key",
	"status",
	"registration_encrypted",
	"grant_encrypted",
	"pending_encrypted",
	"pending_state_hash",
	"pending_expires_at",
	"display",
	"last_attempt_at",
	"last_verified_at",
	"error_key",
	"created_at",
	"updated_at",
] as const satisfies (keyof Select<LucidRemoteConnections>)[];

export type LucidRemoteConnectionRow = Pick<
	Select<LucidRemoteConnections>,
	(typeof connectionColumns)[number]
>;

export default class LucidRemoteConnectionsRepository extends StaticRepository<"lucid_remote_connections"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_remote_connections");
	}

	tableSchema = z.object({
		id: z.number(),
		scope_key: z.string(),
		tenant_key: z.string().nullable(),
		status: z.enum(["connected", "disconnected", "revoked"]),
		registration_encrypted: z.string().nullable(),
		grant_encrypted: z.string().nullable(),
		pending_encrypted: z.string().nullable(),
		pending_state_hash: z.string().nullable(),
		pending_expires_at: z.number().nullable(),
		display: z.record(z.string(), z.unknown()).nullable(),
		last_attempt_at: z.number().nullable(),
		last_verified_at: z.number().nullable(),
		error_key: z.string().nullable(),
		created_at: z.union([z.string(), z.date()]),
		updated_at: z.union([z.string(), z.date()]),
	});

	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		scope_key: this.dbAdapter.getDataType("text"),
		tenant_key: this.dbAdapter.getDataType("text"),
		status: this.dbAdapter.getDataType("text"),
		registration_encrypted: this.dbAdapter.getDataType("text"),
		grant_encrypted: this.dbAdapter.getDataType("text"),
		pending_encrypted: this.dbAdapter.getDataType("text"),
		pending_state_hash: this.dbAdapter.getDataType("char", 64),
		pending_expires_at: this.dbAdapter.getDataType("integer"),
		display: this.dbAdapter.getDataType("json"),
		last_attempt_at: this.dbAdapter.getDataType("integer"),
		last_verified_at: this.dbAdapter.getDataType("integer"),
		error_key: this.dbAdapter.getDataType("text"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};

	queryConfig = undefined;

	/**
	 * Resolves the row visible to a request using tenant override then global
	 * fallback semantics. Unscoped requests can resolve any connection.
	 */
	async selectEffective(tenantKey: string | null) {
		const exec = await this.executeQuery(
			async () => {
				let query = this.db
					.selectFrom("lucid_remote_connections")
					.select(connectionColumns);

				if (tenantKey) {
					query = query
						.where((eb) =>
							eb.or([
								eb("tenant_key", "=", tenantKey),
								eb("tenant_key", "is", null),
							]),
						)
						.orderBy(
							sql<number>`case when tenant_key = ${tenantKey} then 0 else 1 end`,
						);
				}

				return query.orderBy("id", "asc").executeTakeFirst();
			},
			{ method: "selectEffective" },
		);
		return exec.response;
	}

	/** Finds a pending flow by its keyed state digest without tenant input. */
	async selectByPendingStateHash(pendingStateHash: string) {
		return this.selectSingle({
			select: [...connectionColumns],
			where: [
				{
					key: "pending_state_hash",
					operator: "=",
					value: pendingStateHash,
				},
			],
		});
	}

	/**
	 * Creates a scope row if absent, then returns the canonical row. The unique
	 * scope key makes this safe across concurrent connect requests.
	 */
	async ensureScope(props: { scopeKey: string; tenantKey: string | null }) {
		const exec = await this.executeQuery(
			async () => {
				const inserted = await this.db
					.insertInto("lucid_remote_connections")
					.values({
						scope_key: props.scopeKey,
						tenant_key: props.tenantKey,
						status: "disconnected",
						display: null,
					})
					.onConflict((conflict) => conflict.column("scope_key").doNothing())
					.returning(connectionColumns)
					.executeTakeFirst();
				if (inserted) return inserted;

				return this.db
					.selectFrom("lucid_remote_connections")
					.select(connectionColumns)
					.where("scope_key", "=", props.scopeKey)
					.executeTakeFirst();
			},
			{ method: "ensureScope" },
		);
		return exec.response;
	}

	/**
	 * Atomically consumes a pending flow. Comparing both digest and ciphertext
	 * prevents concurrent callbacks from claiming the same authorization.
	 */
	async claimPending(props: {
		id: number;
		pendingStateHash: string;
		pendingEncrypted: string;
	}) {
		const exec = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_remote_connections")
					.set({
						pending_encrypted: null,
						pending_state_hash: null,
						pending_expires_at: null,
						updated_at: new Date().toISOString(),
					})
					.where("id", "=", props.id)
					.where("pending_state_hash", "=", props.pendingStateHash)
					.where("pending_encrypted", "=", props.pendingEncrypted)
					.executeTakeFirst(),
			{ method: "claimPending" },
		);
		if (exec.response.error) return exec.response;
		return {
			error: undefined,
			data: Number(exec.response.data.numUpdatedRows ?? 0n) === 1,
		};
	}

	/** Updates a connection row by internal identity. */
	updateById(id: number, data: Partial<Update<LucidRemoteConnections>>) {
		return this.updateSingle({
			data,
			where: [{ key: "id", operator: "=", value: id }],
			returning: ["id"],
		});
	}

	/** Returns every row once for cron target resolution and deduplication. */
	selectAll() {
		return this.selectMultiple({
			select: [...connectionColumns],
			orderBy: [{ column: "id", direction: "asc" }],
		});
	}
}
