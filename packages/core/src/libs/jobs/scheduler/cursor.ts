import type { ServiceFn } from "../../../utils/services/types.js";
import { JobSchedulerRepository } from "../../repositories/index.js";

const SCHEDULER_KEY = "default";
const MINUTE_MS = 60_000;

/** Returns a new date rounded down to the start of its minute. */
export const floorToMinute = (value: Date) =>
	new Date(Math.floor(value.getTime() / MINUTE_MS) * MINUTE_MS);

/** Reads the shared scheduler cursor, creating its singleton row when needed. */
export const readSchedulerCursor: ServiceFn<[scheduledAt: Date], Date> = async (
	context,
	scheduledAt,
) => {
	const Scheduler = new JobSchedulerRepository(context.db);

	const inserted = await Scheduler.createSingleton(SCHEDULER_KEY);
	if (inserted.error) return inserted;

	const cursor = await Scheduler.selectCursor(SCHEDULER_KEY);
	if (cursor.error) return cursor;

	//* Without a stored cursor only the tick's own minute counts as missed
	const cursorAt = cursor.data?.cursor_at;
	if (!cursorAt) {
		return {
			error: undefined,
			data: new Date(floorToMinute(scheduledAt).getTime() - MINUTE_MS),
		};
	}

	return {
		error: undefined,
		data: cursorAt instanceof Date ? cursorAt : new Date(cursorAt),
	};
};

/** Advances the shared cursor without allowing an older tick to move it back. */
export const advanceSchedulerCursor: ServiceFn<
	[scheduledAt: Date],
	undefined
> = async (context, scheduledAt) => {
	const Scheduler = new JobSchedulerRepository(context.db);

	const result = await Scheduler.advanceCursor({
		cursor: floorToMinute(scheduledAt).toISOString(),
		schedulerKey: SCHEDULER_KEY,
		updatedAt: new Date().toISOString(),
	});
	if (result.error) return result;

	return { error: undefined, data: undefined };
};
