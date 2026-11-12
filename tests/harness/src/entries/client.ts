/**
 * What shared helpers and tests use in every lane, whatever runs them: the client's types and
 * helpers, small media files, and how to talk to the harness's fakes, such as the scripts its
 * model answers from.
 */
export { CAPTCHA_TOKEN } from "../client/contract.ts";
export { expectOk } from "../client/admin.ts";
export { createRole, type InvitedUser } from "../client/invite-user.ts";
export type { Lucid } from "../client/open-lucid.ts";
export type {
	ApiRequest,
	ApiResponse,
	Credentials,
	Session,
} from "../client/types.ts";
export {
	CLIENT_METADATA_REDIRECT,
	type ClientMetadataScenario,
} from "../fakes/create-client-metadata.ts";
export { IDENTITY_PARAMS } from "../fakes/create-identity-provider.ts";
export {
	authorizeConnection,
	connectionStatus,
	connectSession,
} from "../fakes/lucid-api/connect.ts";
export { AGENT_MODELS } from "../fakes/lucid-api/models.ts";
export {
	callTool,
	callTools,
	failGenerate,
	failTurn,
	finishRoutine,
	gateGenerate,
	reply,
	type ScriptFailure,
	type ScriptTurn,
	script,
} from "../fakes/lucid-api/script.ts";
export {
	type AgentEntry,
	AI_FEATURES,
	CONTROL_PATHS,
	type FakeConnectionChange,
	type FakeConnectionView,
	type GenerateEntry,
	type LedgerEntry,
} from "../fakes/lucid-api/types.ts";
export type { OutboxEmail } from "../fakes/outbox.ts";
export type { MigrationDatabase } from "../migrations/types.ts";
export { files, type MediaFile } from "../utils/media-files.ts";
