import type { DeployRunSource } from "../../types/response.js";
import type { ServiceContext } from "../../utils/services/types.js";
import type {
	HookExecutionKindOf,
	HookPayload,
	HookServiceHandlers,
} from "../hooks/types.js";
import type { AdminCopyInput, ResolvedAdminCopy } from "../i18n/types.js";
import type { ScheduleTiming } from "../jobs/types.js";
import type { Toolkit } from "../toolkit/types.js";

/** Hook events that only run side effects. Transform hooks such as `afterFetch` also run on reads. */
type DeployTriggerEvent<S extends keyof HookServiceHandlers> = {
	[E in keyof HookServiceHandlers[S]]: HookExecutionKindOf<
		S,
		E
	> extends "effect"
		? E
		: never;
}[keyof HookServiceHandlers[S]];

/** A hook event that queues a deploy, with `when` deciding from the hook's payload. */
export type DeployTrigger = {
	[S in keyof HookServiceHandlers]: {
		[E in DeployTriggerEvent<S>]: {
			service: S;
			event: E;
			/**
			 * Decides whether the event queues the deploy. Leave it out to queue on every call.
			 * @remarks Runs inside the change's transaction, so keep it quick. A throw counts as no.
			 */
			when?: (
				props: HookPayload<S, E> & {
					context: ServiceContext;
					toolkit: Toolkit;
				},
			) => boolean | Promise<boolean>;
		};
	}[DeployTriggerEvent<S>];
}[keyof HookServiceHandlers];

/** The run a provider starts or checks. */
export type DeployProviderRun = {
	/** Lucid's ID for the run. */
	id: number;
	deployKey: string;
	source: DeployRunSource;
	/** Triggers batched into the run. */
	triggerCount: number;
	/** Takes POSTed `{ status, url?, message? }` JSON for this run, for CI that reports back itself. */
	callbackUrl: string;
};

/** A status the host reported for a run. */
export type DeployProviderUpdate = {
	status: "running" | "succeeded" | "failed";
	/** The host's page for the run, such as its build log. */
	url?: string;
	message?: string;
};

/** What a provider's `trigger` returns once the host has the run. */
export type DeployTriggerResult =
	| {
			/** The host is working on it. Lucid then polls `status`, or waits for a callback or webhook. */
			status: "running";
			/** The host's ID for the run, which `status` and `webhook` match on. */
			externalId?: string;
			url?: string;
	  }
	| {
			/** Use `triggered` when the host accepted the run but reports nothing back. */
			status: "succeeded" | "failed" | "triggered";
			url?: string;
			message?: string;
	  };

/** Starts runs on a host, such as a CI workflow or a build hook, and reports how they went. */
export type DeployProviderInstance = {
	type: "deploy-provider";
	/** Identifies the provider, such as `github-actions`. */
	key: string;
	/** Seconds before an unfinished run times out. Defaults to 30 minutes. */
	timeoutSeconds?: number;
	/**
	 * Starts a run. Throw when the host can't be reached or refuses it, and the run is retried.
	 * @remarks A retry after a lost response can start the host twice for one run.
	 */
	trigger: (
		context: ServiceContext,
		run: DeployProviderRun,
	) => Promise<DeployTriggerResult>;
	/**
	 * Checks a running run that has an external ID. Return null while nothing has changed.
	 * @remarks Lucid polls it about once a minute. Providers with `webhook` are only checked once, before a run times out.
	 */
	status?: (
		context: ServiceContext,
		run: DeployProviderRun & { externalId: string },
	) => Promise<DeployProviderUpdate | null>;
	/**
	 * Stops a running run on the host. Throw when the host can't stop it, and the run carries on.
	 * @remarks Without it, cancelling a run only stops Lucid waiting for it, and the host may still finish it.
	 */
	cancel?: (
		context: ServiceContext,
		run: DeployProviderRun & { externalId: string },
	) => Promise<void>;
	/**
	 * Reads an update the host sent to the deploy's webhook URL, replacing polling. Return null to
	 * ignore it, and throw when it can't be verified.
	 */
	webhook?: (
		context: ServiceContext,
		request: Request,
	) => Promise<(DeployProviderUpdate & { externalId: string }) | null>;
};

export type DefineDeployOptions = {
	/** Stable, unique key using lowercase letters, numbers and single hyphens. Runs are stored against it. */
	key: string;
	/** Shown in the admin. */
	name: AdminCopyInput;
	/** Explains what the deploy does, for the people who run it from the admin. */
	description?: AdminCopyInput;
	/** Shown with the deploy, such as the live site or the host's dashboard. Use http or https URLs. */
	links?: readonly { label: AdminCopyInput; url: string }[];
	/** Starts runs on the host, such as `webhook()`. */
	provider: DeployProviderInstance;
	/** Hook events that queue the deploy. Queued triggers wait out `debounceSeconds` and start one run. */
	triggers?: readonly DeployTrigger[];
	/** When scheduled runs start. */
	schedule?: ScheduleTiming;
	/** Seconds of quiet after the last trigger before the run starts. Defaults to 60. */
	debounceSeconds?: number;
	/** Seconds a run waits at most after its first trigger, however many follow. Defaults to 900. */
	maxWaitSeconds?: number;
	/** Seconds before an unfinished run times out, overriding the provider's default. */
	timeoutSeconds?: number;
};

/** A deploy created with `defineDeploy`. */
export type DeployDefinition = {
	readonly type: "deploy-definition";
	readonly key: string;
	readonly name: ResolvedAdminCopy;
	readonly description: ResolvedAdminCopy | null;
	readonly links: readonly { label: ResolvedAdminCopy; url: string }[];
	readonly provider: DeployProviderInstance;
	readonly triggers: readonly DeployTrigger[];
	readonly schedule: Required<ScheduleTiming> | null;
	readonly debounceSeconds: number;
	readonly maxWaitSeconds: number;
	readonly timeoutSeconds: number;
};
