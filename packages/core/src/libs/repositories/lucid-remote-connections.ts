import type { LucidDatabase } from "../db/client/index.js";
import { lucidRemoteConnectionsTable } from "../db/tables/lucid-remote-connections.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class LucidRemoteConnectionsRepository extends StaticRepository<"lucid_remote_connections"> {
	constructor(db: LucidDatabase) {
		super(db, lucidRemoteConnectionsTable);
	}

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
