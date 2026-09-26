import type { LucidDatabase } from "../db/client/index.js";
import { agentInputsTable } from "../db/tables/agent-inputs.js";
import StaticRepository from "./parents/static-repository.js";

//* statuses that are still to be delivered
const deliverable = ["pending", "claimed"] as const;

/** Durable input receipts. Claiming makes input immutable until its run acknowledges it. */
export default class AgentInputsRepository extends StaticRepository<"lucid_agent_inputs"> {
	constructor(db: LucidDatabase) {
		super(db, agentInputsTable);
	}

	/** A retried submission with the same id is ignored, so callers compare the stored text. */
	async submit(input: {
		id: string;
		conversationId: string;
		userId: number;
		text: string;
		targetRunId: string | null;
	}) {
		const result = await this.executeQuery(
			() =>
				this.db
					.insertInto("lucid_agent_inputs")
					.values({
						id: input.id,
						conversation_id: input.conversationId,
						user_id: input.userId,
						text: input.text,
						target_run_id: input.targetRunId,
						status: "pending",
						created_at: new Date().toISOString(),
					})
					.onConflict((conflict) => conflict.column("id").doNothing())
					.execute(),
			{ method: "submit" },
		);

		return result.response;
	}
	/** The conversation's undelivered input, in queue order. */
	async selectDeliverable(conversationId: string) {
		const result = await this.executeQuery(
			() =>
				this.db
					.selectFrom("lucid_agent_inputs")
					.selectAll()
					.where("conversation_id", "=", conversationId)
					.where("status", "in", deliverable)
					.orderBy("sequence", "asc")
					.execute(),
			{ method: "selectDeliverable" },
		);

		return result.response;
	}
	/** Cancels pending input: one message by id, or the whole queue. Claimed input is already on its way. */
	async cancel(props: { conversationId: string; id?: string }) {
		const result = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_agent_inputs")
					.set({ status: "cancelled" })
					.where("conversation_id", "=", props.conversationId)
					.where("status", "=", "pending")
					.$if(props.id !== undefined, (query) =>
						query.where("id", "=", props.id ?? ""),
					)
					.returning("id")
					.execute(),
			{ method: "cancel" },
		);
		if (result.response.error) return result.response;

		return { error: undefined, data: result.response.data.length > 0 };
	}
	/** Turns a user's queued message into a correction for the run it names. */
	async steer(props: {
		conversationId: string;
		userId: number;
		id: string;
		runId: string;
	}) {
		const result = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_agent_inputs")
					.set({ target_run_id: props.runId })
					.where("id", "=", props.id)
					.where("conversation_id", "=", props.conversationId)
					.where("user_id", "=", props.userId)
					.where("status", "=", "pending")
					.returning("id")
					.executeTakeFirst(),
			{ method: "steer" },
		);
		if (result.response.error) return result.response;

		return { error: undefined, data: result.response.data !== undefined };
	}
	/** Claims the first queued message while the conversation is idle. Retrying the claim resumes a partial start. */
	async claimNext(conversationId: string) {
		const result = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_agent_inputs")
					.set({ status: "claimed" })
					.where("conversation_id", "=", conversationId)
					.where("target_run_id", "is", null)
					.where("status", "in", deliverable)
					.where("sequence", "=", (eb) =>
						eb
							.selectFrom("lucid_agent_inputs as first")
							.select("first.sequence")
							.where("first.conversation_id", "=", conversationId)
							.where("first.status", "in", deliverable)
							.orderBy("first.sequence", "asc")
							.limit(1),
					)
					.where((eb) =>
						eb.exists(
							eb
								.selectFrom("lucid_agent_conversations")
								.select("id")
								.where("id", "=", conversationId)
								.where("active_run_id", "is", null)
								.where("queue_paused", "=", false),
						),
					)
					.returningAll()
					.executeTakeFirst(),
			{ method: "claimNext" },
		);

		return result.response;
	}
	/** The execution token fences steering just like checkpoint writes. */
	async claimSteering(runId: string, token: string) {
		const result = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_agent_inputs")
					.set({ status: "claimed" })
					.where("target_run_id", "=", runId)
					.where("status", "in", deliverable)
					.where((eb) =>
						eb.exists(
							eb
								.selectFrom("lucid_agent_runs")
								.select("id")
								.where("id", "=", runId)
								.where("execution_token", "=", token)
								.where("status", "=", "running"),
						),
					)
					.returningAll()
					.execute(),
			{ method: "claimSteering" },
		);
		if (result.response.error) return result.response;

		return {
			error: undefined,
			data: result.response.data.sort((a, b) => a.sequence - b.sequence),
		};
	}
	async acknowledge(ids: string[]) {
		if (!ids.length) return { error: undefined, data: undefined };
		const result = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_agent_inputs")
					.set({ status: "consumed" })
					.where("id", "in", ids)
					.where("status", "=", "claimed")
					.execute(),
			{ method: "acknowledge" },
		);
		if (result.response.error) return result.response;

		return { error: undefined, data: undefined };
	}
	/** A late steer becomes a follow-up, never steering a different run. */
	async defer(id: string) {
		const result = await this.executeQuery(
			() =>
				this.db
					.updateTable("lucid_agent_inputs")
					.set({ target_run_id: null, status: "pending" })
					.where("id", "=", id)
					.where("status", "in", deliverable)
					.execute(),
			{ method: "defer" },
		);

		return result.response;
	}
	/** Conversations whose input can make progress. A paused queue waits for the user, so it is skipped. */
	async selectRecoverable() {
		const result = await this.executeQuery(
			() =>
				this.db
					.selectFrom("lucid_agent_inputs as input")
					.innerJoin(
						"lucid_agent_conversations as conversation",
						"conversation.id",
						"input.conversation_id",
					)
					.leftJoin(
						"lucid_agent_runs as target",
						"target.id",
						"input.target_run_id",
					)
					.select("input.conversation_id")
					.distinct()
					.where("input.status", "in", deliverable)
					.where((eb) =>
						eb.or([
							//* a steer whose run can no longer take it, or is waiting on a person
							eb.and([
								eb("input.target_run_id", "is not", null),
								eb.or([
									eb("target.id", "is", null),
									eb("target.status", "in", [
										"waiting",
										"completed",
										"failed",
										"cancelled",
									]),
								]),
							]),
							//* a follow-up claimed before its run started
							eb.and([
								eb("input.target_run_id", "is", null),
								eb("input.status", "=", "claimed"),
							]),
							//* the first queued message of an idle conversation
							eb.and([
								eb("conversation.active_run_id", "is", null),
								eb("conversation.queue_paused", "=", false),
								eb.not(
									eb.exists(
										eb
											.selectFrom("lucid_agent_inputs as earlier")
											.select("earlier.id")
											.whereRef(
												"earlier.conversation_id",
												"=",
												"input.conversation_id",
											)
											.whereRef("earlier.sequence", "<", "input.sequence")
											.where("earlier.status", "in", deliverable),
									),
								),
							]),
						]),
					)
					.limit(50)
					.execute(),
			{ method: "selectRecoverable" },
		);

		return result.response;
	}
}
