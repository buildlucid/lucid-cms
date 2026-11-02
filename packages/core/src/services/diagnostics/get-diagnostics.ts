import packageJson from "../../../package.json" with { type: "json" };
import { diagnosticsFormatter } from "../../libs/formatters/index.js";
import { getRegisteredJobSchedules } from "../../libs/jobs/scheduler/registered-schedules.js";
import { JobsRepository } from "../../libs/repositories/index.js";
import type { Diagnostics } from "../../types/response.js";
import { getSiteUrl } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { resolveEffectiveConnection } from "../connection/storage.js";
import getDocumentCounts from "./helpers/get-document-counts.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Returns install, runtime and configuration details for the diagnostics page. Leaves out secrets and personal data. */
const getDiagnostics: ServiceFn<[], Diagnostics> = async (context) => {
	const Jobs = new JobsRepository(context.db);
	const generatedAt = new Date();

	const [migrations, documentCounts, connection, pendingJobs, failedJobs] =
		await Promise.all([
			context.config.db.getMigrationStatus(context.db.kysely),
			getDocumentCounts(context),
			resolveEffectiveConnection(context),
			Jobs.count({
				where: [
					{ key: "status", operator: "in", value: ["queued", "running"] },
				],
			}),
			Jobs.count({
				where: [
					{ key: "status", operator: "=", value: "failed" },
					{
						key: "failed_at",
						operator: ">=",
						value: new Date(generatedAt.getTime() - DAY_MS).toISOString(),
					},
				],
			}),
		]);
	if (documentCounts.error) return documentCounts;
	if (connection.error) return connection;
	if (pendingJobs.error) return pendingJobs;
	if (failedJobs.error) return failedJobs;

	const nodeVersion = globalThis.process?.versions?.node;

	return {
		error: undefined,
		data: diagnosticsFormatter.formatSingle({
			diagnostics: {
				version: packageJson.version,
				generatedAt,
				siteUrl: getSiteUrl(context),
				runtime: context.runtimeContext?.runtime ?? null,
				runtimeVersion: nodeVersion ? `v${nodeVersion}` : null,
				migrations,
				documentCounts: documentCounts.data,
				connectionStatus: connection.data?.status ?? null,
				captchaKey: context.captcha?.key ?? null,
				queueKey: context.queue.key,
				scheduleCount: getRegisteredJobSchedules(context).length,
				pendingJobs: pendingJobs.data?.count,
				failedJobs: failedJobs.data?.count,
			},
			config: context.config,
		}),
	};
};

export default getDiagnostics;
