import { Cron } from "croner";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import { hookExecutionKinds } from "../../hooks/hook-map.js";

//* keys appear in URLs and schedule names, so they share the agent key rules
const keyPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const isWholeSeconds = (value: number, min: number) =>
	Number.isSafeInteger(value) && value >= min;

const isWebUrl = (value: string) => {
	try {
		const url = new URL(value);
		return url.protocol === "https:" || url.protocol === "http:";
	} catch {
		return false;
	}
};

/** Checks deploy keys, links, providers, triggers, schedules and timings at config time. */
const checkDeploys = (config: Pick<ResolvedLucidConfig, "deploys">) => {
	const keys = new Set<string>();

	for (const deploy of config.deploys) {
		if (deploy.key.length > 64 || !keyPattern.test(deploy.key)) {
			throw new Error(
				`Invalid deploy key "${deploy.key}". Use lowercase letters, numbers and single hyphens.`,
			);
		}
		if (keys.has(deploy.key)) {
			throw new Error(`Deploy "${deploy.key}" is registered more than once.`);
		}
		keys.add(deploy.key);

		if (
			deploy.provider?.type !== "deploy-provider" ||
			typeof deploy.provider.trigger !== "function"
		) {
			throw new Error(
				`Deploy "${deploy.key}" needs a provider, such as deployWebhook().`,
			);
		}

		for (const link of deploy.links) {
			if (!isWebUrl(link.url)) {
				throw new Error(
					`Deploy "${deploy.key}" has an invalid link "${link.url}". Use an http or https URL.`,
				);
			}
		}

		for (const trigger of deploy.triggers) {
			const kinds: Record<string, string> | undefined =
				hookExecutionKinds[trigger.service as keyof typeof hookExecutionKinds];
			if (kinds?.[String(trigger.event)] !== "effect") {
				throw new Error(
					`Deploy "${deploy.key}" can't trigger on ${trigger.service}.${String(trigger.event)}. Use a hook event that runs after a change, such as documents.afterChange.`,
				);
			}
		}

		if (deploy.schedule !== null) {
			let next: Date | null = null;
			try {
				next =
					deploy.schedule.split(" ").length === 5
						? new Cron(deploy.schedule, { timezone: "UTC" }).nextRun()
						: null;
			} catch {
				next = null;
			}
			if (!next) {
				throw new Error(
					`Deploy "${deploy.key}" has an invalid schedule "${deploy.schedule}". Use a five-field cron expression.`,
				);
			}
		}

		if (
			!isWholeSeconds(deploy.debounceSeconds, 0) ||
			!isWholeSeconds(deploy.maxWaitSeconds, deploy.debounceSeconds) ||
			!isWholeSeconds(deploy.timeoutSeconds, 60)
		) {
			throw new Error(
				`Deploy "${deploy.key}" needs whole seconds: debounceSeconds of 0 or more, maxWaitSeconds of at least debounceSeconds, and timeoutSeconds of at least 60.`,
			);
		}
	}
};

export default checkDeploys;
