declare module "cloudflare:workers" {
	export const env: Record<string, unknown>;

	/** The state Cloudflare passes a Durable Object, limited to what Lucid uses. */
	export type DurableObjectState = {
		storage: {
			get<T>(key: string): Promise<T | undefined>;
			put(key: string, value: unknown): Promise<void>;
			delete(key: string): Promise<boolean>;
			setAlarm(scheduledTime: number): Promise<void>;
		};
		waitUntil(promise: Promise<unknown>): void;
	};

	export abstract class DurableObject<Env = unknown> {
		protected ctx: DurableObjectState;
		protected env: Env;
		constructor(ctx: DurableObjectState, env: Env);
	}
}
