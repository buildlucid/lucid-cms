import { copy } from "@lucidcms/core";
import type {
	CoreToolkit,
	JobExecution,
	ServiceFn,
	ServiceResponse,
} from "@lucidcms/core/types";
import { Errors } from "typesense";
import { LEASE_MS } from "../constants.js";
import type { SyncJob } from "../jobs/types.js";
import GenerationsRepository from "../repositories/generations.js";
import IndexesRepository from "../repositories/indexes.js";
import WorkRepository from "../repositories/work.js";
import type { IndexOptions, ResolvedOptions } from "../types.js";
import enqueueSync from "../utils/enqueue-sync.js";
import providerError from "../utils/provider-error.js";
import beginRebuild from "./begin-rebuild.js";
import prepareRebuild from "./prepare-rebuild.js";
import processWork from "./process-work.js";

/** Owns one index batch. External calls happen in jobs, outside content transactions. */
const syncIndex: ServiceFn<
	[
		{
			options: ResolvedOptions;
			toolkit: CoreToolkit;
			index: IndexOptions;
			job: SyncJob;
			execution: JobExecution;
		},
	],
	undefined
> = async (context, data) => {
	const Indexes = new IndexesRepository(context.db);
	const Work = new WorkRepository(context.db);
	const ensured = await Indexes.ensure(data.index.key);
	if (ensured.error) return ensured;

	const previous = await Indexes.get(data.index.key);
	if (previous.error) return previous;

	const token = crypto.randomUUID();
	const claimed = await Indexes.claim({
		indexKey: data.index.key,
		token,
		now: new Date().toISOString(),
		until: new Date(Date.now() + LEASE_MS).toISOString(),
	});
	if (claimed.error) return claimed;
	if (!claimed.data) return { error: undefined, data: undefined };

	let continueWork = false;
	let failure: Awaited<ServiceResponse<undefined>>["error"];
	const checkLease = async (): ServiceResponse<undefined> => {
		const current = await Indexes.get(data.index.key);
		if (current.error) return current;

		if (
			data.execution.signal.aborted ||
			current.data.lock_token !== token ||
			current.data.lock_until === null ||
			current.data.lock_until <= new Date().toISOString()
		) {
			return {
				error: { message: copy("server:plugin.typesense.lease.lost") },
				data: undefined,
			};
		}

		const renewed = await Indexes.update({
			indexKey: data.index.key,
			token,
			values: { lock_until: new Date(Date.now() + LEASE_MS).toISOString() },
		});
		if (renewed.error) return renewed;

		return { error: undefined, data: undefined };
	};

	const run = async (): ServiceResponse<undefined> => {
		let state = claimed.data;
		if (!state) return { error: undefined, data: undefined };

		// An expired owner may have made uncertain provider writes. Rebuild into a fresh collection.
		if (
			(!state.active_collection && !state.building_collection) ||
			previous.data.lock_token !== null ||
			(!state.building_collection &&
				state.rebuild_completed !== null &&
				Date.now() - Date.parse(state.rebuild_completed) >=
					data.options.reconcileIntervalSeconds * 1000)
		) {
			const begun = await beginRebuild(context, { index: data.index, token });
			if (begun.error) return begun;

			const refreshed = await Indexes.get(data.index.key);
			if (refreshed.error) return refreshed;
			state = refreshed.data;
		}
		if (state.building_collection && state.rebuild_id) {
			const checked = await checkLease();
			if (checked.error) return checked;

			const prepared = await prepareRebuild(context, {
				options: data.options,
				index: data.index,
				state: {
					...state,
					building_collection: state.building_collection,
					rebuild_id: state.rebuild_id,
				},
				token,
			});
			if (prepared.error) return prepared;
		}

		const pending = await Work.next({
			indexKey: data.index.key,
			limit: data.options.batchSize,
		});
		if (pending.error) return pending;

		if (pending.data.length > 0) {
			const processed = await processWork(context, {
				toolkit: data.toolkit,
				options: data.options,
				index: data.index,
				state,
				rows: pending.data,
				checkLease,
			});
			if (processed.error) return processed;

			const saved = await Indexes.update({
				indexKey: data.index.key,
				token,
				values: {
					rebuild_processed:
						state.rebuild_processed +
						(state.building_collection ? processed.data.processed : 0),
					last_success: new Date().toISOString(),
					last_error: null,
				},
			});
			if (saved.error) return saved;
			continueWork = true;

			return { error: undefined, data: undefined };
		}
		const checked = await checkLease();
		if (checked.error) return checked;

		const aliasTarget = state.building_collection ?? state.active_collection;
		if (aliasTarget) {
			// Keep the build pending until the provider accepts the alias. A crash can safely retry it.
			await data.options.client.aliases().upsert(data.index.alias, {
				collection_name: aliasTarget,
			});

			const checked = await checkLease();
			if (checked.error) return checked;
		}

		if (state.building_collection) {
			const promoted = await Indexes.update({
				indexKey: data.index.key,
				token,
				values: {
					active_collection: state.building_collection,
					building_collection: null,
					rebuild_completed: new Date().toISOString(),
					last_error: null,
				},
			});
			if (promoted.error) return promoted;

			state = {
				...state,
				active_collection: state.building_collection,
				building_collection: null,
			};
		}

		if (state.active_collection) {
			const Generations = new GenerationsRepository(context.db);
			const obsolete = await Generations.obsolete({
				indexKey: data.index.key,
				retain: [
					state.active_collection,
					...(state.building_collection ? [state.building_collection] : []),
				],
			});
			if (obsolete.error) return obsolete;

			if (obsolete.data) {
				const checked = await checkLease();
				if (checked.error) return checked;

				try {
					await data.options.client
						.collections(obsolete.data.collection_name)
						.delete();
				} catch (error) {
					if (!(error instanceof Errors.ObjectNotFound))
						return { error: providerError(error), data: undefined };
				}
				const removed = await Generations.remove(obsolete.data.collection_name);
				if (removed.error) return removed;

				continueWork = true;
			}
		}

		const saved = await Indexes.update({
			indexKey: data.index.key,
			token,
			values: { last_error: null, last_success: new Date().toISOString() },
		});
		if (saved.error) return saved;

		return { error: undefined, data: undefined };
	};

	try {
		const result = await run();
		failure = result.error;
	} catch (error) {
		failure = providerError(error);
	}

	if (failure) {
		await Indexes.update({
			indexKey: data.index.key,
			token,
			values: {
				last_error: context.translate.english(
					failure.message ?? copy("server:plugin.typesense.provider.failed"),
				),
			},
		});
	}

	const released = await Indexes.release({ indexKey: data.index.key, token });
	if (failure) return { error: failure, data: undefined };
	if (released.error) return released;

	if (!continueWork) {
		// A change arriving during finalization may have found this worker's lease held.
		const pending = await Work.next({ indexKey: data.index.key, limit: 1 });
		if (pending.error) return pending;
		continueWork = pending.data.length > 0;
	}

	if (continueWork) {
		const enqueued = await enqueueSync({
			toolkit: data.toolkit,
			indexKey: data.index.key,
			job: data.job,
		});
		if (enqueued.error) return enqueued;
	}

	return { error: undefined, data: undefined };
};

export default syncIndex;
