/** Runtime and service adapter keys maintained by Lucid. */
export const firstPartyRuntimeAdapterKeys = {
	runtime: ["node", "cloudflare"],
	database: ["sqlite", "postgres", "libsql", "d1"],
	media: ["file-system", "s3", "cloudflare-r2"],
	queue: ["passthrough", "worker", "cloudflare-queues"],
	kv: ["passthrough", "sqlite", "redis", "cloudflare-kv"],
	email: ["passthrough", "resend", "nodemailer"],
} as const;

export type FirstPartyRuntimeAdapterKey<
	Category extends keyof typeof firstPartyRuntimeAdapterKeys,
> = (typeof firstPartyRuntimeAdapterKeys)[Category][number];
