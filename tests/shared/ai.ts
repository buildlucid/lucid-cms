import type { AiUsageSession, ConnectionStatus } from "@lucidcms/core/types";
import type { Lucid } from "../harness/src/client/open-lucid.ts";
import type { Session } from "../harness/src/client/types.ts";
import { AUTHORIZE_PARAMS } from "../harness/src/fakes/lucid-api/oauth.ts";
import {
	type AgentEntry,
	CONTROL_PATHS,
	type FakeConnectionChange,
	type FakeConnectionView,
	type GenerateEntry,
	type LedgerEntry,
} from "../harness/src/fakes/lucid-api/types.ts";

export type {
	AgentEntry,
	FakeConnectionView,
	GenerateEntry,
	LedgerEntry,
} from "../harness/src/fakes/lucid-api/types.ts";
export { AI_FEATURES } from "../harness/src/fakes/lucid-api/types.ts";
export { AGENT_MODELS } from "../harness/src/fakes/lucid-api/models.ts";

const POLL_MS = 50;
const TIMEOUT_MS = 15_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Calls one of the fake Lucid API's control routes. */
const control = async <Body>(
	lucid: Pick<Lucid, "lucidApi">,
	path: string,
	init?: RequestInit,
): Promise<Body> => {
	const response = await fetch(new URL(path, lucid.lucidApi), init);
	if (!response.ok) {
		throw new Error(
			`The fake Lucid API answered ${path} with ${response.status}: ${await response.text()}`,
		);
	}
	return (await response.json()) as Body;
};

/** The CMS's connection to Lucid, as the admin sees it. */
export const connectionStatus = async (
	session: Session,
): Promise<ConnectionStatus> => {
	const status = await session.request<{ data: ConnectionStatus }>({
		path: "/api/v1/connection/status",
	});
	if (!status.ok) {
		throw new Error(`Connection status answered ${status.status}.`);
	}
	return status.body.data;
};

/**
 * Completes the admin connection flow and returns the CMS redirect, including `result` and
 * `error`. `deny` refuses at Lucid.
 */
export const authorizeConnection = async (
	session: Session,
	options: { deny?: string } = {},
): Promise<URL> => {
	const started = await session.request<{
		data: { authorizationUrl: string };
	}>({ method: "POST", path: "/api/v1/connection/connect" });
	if (!started.ok) {
		throw new Error(
			`Connecting answered ${started.status}: ${JSON.stringify(started.body)}`,
		);
	}

	const authorize = new URL(started.body.data.authorizationUrl);
	if (options.deny) {
		authorize.searchParams.set(AUTHORIZE_PARAMS.error, options.deny);
	}
	const approved = await fetch(authorize, { redirect: "manual" });
	const callback = new URL(approved.headers.get("location") ?? "");
	const back = await session.fetch(`${callback.pathname}${callback.search}`, {
		redirect: "manual",
	});
	return new URL(back.headers.get("location") ?? "", callback);
};

/**
 * Connects the CMS to the fake Lucid API as an admin session, unless it already is, and returns
 * the connection's ID there. On a shared server another test may have connected it, or connect it
 * first, so it checks again after each try.
 */
export const connectSession = async (admin: Session): Promise<string> => {
	for (let attempt = 0; attempt < 3; attempt++) {
		const status = await connectionStatus(admin);
		if (status.status === "connected" && status.connection) {
			return status.connection.id;
		}
		await authorizeConnection(admin);
	}
	const status = await connectionStatus(admin);
	if (status.status !== "connected" || !status.connection) {
		throw new Error(
			`The CMS did not connect to Lucid: ${JSON.stringify(status)}`,
		);
	}
	return status.connection.id;
};

/** Connects the CMS to the fake Lucid API as the seeded admin. See `connectSession`. */
export const connectLucid = async (lucid: Lucid): Promise<string> =>
	connectSession(await lucid.admin());

/** What the fake Lucid API received for a connection, oldest first. */
export const readLedger = (
	lucid: Pick<Lucid, "lucidApi">,
	connectionId: string,
): Promise<LedgerEntry[]> => control(lucid, CONTROL_PATHS.ledger(connectionId));

/** The model requests a chat made, oldest first. */
export const modelRequests = async (
	lucid: Pick<Lucid, "lucidApi">,
	connectionId: string,
	sessionId: string,
): Promise<Array<AgentEntry & { at: string }>> =>
	(await readLedger(lucid, connectionId)).filter(
		(entry): entry is AgentEntry & { at: string } =>
			entry.kind === "agent" && entry.sessionId === sessionId,
	);

/** The generate requests a connection made for a feature, oldest first. */
export const generateRequests = async (
	lucid: Pick<Lucid, "lucidApi">,
	connectionId: string,
	feature: string,
): Promise<Array<GenerateEntry & { at: string }>> =>
	(await readLedger(lucid, connectionId)).filter(
		(entry): entry is GenerateEntry & { at: string } =>
			entry.kind === "generate" && entry.feature === feature,
	);

/** How the fake treats a connection: its features, credits and whether Lucid revoked it. */
export const describeConnection = (
	lucid: Pick<Lucid, "lucidApi">,
	connectionId: string,
): Promise<FakeConnectionView> =>
	control(lucid, CONTROL_PATHS.connection(connectionId));

/**
 * Changes how the fake treats a connection, such as which features the organisation allows. Only
 * host mode gives each test its own connection, so call `requires("mode:host")` first.
 */
export const changeConnection = (
	lucid: Pick<Lucid, "lucidApi">,
	connectionId: string,
	change: FakeConnectionChange,
): Promise<FakeConnectionView> =>
	control(lucid, CONTROL_PATHS.connection(connectionId), {
		method: "PATCH",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(change),
	});

/** A gate name no other test uses. */
export const uniqueGate = (label = "gate") => `${label}-${crypto.randomUUID()}`;

/** Lets everything waiting on a gate carry on, and anything that reaches it later. */
export const openGate = (
	lucid: Pick<Lucid, "lucidApi">,
	name: string,
): Promise<{ open: boolean; waiting: number }> =>
	control(lucid, CONTROL_PATHS.gate(name), { method: "POST" });

/** Waits until something is held at a gate, such as a model turn or the `harness_wait` tool. */
export const waitAtGate = async (
	lucid: Pick<Lucid, "lucidApi">,
	name: string,
	count = 1,
): Promise<void> => {
	const deadline = Date.now() + TIMEOUT_MS;
	while (Date.now() < deadline) {
		const status = await control<{ waiting: number }>(
			lucid,
			CONTROL_PATHS.gate(name),
		);
		if (status.waiting >= count) {
			return;
		}
		await sleep(POLL_MS);
	}
	throw new Error(`Nothing reached gate ${name} in ${TIMEOUT_MS} ms.`);
};

/** What `harness_write` recorded under a tag, oldest first. */
export const readEffects = <Effect = { value: string; operationId: string }>(
	lucid: Pick<Lucid, "lucidApi">,
	tag: string,
): Promise<Effect[]> => control(lucid, CONTROL_PATHS.effects(tag));

/** A tag no other test uses, for `harness_write`. */
export const uniqueTag = (label = "tag") => `${label}-${crypto.randomUUID()}`;

/** Model requests Lucid refused because the CMS sent a broken transcript, such as a call with no result. */
export const transcriptViolations = async (
	lucid: Pick<Lucid, "lucidApi">,
	connectionId: string,
): Promise<string[]> =>
	(await readLedger(lucid, connectionId)).flatMap((entry) =>
		entry.kind === "agent" && entry.violation
			? [`${entry.sessionId}: ${entry.violation}`]
			: [],
	);

/** What Lucid charged for a chat's requests, from its model and generate requests. */
export const chargedFor = async (
	lucid: Pick<Lucid, "lucidApi">,
	connectionId: string,
	sessionId: string,
): Promise<number> =>
	(await readLedger(lucid, connectionId))
		.filter(
			(entry) =>
				(entry.kind === "agent" || entry.kind === "generate") &&
				entry.sessionId === sessionId,
		)
		.reduce(
			(total, entry) =>
				total + ("creditsCharged" in entry ? entry.creditsCharged : 0),
			0,
		);

/** A usage session as the CMS records it, or null when it has none. */
export const usageSession = async (
	session: Session,
	type: AiUsageSession["type"],
	id: string,
): Promise<AiUsageSession | null> => {
	const response = await session.request<{ data: AiUsageSession }>({
		path: `/api/v1/ai/usage/sessions/${type}/${id}`,
	});
	if (response.status === 404) {
		return null;
	}
	if (!response.ok) {
		throw new Error(
			`Reading usage answered ${response.status}: ${JSON.stringify(response.body)}`,
		);
	}
	return response.body.data;
};
