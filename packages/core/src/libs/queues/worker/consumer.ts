import { parentPort } from "node:worker_threads";
import loadConfigFile from "../../config/load-config-file.js";
import getConfigPath from "../../config/get-config-path.js";
import type { Select } from "../../../types.js";
import type { LucidQueueJobs } from "../../db/types.js";
import logger from "../../logger/index.js";
import createQueueContext, { QUEUE_LOG_SCOPE } from "../create-context.js";
import services from "../../../services/index.js";
import passthroughQueueAdapter from "../adapters/passthrough.js";

type QueueJobResponse = Select<LucidQueueJobs>;

const MIN_POLL_INTERVAL = 1000;
const MAX_POLL_INTERVAL = 30000;
const POLL_INTERVAL_INC = 1000;
// TODO: make bellow configurable
const CONCURRENT_LIMIT = 5;
const TOTAL_JOBS_TO_PROCESS = 10;

const startConsumer = async () => {
	try {
		const configPath = getConfigPath(process.cwd());
		const { config } = await loadConfigFile({ path: configPath });

		const queueContext = createQueueContext(config);
		const internalQueueAdapter = passthroughQueueAdapter(queueContext, {
			bypassImmediateExecution: true,
		});
		const eventHandlers = queueContext.getEventHandlers();

		/**
		 * Gets the ready jobs from the database
		 * @todo this likley needs moving to the context helper?
		 */
		const getReadyJobs = async (): Promise<QueueJobResponse[]> => {
			try {
				const now = new Date();

				// TODO: Add KV use here once its implemented

				//* fallback to a db query
				const jobs = await config.db.client
					.selectFrom("lucid_queue_jobs")
					.selectAll()
					.where((eb) =>
						eb.or([
							eb("status", "=", "pending"),
							eb.and([
								eb("status", "=", "failed"),
								eb("attempts", "<", eb.ref("max_attempts")),
								eb("next_retry_at", "<=", now.toISOString()),
							]),
						]),
					)
					.orderBy(["priority desc", "created_at asc"])
					.limit(TOTAL_JOBS_TO_PROCESS)
					.execute();

				// TODO: remove the as and fix the typing
				return jobs as QueueJobResponse[];
			} catch (error) {
				logger.error({
					message: "Error getting jobs",
					scope: QUEUE_LOG_SCOPE,
					data: { error },
				});
				return [];
			}
		};

		/**
		 * Updates a job in the database
		 * @todo this likley needs moving to the context helper?
		 */
		const updateJob = async (
			jobId: string,
			updates: {
				status?: QueueJobResponse["status"];
				attempts?: number;
				nextRetryAt?: Date | null;
				errorMessage?: string | null;
			},
		) => {
			const dbUpdates: Record<string, unknown> = {
				updated_at: new Date().toISOString(),
			};

			if (updates.status) {
				dbUpdates.status = updates.status;

				if (updates.status === "processing") {
					dbUpdates.started_at = new Date().toISOString();
				} else if (updates.status === "completed") {
					dbUpdates.completed_at = new Date().toISOString();
				} else if (updates.status === "failed") {
					dbUpdates.failed_at = new Date().toISOString();
				}
			}

			if (updates.attempts !== undefined) {
				dbUpdates.attempts = updates.attempts;
			}
			if (updates.nextRetryAt !== undefined) {
				dbUpdates.next_retry_at = updates.nextRetryAt?.toISOString() || null;
			}
			if (updates.errorMessage !== undefined) {
				dbUpdates.error_message = updates.errorMessage;
			}

			await config.db.client
				.updateTable("lucid_queue_jobs")
				.set(dbUpdates)
				.where("job_id", "=", jobId)
				.execute();
		};

		/**
		 * Handles a job failure by updating the job status and logging the error
		 * @todo this likley needs moving to the context helper?
		 */
		const handleJobFailure = async (
			job: QueueJobResponse,
			errorMessage: string,
		) => {
			const shouldRetry = job.attempts < job.max_attempts;

			if (shouldRetry) {
				const backoffSeconds = 2 ** job.attempts * 1000;
				const nextRetryAt = new Date(Date.now() + backoffSeconds);

				await updateJob(job.job_id, {
					status: "pending",
					nextRetryAt,
					attempts: job.attempts + 1,
				});

				logger.debug({
					message: "Job will retry",
					scope: QUEUE_LOG_SCOPE,
					data: {
						jobId: job.job_id,
						eventType: job.event_type,
						nextRetryAt: nextRetryAt.toISOString(),
					},
				});
			} else {
				await updateJob(job.job_id, {
					status: "failed",
					errorMessage,
				});

				logger.error({
					message: "Job failed permanently",
					scope: QUEUE_LOG_SCOPE,
					data: {
						jobId: job.job_id,
						eventType: job.event_type,
						errorMessage,
					},
				});
			}
		};

		/**
		 * Processes a job by executing the event handler and updating the job status
		 * @todo this likley needs moving to the context helper?
		 */
		const processJob = async (job: QueueJobResponse): Promise<void> => {
			const handler =
				eventHandlers[job.event_type as keyof typeof eventHandlers];

			if (!handler) {
				logger.warn({
					message: "No handler found for job type",
					scope: QUEUE_LOG_SCOPE,
					data: { jobId: job.job_id, eventType: job.event_type },
				});

				await updateJob(job.job_id, {
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

				await updateJob(job.job_id, {
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

					await handleJobFailure(
						job,
						handlerResult.error.message ?? "Unknown error",
					);
					return;
				}

				await updateJob(job.job_id, {
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

				await handleJobFailure(job, errorMessage);
			}
		};

		// -----------------------------------------
		// Polling
		let pollInterval = MIN_POLL_INTERVAL;

		const poll = async (): Promise<void> => {
			try {
				const jobs = await getReadyJobs();
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

		//* handle messages from main thread
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
