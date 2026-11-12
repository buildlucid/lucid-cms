import {
	AI_FEATURES,
	type AiFeature,
	type FakeConnectionView,
	type LedgerEntry,
} from "./types.ts";

/** One CMS's connection to the fake: its client registration, organisation and what it did. */
export type FakeConnection = {
	id: string;
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	clientName: string;
	features: AiFeature[];
	credits: number;
	charged: number;
	revoked: boolean;
	tokenLifetimeSeconds: number;
	ledger: LedgerEntry[];
};

/** A model request the fake has finished, kept so a request sent again gets the same answer. */
export type FinishedAgentRequest = {
	connectionId: string;
	status: "processing" | "complete" | "failed" | "cancelled";
	/** The answer's event stream, for a request sent again. */
	frames: string[];
	creditsCharged: number;
	usage?: Record<string, unknown>;
};

/** A generate request the fake has accepted, by its idempotency key. */
export type GenerateRequest = {
	connectionId: string;
	feature: { key: string; version: string };
	/** What the request answers once complete, or the error it fails with. */
	result:
		| { type: "complete"; data: Record<string, unknown> }
		| { type: "error"; status: number; key: string };
	/** Holds completion until the gate opens. */
	gate: string | null;
};

const DEFAULT_CREDITS = 10_000;
const DEFAULT_TOKEN_LIFETIME_SECONDS = 3_600;

/** Everything the fake keeps for a run, shared by every setup and CMS. */
const createState = () => {
	const connections = new Map<string, FakeConnection>();
	const byClient = new Map<string, FakeConnection>();
	const accessTokens = new Map<
		string,
		{ connectionId: string; expiresAt: number }
	>();
	const refreshTokens = new Map<string, string>();
	const agentRequests = new Map<string, FinishedAgentRequest>();
	const generateRequests = new Map<string, GenerateRequest>();
	const media = new Map<string, { bytes: Uint8Array; mimeType: string }>();
	//* what the harness's tools did, by the tag a test gave them, so a test can count side effects
	const effects = new Map<string, unknown[]>();
	//* failed attempts of a script's turn, so `fail.times` counts across a run's retries
	const attempts = new Map<string, number>();
	const gates = new Map<
		string,
		{ open: boolean; waiting: number; waiters: Set<() => void> }
	>();
	let nextConnection = 1;

	const gate = (name: string) => {
		let found = gates.get(name);
		if (!found) {
			found = { open: false, waiting: 0, waiters: new Set() };
			gates.set(name, found);
		}
		return found;
	};

	return {
		connections,
		accessTokens,
		refreshTokens,
		agentRequests,
		generateRequests,
		media,
		attempts,

		recordEffect(tag: string, effect: unknown) {
			effects.set(tag, [...(effects.get(tag) ?? []), effect]);
		},
		effects: (tag: string) => effects.get(tag) ?? [],

		/** Registers a CMS as a client. Each registration is its own connection. */
		register(client: {
			clientId: string;
			clientSecret: string;
			redirectUri: string;
			clientName: string;
		}): FakeConnection {
			const connection: FakeConnection = {
				...client,
				id: `harness-connection-${nextConnection++}`,
				features: [...AI_FEATURES],
				credits: DEFAULT_CREDITS,
				charged: 0,
				revoked: false,
				tokenLifetimeSeconds: DEFAULT_TOKEN_LIFETIME_SECONDS,
				ledger: [],
			};
			connections.set(connection.id, connection);
			byClient.set(connection.clientId, connection);
			return connection;
		},
		client: (clientId: string) => byClient.get(clientId),

		/** The connection an access token belongs to, unless it expired or was revoked. */
		authenticate(request: Request): FakeConnection | undefined {
			const header = request.headers.get("authorization") ?? "";
			const token = /^Bearer (.+)$/.exec(header)?.[1];
			const found = token ? accessTokens.get(token) : undefined;
			if (!found || found.expiresAt <= Date.now()) {
				return undefined;
			}
			const connection = connections.get(found.connectionId);
			return connection && !connection.revoked ? connection : undefined;
		},

		record(connection: FakeConnection, entry: LedgerEntry) {
			connection.ledger.push(entry);
		},

		/** Takes credits for a request. Returns false when the organisation has run out. */
		charge(connection: FakeConnection, credits: number): boolean {
			if (connection.credits < credits) {
				return false;
			}
			connection.credits -= credits;
			connection.charged += credits;
			return true;
		},
		/** Gives back credits for a request that ended without an answer. */
		refund(connection: FakeConnection, credits: number) {
			connection.credits += credits;
			connection.charged -= credits;
		},

		view: (connection: FakeConnection): FakeConnectionView => ({
			id: connection.id,
			clientId: connection.clientId,
			status: connection.revoked ? "revoked" : "active",
			features: connection.features,
			credits: connection.credits,
			charged: connection.charged,
		}),

		/** Waits until a gate opens or the request goes away. Returns whether it opened. */
		async waitForGate(name: string, signal: AbortSignal): Promise<boolean> {
			const found = gate(name);
			if (found.open) {
				return true;
			}
			if (signal.aborted) {
				return false;
			}
			found.waiting++;
			try {
				return await new Promise<boolean>((resolve) => {
					const opened = () => {
						signal.removeEventListener("abort", aborted);
						resolve(true);
					};
					const aborted = () => {
						found.waiters.delete(opened);
						resolve(false);
					};
					found.waiters.add(opened);
					signal.addEventListener("abort", aborted, { once: true });
				});
			} finally {
				found.waiting--;
			}
		},
		gateOpen: (name: string) => gate(name).open,
		openGate(name: string) {
			const found = gate(name);
			found.open = true;
			for (const waiter of found.waiters) {
				waiter();
			}
			found.waiters.clear();
		},
		gateStatus: (name: string) => {
			const found = gate(name);
			return { open: found.open, waiting: found.waiting };
		},
	};
};

export type FakeState = ReturnType<typeof createState>;

export default createState;
