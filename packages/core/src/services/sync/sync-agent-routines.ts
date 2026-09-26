import { randomUUID } from "node:crypto";
import constants from "../../constants/constants.js";
import logger from "../../libs/logger/index.js";
import { AgentRoutinesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import nextRoutineOccurrence from "../agent/helpers/next-routine-occurrence.js";

/**
 * Syncs routines defined in code with the database. New routines start enabled,
 * changed ones are updated and rescheduled, and removed ones are deleted while
 * their past chats are kept. Whether a routine is paused is kept between syncs.
 */
const syncAgentRoutines: ServiceFn<[], undefined> = async (context) => {
	const AgentRoutines = new AgentRoutinesRepository(context.db);

	const existing = await AgentRoutines.selectMultiple({
		select: [
			"id",
			"agent_key",
			"key",
			"name",
			"instructions",
			"cron",
			"timezone",
			"enabled",
		],
		where: [{ key: "source", operator: "=", value: "code" }],
		validation: { enabled: true },
	});
	if (existing.error) return existing;

	const defined = context.config.ai.agents.flatMap((agent) =>
		agent.routines.map((routine) => ({ agentKey: agent.key, routine })),
	);
	const now = new Date().toISOString();

	for (const { agentKey, routine } of defined) {
		const current = existing.data.find(
			(row) => row.agent_key === agentKey && row.key === routine.key,
		);
		const next = nextRoutineOccurrence(routine.schedule);
		if (next.error) return next;

		if (!current) {
			logger.debug({
				message: `Syncing new agent routine to the DB: ${agentKey}:${routine.key}`,
				scope: constants.logScopes.sync,
			});

			const created = await AgentRoutines.createSingle({
				data: {
					id: randomUUID(),
					agent_key: agentKey,
					key: routine.key,
					source: "code",
					name: routine.name,
					instructions: routine.instructions,
					cron: routine.schedule.cron,
					timezone: routine.schedule.timezone,
					enabled: true,
					user_id: null,
					next_run_at: next.data,
					created_at: now,
					updated_at: now,
				},
			});
			if (created.error) return created;
			continue;
		}

		const rescheduled =
			current.cron !== routine.schedule.cron ||
			current.timezone !== routine.schedule.timezone;
		if (
			!rescheduled &&
			current.name === routine.name &&
			current.instructions === routine.instructions
		) {
			continue;
		}

		const updated = await AgentRoutines.updateSingle({
			where: [{ key: "id", operator: "=", value: current.id }],
			data: {
				name: routine.name,
				instructions: routine.instructions,
				cron: routine.schedule.cron,
				timezone: routine.schedule.timezone,
				...(rescheduled && current.enabled ? { next_run_at: next.data } : {}),
				updated_at: now,
			},
		});
		if (updated.error) return updated;
	}

	const removed = existing.data.filter(
		(row) =>
			!defined.some(
				({ agentKey, routine }) =>
					row.agent_key === agentKey && row.key === routine.key,
			),
	);
	if (removed.length > 0) {
		logger.debug({
			message: `Removing agent routines no longer in the config: ${removed.map((row) => `${row.agent_key}:${row.key}`).join(", ")}`,
			scope: constants.logScopes.sync,
		});

		const deleted = await AgentRoutines.deleteMultiple({
			where: [
				{
					key: "id",
					operator: "in",
					value: removed.map((row) => row.id),
				},
			],
		});
		if (deleted.error) return deleted;
	}

	return { error: undefined, data: undefined };
};

export default syncAgentRoutines;
