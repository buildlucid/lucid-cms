import type { LucidDatabase } from "../db/client/index.js";
import { documentHoldsTable } from "../db/tables/document-holds.js";
import StaticRepository from "./parents/static-repository.js";

type HoldTarget = {
	collectionKey: string;
	documentId: number;
	/** `latest`, or `request:{id}` for a request's proposal. */
	target: string;
};

/** Claims document versions through conditional writes so concurrent tabs cannot both hold the same version. */
export default class DocumentHoldsRepository extends StaticRepository<"lucid_document_holds"> {
	constructor(db: LucidDatabase) {
		super(db, documentHoldsTable);
	}

	/** Keeps a tab's hold alive, reporting whether it still holds the target. */
	async refresh(props: HoldTarget & { tabId: string; now: string }) {
		const query = this.db
			.updateTable("lucid_document_holds")
			.set({ seen_at: props.now })
			.where("collection_key", "=", props.collectionKey)
			.where("document_id", "=", props.documentId)
			.where("target", "=", props.target)
			.where("tab_id", "=", props.tabId)
			.returning("id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "refresh",
		});
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
	/** Claims an unheld target, reporting whether the claim succeeded. */
	async claimFree(
		props: HoldTarget & { tabId: string; userId: number; now: string },
	) {
		const query = this.db
			.insertInto("lucid_document_holds")
			.values({
				collection_key: props.collectionKey,
				document_id: props.documentId,
				target: props.target,
				tab_id: props.tabId,
				user_id: props.userId,
				held_at: props.now,
				seen_at: props.now,
			})
			.onConflict((conflict) => conflict.doNothing())
			.returning("id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "claimFree",
		});
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
	/** Claims another tab's target after its heartbeat expires or during takeover, reporting whether the claim succeeded. */
	async claimHeld(
		props: HoldTarget & {
			tabId: string;
			userId: number;
			now: string;
			/** Heartbeat cutoff for claiming stale holds, omitted to take over a live hold. */
			staleBefore?: string;
		},
	) {
		const query = this.db
			.updateTable("lucid_document_holds")
			.set({
				tab_id: props.tabId,
				user_id: props.userId,
				held_at: props.now,
				seen_at: props.now,
			})
			.where("collection_key", "=", props.collectionKey)
			.where("document_id", "=", props.documentId)
			.where("target", "=", props.target)
			.$if(props.staleBefore !== undefined, (query) =>
				query.where("seen_at", "<", props.staleBefore ?? ""),
			)
			.returning("id");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "claimHeld",
		});
		if (exec.response.error) return exec.response;

		return { error: undefined, data: exec.response.data !== undefined };
	}
	/** Live holds on a document, or on one of its versions when `target` is set. */
	async selectLive(
		props: Omit<HoldTarget, "target"> & { target?: string; seenAfter: string },
	) {
		let query = this.db
			.selectFrom("lucid_document_holds")
			.select(["target", "tab_id", "user_id", "held_at"])
			.where("collection_key", "=", props.collectionKey)
			.where("document_id", "=", props.documentId)
			.where("seen_at", ">=", props.seenAfter);
		if (props.target !== undefined) {
			query = query.where("target", "=", props.target);
		}

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectLive",
		});

		return exec.response;
	}
}
