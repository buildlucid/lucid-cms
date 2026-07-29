import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type { KyselyDB } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class LucidRemoteConnectionsRepository extends StaticRepository<"lucid_remote_connections"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_remote_connections");
	}
	tableSchema = z.object({
		id: z.number(),
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

	// ----------------------------------------
	// queries

	/** Creates the singleton connection row if absent. */
	async getOrCreate<V extends boolean = false>(props: QueryProps<V, object>) {
		const exec = await this.executeQuery(
			async () => {
				const inserted = await this.db
					.insertInto("lucid_remote_connections")
					.values({
						id: 1,
						status: "disconnected",
						display: null,
					})
					.onConflict((conflict) => conflict.column("id").doNothing())
					.returningAll()
					.executeTakeFirst();
				if (inserted) return inserted;

				return this.db
					.selectFrom("lucid_remote_connections")
					.selectAll()
					.where("id", "=", 1)
					.executeTakeFirst();
			},
			{ method: "getOrCreate" },
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			selectAll: true,
		});
	}

	/**
	 * Atomically consumes a pending flow. Comparing both digest and ciphertext
	 * prevents concurrent callbacks from claiming the same authorization.
	 */
	async claimPending<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				id: number;
				pendingStateHash: string;
				pendingEncrypted: string;
			}
		>,
	) {
		const query = this.db
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
			.returning(["id"]);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "claimPending",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: ["id"],
		});
	}
}
