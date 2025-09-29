import { parentPort } from "node:worker_threads";
import loadConfigFile from "../../config/load-config-file.js";
import getConfigPath from "../../config/get-config-path.js";
import logger from "../../logger/index.js";
import createQueueContext, { QUEUE_LOG_SCOPE } from "../create-context.js";
import services from "../../../services/index.js";
import passthroughQueueAdapter from "../adapters/passthrough.js";

const MIN_POLL_INTERVAL = 1000;
const MAX_POLL_INTERVAL = 30000;
const POLL_INTERVAL_INC = 1000;

const startConsumer = async () => {
	try {
		const configPath = getConfigPath(process.cwd());
		const { config } = await loadConfigFile({ path: configPath });

		const CONCURRENT_LIMIT = config.queue.processing.concurrentLimit;

		const queueContext = createQueueContext(config);
		const internalQueueAdapter = passthroughQueueAdapter(queueContext, {
			bypassImmediateExecution: true,
		});
		const eventHandlers = queueContext.getEventHandlers();

		/**
		 * Processes a job
		 */
		const processJob = async (
			job: Awaited<ReturnType<typeof queueContext.getReadyJobs>>[number],
		): Promise<void> => {
			const handler =
				eventHandlers[job.event_type as keyof typeof eventHandlers];

			if (!handler) {
				logger.warn({
					message: "No handler found for job type",
					scope: QUEUE_LOG_SCOPE,
					data: { jobId: job.job_id, eventType: job.event_type },
				});

				await queueContext.updateJob(job.job_id, {
					status: "failed",
					errorMessage: `No handler found for job type: ${job.event_type}`,
				});
				return;
			}

			try {
				logger.debug({
					message: "Processing job",
					scope: QUEUE_LOG_SCOPE,
					data: { jobId: job.job_id, eventType: job.event_type },
				});

				await queueContext.updateJob(job.job_id, {
					status: "processing",
					attempts: job.attempts + 1,
				});

				const handlerResult = await handler(
					{
						config: config,
						db: config.db.client,
						services: services,
						// TODO: should handlers be able to push events to the queue??
						//* we use the passthrough queue adapter so that any services called within the handler can still push events to the queue.
						//* with bypassImmediateExecution set to true so that the events are not executed immediately like they would by default with this adapter
						queue: internalQueueAdapter,
					},
					job.event_data,
				);

				if (handlerResult.error) {
					logger.error({
						message: "Job failed",
						scope: QUEUE_LOG_SCOPE,
						data: {
							jobId: job.job_id,
							eventType: job.event_type,
							errorMessage: handlerResult.error.message,
						},
					});

					await queueContext.handleJobFailure(
						job,
						handlerResult.error.message ?? "Unknown error",
					);
					return;
				}

				await queueContext.updateJob(job.job_id, {
					status: "completed",
				});
				logger.debug({
					message: "Job completed successfully",
					scope: QUEUE_LOG_SCOPE,
					data: { jobId: job.job_id, eventType: job.event_type },
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";

				logger.error({
					message: "Job failed",
					scope: QUEUE_LOG_SCOPE,
					data: { jobId: job.job_id, eventType: job.event_type, errorMessage },
				});

				await queueContext.handleJobFailure(job, errorMessage);
			}
		};

		// -----------------------------------------
		// Polling
		let pollInterval = MIN_POLL_INTERVAL;

		/**
		 * Polls for jobs and processes them
		 */
		const poll = async (): Promise<void> => {
			try {
				const jobs = await queueContext.getReadyJobs();
				logger.debug({
					message: "Jobs found",
					scope: QUEUE_LOG_SCOPE,
					data: { jobs: jobs.length },
				});

				//* we slow the polling down if no jobs are found
				if (jobs.length === 0) {
					pollInterval = Math.min(
						pollInterval + POLL_INTERVAL_INC,
						MAX_POLL_INTERVAL,
					);
				} else {
					//* jobs found, reset to fast polling
					pollInterval = MIN_POLL_INTERVAL;

					const chunks = [];
					for (let i = 0; i < jobs.length; i += CONCURRENT_LIMIT) {
						chunks.push(jobs.slice(i, i + CONCURRENT_LIMIT));
					}

					for (const chunk of chunks) {
						await Promise.allSettled(chunk.map((job) => processJob(job)));
					}
				}
			} catch (error) {
				logger.error({
					message: "Polling error",
					scope: QUEUE_LOG_SCOPE,
					data: { error },
				});
			}

			setTimeout(poll, pollInterval);
		};

		parentPort?.on("message", ({ type }) => {
			if (type === "CHECK_NOW") poll();
		});

		logger.debug({
			message: "Starting queue polling",
			scope: QUEUE_LOG_SCOPE,
		});
		poll();
	} catch (error) {
		logger.error({
			message: "Consumer startup error",
			scope: QUEUE_LOG_SCOPE,
			data: { error },
		});
		process.exit(1);
	}
};

startConsumer();
