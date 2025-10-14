import { Worker } from "node:worker_threads";
import logger from "../../../logger/index.js";
import type { QueueAdapter } from "../../types.js";

const ADAPTER_KEY = "worker-queue-adapter";

/**
 * The worker queue adapter
 */
const workerQueueAdapter: QueueAdapter = (context) => {
	let worker: Worker | null = null;

	return {
		key: ADAPTER_KEY,
		lifecycle: {
			start: async () => {
				logger.debug({
					message: "The worker queue has started",
					scope: context.logScope,
				});
				const workerUrl = new URL(
					"./libs/queue-adapter/adapters/worker/consumer.js",
					import.meta.url,
				);
				worker = new Worker(workerUrl);
			},
			kill: async () => {
				if (worker) {
					worker.terminate();
				}
			},
		},
		add: async (event, params) => {
			if (!worker) {
				return {
					error: { message: "Worker queue is not started" },
					data: undefined,
				};
			}

			logger.info({
				message: "Adding job to the worker queue",
				scope: context.logScope,
				data: { event },
			});

			const jobResponse = await context.insertJob(params.serviceContext, {
				event: event,
				payload: params.payload,
				queueAdapterKey: ADAPTER_KEY,
				options: params.options,
			});
			if (jobResponse.error) return jobResponse;

			return jobResponse;
		},
		addBatch: async (event, params) => {
			if (!worker) {
				return {
					error: { message: "Worker queue is not started" },
					data: undefined,
				};
			}

			logger.info({
				message: "Adding batch jobs to the worker queue",
				scope: context.logScope,
				data: { event, count: params.payloads.length },
			});

			const jobResponse = await context.insertMultipleJobs(
				params.serviceContext,
				{
					event: event,
					payloads: params.payloads,
					queueAdapterKey: ADAPTER_KEY,
					options: params.options,
				},
			);
			if (jobResponse.error) return jobResponse;

			return jobResponse;
		},
	};
};

export default workerQueueAdapter;
