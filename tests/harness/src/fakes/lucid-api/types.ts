/** The AI features an organisation can allow, as Lucid's API names them. */
export const AI_FEATURES = [
	"agent",
	"chat_titles",
	"alt_text",
	"media_analysis",
	"image_generation",
	"audio_generation",
	"translation",
	"web_research",
] as const;

export type AiFeature = (typeof AI_FEATURES)[number];

/** A model request the fake answered, as the ledger keeps it. */
export type AgentEntry = {
	kind: "agent";
	requestId: string;
	/** The chat the request was for. */
	sessionId: string;
	purpose: "chat" | "compact";
	/** The script the turn came from, if the request carried one. */
	scriptId: string | null;
	/** The turn's position in its script, counting turns already played. */
	turn: number | null;
	/** `replayed` is a request ID the fake already answered, sent again. */
	outcome: "answered" | "failed" | "cut" | "aborted" | "replayed" | "refused";
	/** Why the fake refused it, such as a broken transcript. */
	violation?: string;
	creditsCharged: number;
	model: string;
	actor: { type: "user"; id: number } | { type: "system" };
	instructions: string;
	messages: Array<Record<string, unknown>>;
	tools: string[];
	/** The request body's length, which most of a model's input tokens come from. */
	requestChars: number;
	/** The tool calls the fake answered with. */
	calls: Array<{ id: string; name: string; input: Record<string, unknown> }>;
};

/** A request to Lucid's generate endpoint, such as alt text, a title or a web search. */
export type GenerateEntry = {
	kind: "generate";
	requestId: string;
	feature: string;
	sessionId: string | null;
	outcome: "answered" | "accepted" | "failed" | "replayed";
	creditsCharged: number;
	actor: { type: "user"; id: number } | { type: "system" };
	/** The request's body, without the actor. */
	request: Record<string, unknown>;
};

/** Anything else a CMS asked Lucid's API for, such as a model catalogue or a token refresh. */
export type CallEntry = {
	kind: "call";
	method: string;
	path: string;
	status: number;
};

export type LedgerEntry = (AgentEntry | GenerateEntry | CallEntry) & {
	/** When the fake received it. */
	at: string;
};

/** A connection as the fake's control routes describe it. */
export type FakeConnectionView = {
	id: string;
	clientId: string;
	status: "active" | "revoked";
	features: AiFeature[];
	/** Credits the organisation has left. */
	credits: number;
	/** Credits charged so far. */
	charged: number;
};

/** What a test may change about a connection. Only host mode should, as served tests share one. */
export type FakeConnectionChange = {
	features?: AiFeature[];
	credits?: number;
	/** Revokes every token, as if someone disconnected the CMS from Lucid's side. */
	revoked?: boolean;
	/** Makes access tokens expire this many seconds after they are issued. */
	tokenLifetimeSeconds?: number;
};

/** The fake's control routes, under the API's root. Only the harness calls them. */
export const CONTROL_PATHS = {
	connection: (id: string) => `/harness/connections/${encodeURIComponent(id)}`,
	ledger: (id: string) =>
		`/harness/connections/${encodeURIComponent(id)}/ledger`,
	/** POST opens it. GET says whether it is open and how much waits on it; `?wait=1` waits for it. */
	gate: (name: string) => `/harness/gates/${encodeURIComponent(name)}`,
	/** POST records an effect under a tag, GET lists them. The harness's agent tools post here. */
	effects: (tag: string) => `/harness/effects/${encodeURIComponent(tag)}`,
} as const;
