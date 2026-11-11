import { randomUUID } from "node:crypto";
import type {
	ApiRequest,
	ApiResponse,
	Session,
} from "../harness/src/client/types.ts";
import { STORY_KEY } from "./collections/story.ts";

/** One permission, every permission in a list, or at least one of several. */
export type Requirement =
	| string
	| readonly string[]
	| { readonly some: readonly string[] };

/** Who may call a route, as `routes.test.ts` checks it. */
export type RouteAccess =
	/** Anyone, signed in or not. Such routes check tokens or credentials themselves. */
	| { kind: "public" }
	/** Anyone signed in, whatever their permissions. */
	| { kind: "signedIn" }
	/** Signed-in users who meet the requirement. Super admins always do. */
	| { kind: "permission"; requirement: Requirement }
	/** API keys with the scope. */
	| { kind: "scope"; scope: string }
	/** Checked inside the service, often by ownership, and tested in the named file. */
	| { kind: "elsewhere"; file: string }
	/** Not tested yet, with the reason. */
	| { kind: "notCovered"; reason: string };

/** What a route test sends besides the method and path. */
export type RouteRequest = {
	/** Values for the path's `{name}` parts, on top of `ROUTE_PARAMS`. */
	params?: Record<string, string | number>;
	query?: ApiRequest["query"];
	/** A body that passes validation, as some routes validate it before checking permissions. */
	body?: unknown;
	/** Sends the CSRF token on a GET, for the few that check it. */
	csrf?: boolean;
	/** The plugin that adds the route, which only setups with `plugin:<name>` serve. */
	plugin?: string;
	/**
	 * Why a user who meets the requirement is not sent the request, such as when it would reach
	 * Lucid's own servers. Their refusal checks still run.
	 */
	skipAllowed?: string;
};

export type RouteEntry = RouteAccess & RouteRequest;

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** A route as the CMS's OpenAPI document names it, such as `GET /api/v1/roles/{id}`. */
export type RouteKey = `${Method} /${string}`;

/** An ID no record has, so refused and allowed requests change nothing. */
const MISSING_ID = 999_999_999;

/** What a path's `{name}` parts are filled with, unless an entry gives its own. */
const ROUTE_PARAMS: Record<string, string | number> = {
	collectionKey: STORY_KEY,
	key: STORY_KEY,
	version: "latest",
	versionOrId: "latest",
	locale: "en",
	code: "en",
	token: "missing-token",
	tabId: "missing-tab",
	sessionId: "missing-session",
	type: "missing-type",
	providerId: "missing-provider",
	providerKey: "missing-provider",
};

const PUBLIC = { kind: "public" } as const satisfies RouteAccess;
const SIGNED_IN = { kind: "signedIn" } as const satisfies RouteAccess;

const needs = (
	requirement: Requirement,
	request: RouteRequest = {},
): RouteEntry => ({ kind: "permission", requirement, ...request });

const scope = (key: string, request: RouteRequest = {}): RouteEntry => ({
	kind: "scope",
	scope: key,
	...request,
});

const checkedIn = (file: string): RouteEntry => ({ kind: "elsewhere", file });

const notCovered = (reason: string): RouteEntry => ({
	kind: "notCovered",
	reason,
});

const NEEDS_AI = notCovered(
	"Needs AI switched on, which no setup has. Agent permissions come with it.",
);
const NEEDS_DEPLOY = notCovered("Needs a deploy in the setup's config.");
const NEEDS_TRANSFER = notCovered("Needs a transfer in the setup's config.");
const CHANGES_PAGE_PATHS =
	"It changes every page's paths, which other tests on the server use.";

//* people who give users roles pick from them, so they can read them too
const READ_ROLES = { some: ["roles:read", "users:create", "users:update"] };

const story = (action: string) => `documents:${STORY_KEY}:${action}`;
const ids = { ids: [MISSING_ID] };
const fields = { fields: [] };

/**
 * Route access expectations. `routes.test.ts` rejects unlisted CMS routes so new routes need an
 * explicit access decision.
 */
export const routes = {
	//* OAuth and discovery: each checks its own client credentials or tokens
	"GET /.well-known/oauth-authorization-server": PUBLIC,
	"GET /.well-known/oauth-protected-resource/api/v1/content": PUBLIC,
	"GET /.well-known/oauth-protected-resource/mcp": PUBLIC,
	"GET /api/v1/content/.well-known/oauth-protected-resource": PUBLIC,
	"GET /mcp/.well-known/oauth-protected-resource": PUBLIC,
	"GET /api/oauth/authorize": PUBLIC,
	"POST /api/oauth/token": PUBLIC,
	"POST /api/oauth/revoke": PUBLIC,
	"GET /cdn/{path}": PUBLIC,

	//* signing in
	"GET /api/v1/auth/csrf": PUBLIC,
	"GET /api/v1/auth/status": PUBLIC,
	"GET /api/v1/auth/setup-required": PUBLIC,
	"POST /api/v1/auth/setup": PUBLIC,
	"GET /api/v1/auth/providers": PUBLIC,
	"POST /api/v1/auth/providers/{providerKey}/initiate": PUBLIC,
	"GET /api/v1/auth/providers/{providerKey}/callback": PUBLIC,
	"POST /api/v1/auth/login": PUBLIC,
	"POST /api/v1/auth/logout": SIGNED_IN,
	"POST /api/v1/auth/token": PUBLIC,
	"POST /api/v1/auth/magic-link": PUBLIC,
	"GET /api/v1/auth/magic-link/validate/{token}": PUBLIC,
	"POST /api/v1/auth/magic-link/login": PUBLIC,
	"POST /api/v1/auth/passkey/options": PUBLIC,
	"POST /api/v1/auth/passkey/login": PUBLIC,
	"GET /api/v1/auth/two-factor": PUBLIC,
	"POST /api/v1/auth/two-factor/verify": PUBLIC,
	"POST /api/v1/auth/two-factor/setup": PUBLIC,
	"POST /api/v1/auth/two-factor/confirm": PUBLIC,
	"POST /api/v1/auth/two-factor/passkey/options": PUBLIC,
	"POST /api/v1/auth/two-factor/passkey/verify": PUBLIC,
	"POST /api/v1/auth/two-factor/passkey/setup": PUBLIC,
	"POST /api/v1/auth/two-factor/passkey/confirm": PUBLIC,
	"GET /api/v1/auth/invitation/validate/{token}": PUBLIC,
	"POST /api/v1/auth/invitation/accept/{token}": PUBLIC,
	"POST /api/v1/auth/invitation/accept/{token}/passkey/options": PUBLIC,
	"POST /api/v1/auth/invitation/accept/{token}/passkey": PUBLIC,
	"GET /api/v1/captcha": PUBLIC,

	//* your own account
	"GET /api/v1/account": SIGNED_IN,
	"PATCH /api/v1/account": SIGNED_IN,
	"PATCH /api/v1/account/preferences": SIGNED_IN,
	"GET /api/v1/account/oauth-connections": SIGNED_IN,
	"PATCH /api/v1/account/oauth-connections/{id}": SIGNED_IN,
	"DELETE /api/v1/account/oauth-connections/{id}": SIGNED_IN,
	"GET /api/v1/account/integrations/scopes": SIGNED_IN,
	"GET /api/v1/account/integrations": SIGNED_IN,
	"POST /api/v1/account/integrations": SIGNED_IN,
	"GET /api/v1/account/integrations/{id}": SIGNED_IN,
	"PATCH /api/v1/account/integrations/{id}": SIGNED_IN,
	"DELETE /api/v1/account/integrations/{id}": SIGNED_IN,
	"POST /api/v1/account/integrations/{id}/regenerate-keys": SIGNED_IN,
	"DELETE /api/v1/account/email-change": SIGNED_IN,
	"GET /api/v1/account/email-change/confirm/{token}": PUBLIC,
	"PATCH /api/v1/account/email-change/confirm/{token}": PUBLIC,
	"GET /api/v1/account/email-change/revert/{token}": PUBLIC,
	"PATCH /api/v1/account/email-change/revert/{token}": PUBLIC,
	"POST /api/v1/account/profile-picture/upload-session": SIGNED_IN,
	"POST /api/v1/account/profile-picture": SIGNED_IN,
	"DELETE /api/v1/account/profile-picture": SIGNED_IN,
	"POST /api/v1/account/reset-password": PUBLIC,
	"GET /api/v1/account/reset-password/{token}": PUBLIC,
	"PATCH /api/v1/account/reset-password/{token}": PUBLIC,
	"POST /api/v1/account/revoke-refresh-tokens": SIGNED_IN,
	"POST /api/v1/account/reauthenticate/options": SIGNED_IN,
	"POST /api/v1/account/reauthenticate": SIGNED_IN,
	"POST /api/v1/account/two-factor/setup": SIGNED_IN,
	"POST /api/v1/account/two-factor/confirm": SIGNED_IN,
	"POST /api/v1/account/two-factor/recovery-codes": SIGNED_IN,
	"POST /api/v1/account/two-factor/disable": SIGNED_IN,
	"POST /api/v1/account/passkeys/options": SIGNED_IN,
	"POST /api/v1/account/passkeys": SIGNED_IN,
	"PATCH /api/v1/account/passkeys/{id}": SIGNED_IN,
	"DELETE /api/v1/account/passkeys/{id}": SIGNED_IN,
	"DELETE /api/v1/account/auth-providers/{providerId}": SIGNED_IN,

	//* AI and agents
	"GET /api/v1/ai/credits": NEEDS_AI,
	"GET /api/v1/ai/usage/chart": NEEDS_AI,
	"GET /api/v1/ai/usage/sessions": NEEDS_AI,
	"GET /api/v1/ai/usage/sessions/{type}/{id}": NEEDS_AI,
	"GET /api/v1/ai/usage/sessions/{type}/{id}/records": NEEDS_AI,
	"GET /api/v1/ai/media/models/{type}": NEEDS_AI,
	"POST /api/v1/ai/media/image": NEEDS_AI,
	"POST /api/v1/ai/media/audio": NEEDS_AI,
	"POST /api/v1/ai/media/alt": NEEDS_AI,
	"GET /api/v1/ai/media/files/{key}": NEEDS_AI,
	"GET /api/v1/ai/media/generations/{id}": NEEDS_AI,
	"POST /api/v1/ai/media/generations/{id}/save": NEEDS_AI,
	"GET /api/v1/agent/definitions": NEEDS_AI,
	"GET /api/v1/agent/models/{agentKey}": NEEDS_AI,
	"POST /api/v1/agent/uploads/session": NEEDS_AI,
	"POST /api/v1/agent/uploads": NEEDS_AI,
	"GET /api/v1/agent/conversations": NEEDS_AI,
	"POST /api/v1/agent/conversations": NEEDS_AI,
	"GET /api/v1/agent/conversations/{id}": NEEDS_AI,
	"PATCH /api/v1/agent/conversations/{id}": NEEDS_AI,
	"DELETE /api/v1/agent/conversations/{id}": NEEDS_AI,
	"POST /api/v1/agent/conversations/{id}/title/generate": NEEDS_AI,
	"GET /api/v1/agent/conversations/{id}/details": NEEDS_AI,
	"GET /api/v1/agent/conversations/{id}/subagents": NEEDS_AI,
	"GET /api/v1/agent/conversations/{id}/media-previews": NEEDS_AI,
	"GET /api/v1/agent/conversations/{id}/references": NEEDS_AI,
	"DELETE /api/v1/agent/conversations/{id}/references/{referenceId}": NEEDS_AI,
	"GET /api/v1/agent/conversations/{id}/messages": NEEDS_AI,
	"POST /api/v1/agent/conversations/{id}/messages": NEEDS_AI,
	"GET /api/v1/agent/conversations/{id}/messages/{messageId}/tools/{toolCallId}":
		NEEDS_AI,
	"PATCH /api/v1/agent/conversations/{id}/inputs": NEEDS_AI,
	"POST /api/v1/agent/conversations/{id}/compact": NEEDS_AI,
	"POST /api/v1/agent/conversations/{id}/retry": NEEDS_AI,
	"POST /api/v1/agent/conversations/{id}/branch": NEEDS_AI,
	"POST /api/v1/agent/runs/{id}/respond": NEEDS_AI,
	"POST /api/v1/agent/runs/{id}/cancel": NEEDS_AI,
	"GET /api/v1/agent/runs/{id}/events": NEEDS_AI,
	"GET /api/v1/agent/routines": NEEDS_AI,
	"POST /api/v1/agent/routines": NEEDS_AI,
	"GET /api/v1/agent/routines/{id}": NEEDS_AI,
	"PATCH /api/v1/agent/routines/{id}": NEEDS_AI,
	"DELETE /api/v1/agent/routines/{id}": NEEDS_AI,
	"POST /api/v1/agent/routines/{id}/run": NEEDS_AI,
	"GET /api/v1/agent/routines/{id}/runs": NEEDS_AI,
	"GET /api/v1/agent/memories": NEEDS_AI,
	"POST /api/v1/agent/memories": NEEDS_AI,
	"PATCH /api/v1/agent/memories/{id}": NEEDS_AI,
	"DELETE /api/v1/agent/memories": NEEDS_AI,
	"POST /api/v1/documents/{collectionKey}/translate": NEEDS_AI,
	"POST /api/v1/documents/{collectionKey}/translate/status": NEEDS_AI,

	//* integrations
	"GET /api/v1/integrations/scopes": needs("integrations:read"),
	"GET /api/v1/integrations": needs("integrations:read"),
	"POST /api/v1/integrations": needs("integrations:create", {
		body: { name: "Refused", scopes: [] },
	}),
	"GET /api/v1/integrations/{id}": needs("integrations:read"),
	"PATCH /api/v1/integrations/{id}": needs("integrations:update"),
	"DELETE /api/v1/integrations/{id}": needs("integrations:delete"),
	"POST /api/v1/integrations/{id}/regenerate-keys": needs(
		"integrations:regenerate",
	),
	"GET /api/v1/integrations/oauth-clients": needs("integrations:read"),
	"POST /api/v1/integrations/oauth-clients": needs("integrations:create"),
	"POST /api/v1/integrations/oauth-clients/logo/upload-session": needs(
		"integrations:create",
	),
	"GET /api/v1/integrations/oauth-clients/{id}": needs("integrations:read"),
	"PATCH /api/v1/integrations/oauth-clients/{id}": needs("integrations:update"),
	"DELETE /api/v1/integrations/oauth-clients/{id}": needs(
		"integrations:delete",
	),
	"POST /api/v1/integrations/oauth-clients/{id}/logo/upload-session": needs(
		"integrations:update",
	),
	"POST /api/v1/integrations/oauth-clients/{id}/regenerate-secret": needs(
		"integrations:regenerate",
	),
	"GET /api/v1/integrations/oauth": needs("integrations:read"),
	"GET /api/v1/integrations/oauth/authorization/{requestId}": SIGNED_IN,
	"POST /api/v1/integrations/oauth/authorization/{requestId}": SIGNED_IN,
	"PATCH /api/v1/integrations/oauth/{id}": SIGNED_IN,
	"DELETE /api/v1/integrations/oauth/{id}": SIGNED_IN,

	//* collections and documents
	"GET /api/v1/collections": SIGNED_IN,
	"GET /api/v1/collections/{key}": needs(story("read")),
	"POST /api/v1/documents/{collectionKey}": needs(story("create"), {
		body: fields,
	}),
	"DELETE /api/v1/documents/{collectionKey}": needs(story("delete"), {
		body: ids,
	}),
	"POST /api/v1/documents/{collectionKey}/restore": needs(story("update"), {
		body: ids,
	}),
	"DELETE /api/v1/documents/{collectionKey}/permanent": needs(story("delete"), {
		body: ids,
	}),
	"POST /api/v1/documents/{collectionKey}/request":
		checkedIn("documents.test.ts"),
	"POST /api/v1/documents/{collectionKey}/refs": needs(story("read")),
	"GET /api/v1/documents/{collectionKey}/workflow/assignees": needs(
		story("read"),
	),
	"GET /api/v1/documents/{collectionKey}/{version}": needs(story("read")),
	"POST /api/v1/documents/{collectionKey}/{id}": needs(story("update"), {
		body: fields,
	}),
	"DELETE /api/v1/documents/{collectionKey}/{id}": needs(story("delete")),
	"DELETE /api/v1/documents/{collectionKey}/{id}/permanent": needs(
		story("delete"),
	),
	"POST /api/v1/documents/{collectionKey}/{id}/duplicate": needs([
		story("read"),
		story("create"),
	]),
	"POST /api/v1/documents/{collectionKey}/{id}/publish": needs(
		[story("read"), story("publish")],
		{ body: { environment: "staging" } },
	),
	"POST /api/v1/documents/{collectionKey}/{id}/unpublish": needs(
		[story("read"), story("publish")],
		{ body: { environment: "staging" } },
	),
	"PATCH /api/v1/documents/{collectionKey}/{id}/workflow": needs(
		story("update"),
	),
	"PATCH /api/v1/documents/{collectionKey}/{id}/order": needs(story("update"), {
		body: { previousDocumentId: null, nextDocumentId: null },
	}),
	"PUT /api/v1/documents/{collectionKey}/{id}/editors/{tabId}": needs(
		story("read"),
		{ body: { requestId: null } },
	),
	"DELETE /api/v1/documents/{collectionKey}/{id}/editors/{tabId}": needs(
		story("read"),
	),
	"POST /api/v1/documents/{collectionKey}/{id}/preview": needs(story("read"), {
		body: { versionType: "latest" },
	}),
	"DELETE /api/v1/documents/{collectionKey}/{id}/preview": needs(
		story("update"),
	),
	"GET /api/v1/documents/{collectionKey}/{id}/revisions": needs(story("read")),
	"GET /api/v1/documents/{collectionKey}/{id}/{versionOrId}": needs(
		story("read"),
	),
	//* writes to the latest version need update, which `documents.test.ts` checks
	"PATCH /api/v1/documents/{collectionKey}/{id}/{versionId}": needs(
		story("read"),
		{ body: fields },
	),
	"POST /api/v1/documents/{collectionKey}/{id}/{versionId}/check": needs(
		story("read"),
	),
	"PUT /api/v1/documents/{collectionKey}/{id}/{versionId}/preview-draft": needs(
		story("read"),
		{
			body: { token: "missing-token", revision: 1, draft: null },
			skipAllowed: "It needs a live preview token.",
		},
	),
	"POST /api/v1/documents/{collectionKey}/{id}/{versionId}/align": needs(
		story("update"),
		{
			body: {
				source: "staging",
				sourceContentId: "missing",
				destinationContentId: "missing",
			},
		},
	),
	"POST /api/v1/documents/{collectionKey}/{id}/{versionId}/restore-revision":
		needs(story("restore")),
	"POST /api/v1/documents/{collectionKey}/{id}/{versionId}/promote-version":
		needs([story("read"), story("publish")], {
			body: { versionType: "staging" },
		}),

	//* the content API, called with API keys
	"GET /api/v1/content/document/{collectionKey}": scope(story("read")),
	"GET /api/v1/content/documents/{collectionKey}": scope(story("read")),
	"GET /api/v1/content/media": scope("media:read"),
	"GET /api/v1/content/media/{id}": scope("media:read"),
	"POST /api/v1/content/media/resolve/{key}": scope("media:resolve-url"),
	"GET /api/v1/content/locales": scope("locales:read"),
	"GET /api/v1/content/account": checkedIn("api-keys.test.ts"),
	"GET /api/v1/content/redirects/resolve": notCovered(
		"Needs the pages plugin, which only node-postgres has.",
	),
	//* previews are opened with the preview token in the body
	"POST /api/v1/content/preview": PUBLIC,

	//* requests and review
	"GET /api/v1/review/overview": needs("requests:read"),
	"GET /api/v1/requests": needs("requests:read"),
	"POST /api/v1/requests": needs("requests:read"),
	"GET /api/v1/requests/overview": needs("requests:read"),
	"GET /api/v1/requests/{id}": needs("requests:read"),
	"PATCH /api/v1/requests/{id}": needs("requests:read"),
	"GET /api/v1/requests/{id}/execution": needs("requests:read"),
	"GET /api/v1/requests/{id}/reviewers": needs("requests:read"),
	"GET /api/v1/requests/{id}/mentionable-users": needs("requests:read"),
	"POST /api/v1/requests/{id}/documents": needs("requests:read"),
	"DELETE /api/v1/requests/{id}/documents/{requestDocumentId}":
		needs("requests:read"),
	"PATCH /api/v1/requests/{id}/documents/{requestDocumentId}/targets":
		needs("requests:read"),
	"PATCH /api/v1/requests/{id}/documents/{requestDocumentId}/targets/acknowledgement":
		needs("requests:read"),
	"POST /api/v1/requests/{id}/approve": needs("requests:read"),
	"POST /api/v1/requests/{id}/unapprove": needs("requests:read"),
	"POST /api/v1/requests/{id}/complete": needs("requests:read"),
	"POST /api/v1/requests/{id}/close": needs("requests:read"),
	"POST /api/v1/requests/{id}/reopen": needs("requests:read"),
	"POST /api/v1/requests/{id}/comments": needs("requests:read"),
	"PATCH /api/v1/requests/{id}/comments/{commentId}": needs("requests:read"),
	"DELETE /api/v1/requests/{id}/comments/{commentId}": needs("requests:read"),
	"PATCH /api/v1/requests/{id}/comments/{commentId}/resolution":
		needs("requests:read"),

	//* media
	"GET /api/v1/media": checkedIn("ownership.test.ts"),
	"POST /api/v1/media": needs("media:create"),
	"GET /api/v1/media/{id}": checkedIn("ownership.test.ts"),
	"PATCH /api/v1/media/{id}": needs("media:update"),
	"DELETE /api/v1/media/{id}": needs("media:delete"),
	"DELETE /api/v1/media/{id}/permanent": needs("media:delete"),
	"DELETE /api/v1/media/batch": needs("media:delete"),
	"DELETE /api/v1/media/permanent": needs("media:delete"),
	"POST /api/v1/media/restore": needs("media:update"),
	"PATCH /api/v1/media/{id}/move": needs("media:update"),
	"POST /api/v1/media/{id}/download": needs("media:read"),
	"POST /api/v1/media/{id}/add-to-library": needs("media:create"),
	"DELETE /api/v1/media/processed": needs("media:update"),
	"DELETE /api/v1/media/{id}/processed": needs("media:update"),
	"GET /api/v1/media/folders": SIGNED_IN,
	"GET /api/v1/media/folders/hierarchy": SIGNED_IN,
	"POST /api/v1/media/folders": needs("media:create"),
	"PATCH /api/v1/media/folders/{id}": needs("media:update"),
	"DELETE /api/v1/media/folders/{id}": needs("media:delete"),
	"POST /api/v1/media/upload-session": needs(["media:create", "media:update"]),
	"GET /api/v1/media/upload-session/{sessionId}": {
		...SIGNED_IN,
		csrf: true,
	},
	"DELETE /api/v1/media/upload-session/{sessionId}": SIGNED_IN,
	"POST /api/v1/media/upload-session/{sessionId}/parts": SIGNED_IN,
	"POST /api/v1/media/upload-session/{sessionId}/complete": SIGNED_IN,
	"GET /api/v1/media/{id}/share-links": SIGNED_IN,
	"POST /api/v1/media/{id}/share-links": needs("media:create"),
	"DELETE /api/v1/media/{id}/share-links": needs("media:delete"),
	"DELETE /api/v1/media/share-links": needs("media:delete"),
	"GET /api/v1/media/{id}/share-links/{linkId}": SIGNED_IN,
	"PATCH /api/v1/media/{id}/share-links/{linkId}": needs("media:update"),
	"DELETE /api/v1/media/{id}/share-links/{linkId}": needs("media:delete"),
	"GET /api/v1/share/{token}": PUBLIC,
	"GET /api/v1/share/{token}/stream": PUBLIC,
	"POST /api/v1/share/{token}/authorize": PUBLIC,
	"POST /api/v1/share/{token}/download": PUBLIC,

	//* users and roles
	"GET /api/v1/users": SIGNED_IN,
	"POST /api/v1/users": needs("users:create"),
	"GET /api/v1/users/{id}": SIGNED_IN,
	"PATCH /api/v1/users/{id}": needs("users:update"),
	"DELETE /api/v1/users/{id}": needs("users:delete"),
	"DELETE /api/v1/users/{id}/permanent": needs("users:delete"),
	"DELETE /api/v1/users/permanent": needs("users:delete"),
	"POST /api/v1/users/restore": needs("users:update"),
	"GET /api/v1/users/logins/{id}": SIGNED_IN,
	"POST /api/v1/users/{id}/resend-invitation": needs("users:create"),
	"POST /api/v1/users/{id}/revoke-refresh-tokens": needs("users:update"),
	"POST /api/v1/users/{id}/reset-two-factor": needs("users:update"),
	"DELETE /api/v1/users/{id}/passkeys": needs("users:update"),
	"DELETE /api/v1/users/{id}/auth-providers/{providerId}":
		needs("users:update"),
	"POST /api/v1/users/{id}/profile-picture/upload-session":
		needs("users:update"),
	"POST /api/v1/users/{id}/profile-picture": needs("users:update"),
	"DELETE /api/v1/users/{id}/profile-picture": needs("users:update"),
	"GET /api/v1/users/{userId}/oauth-connections": needs("users:read"),
	"PATCH /api/v1/users/{userId}/oauth-connections/{id}": SIGNED_IN,
	"DELETE /api/v1/users/{userId}/oauth-connections/{id}": SIGNED_IN,
	"GET /api/v1/users/{userId}/integrations/scopes":
		checkedIn("ownership.test.ts"),
	"GET /api/v1/users/{userId}/integrations": checkedIn("ownership.test.ts"),
	"POST /api/v1/users/{userId}/integrations": checkedIn("ownership.test.ts"),
	"GET /api/v1/users/{userId}/integrations/{id}":
		checkedIn("ownership.test.ts"),
	"PATCH /api/v1/users/{userId}/integrations/{id}":
		checkedIn("ownership.test.ts"),
	"DELETE /api/v1/users/{userId}/integrations/{id}":
		checkedIn("ownership.test.ts"),
	"POST /api/v1/users/{userId}/integrations/{id}/regenerate-keys":
		checkedIn("ownership.test.ts"),
	"GET /api/v1/roles": needs(READ_ROLES),
	"POST /api/v1/roles": needs("roles:create"),
	"GET /api/v1/roles/{id}": needs(READ_ROLES),
	"PATCH /api/v1/roles/{id}": needs("roles:update"),
	"DELETE /api/v1/roles/{id}": needs("roles:delete"),
	"GET /api/v1/permissions": SIGNED_IN,

	//* emails and jobs
	"GET /api/v1/emails": needs("email:read"),
	"GET /api/v1/emails/{id}": needs("email:read"),
	"GET /api/v1/emails/{id}/transactions": needs("email:read"),
	"DELETE /api/v1/emails/{id}": needs("email:delete"),
	"POST /api/v1/emails/{id}/resend": needs("email:send"),
	"GET /api/v1/jobs": needs("jobs:read"),
	"GET /api/v1/jobs/{id}": needs("jobs:read"),
	"GET /api/v1/jobs/schedules": needs("jobs:read"),
	"PATCH /api/v1/jobs/schedules/state": needs("jobs:update"),
	"POST /api/v1/jobs/schedules/trigger": needs("jobs:run"),

	//* settings and system
	"GET /api/v1/settings": SIGNED_IN,
	"DELETE /api/v1/settings/kv": needs("cache:clear"),
	"GET /api/v1/i18n/admin": SIGNED_IN,
	"GET /api/v1/i18n/admin/{locale}": SIGNED_IN,
	"GET /api/v1/locales": SIGNED_IN,
	"GET /api/v1/locales/{code}": SIGNED_IN,
	"GET /api/v1/diagnostics": needs("settings:read"),
	"GET /api/v1/diagnostics/updates": needs("settings:read"),
	"POST /api/v1/diagnostics/checks": needs("settings:read"),
	"POST /api/v1/diagnostics/bug-reports": needs("settings:read"),
	"GET /api/v1/connection/status": SIGNED_IN,
	"GET /api/v1/connection/callback": PUBLIC,
	"POST /api/v1/connection/connect": needs("connection:update"),
	"POST /api/v1/connection/verify": needs("connection:update"),
	"POST /api/v1/connection/reset": needs("connection:update"),
	"DELETE /api/v1/connection": needs("connection:update"),
	"GET /api/v1/notifications": SIGNED_IN,
	"PATCH /api/v1/notifications": SIGNED_IN,
	"GET /api/v1/notifications/summary": SIGNED_IN,
	"GET /api/v1/notifications/preferences": SIGNED_IN,
	"PATCH /api/v1/notifications/preferences": SIGNED_IN,
	"GET /api/v1/notifications/types": needs("settings:read"),
	"PATCH /api/v1/notifications/types/{type}": needs("settings:update"),
	"GET /api/v1/translations/settings": needs("settings:read"),
	"POST /api/v1/translations/glossary": needs("settings:update"),
	"PATCH /api/v1/translations/glossary/{id}": needs("settings:update"),
	"DELETE /api/v1/translations/glossary/{id}": needs("settings:update"),
	"PUT /api/v1/translations/styles/{locale}": needs("settings:update"),
	"GET /api/v1/deploys": NEEDS_DEPLOY,
	"GET /api/v1/deploys/runs": NEEDS_DEPLOY,
	"POST /api/v1/deploys/{key}/run": NEEDS_DEPLOY,
	"PATCH /api/v1/deploys/{key}/state": NEEDS_DEPLOY,
	"POST /api/v1/deploys/runs/{id}/cancel": NEEDS_DEPLOY,
	"POST /api/v1/deploys/runs/{id}/callback": PUBLIC,
	"POST /api/v1/deploys/{key}/webhook": PUBLIC,
	"POST /api/v1/transfer/export": NEEDS_TRANSFER,
	"POST /api/v1/transfer/import/check": NEEDS_TRANSFER,
	"POST /api/v1/transfer/import": NEEDS_TRANSFER,

	//* plugins: signed upload and download links for filesystem media
	"PUT /api/v1/fs/upload": { ...PUBLIC, plugin: "filesystem" },
	"GET /api/v1/fs/download": { ...PUBLIC, plugin: "filesystem" },
	//* plugins: the same for media in R2, sent through the Worker's bucket binding
	"PUT /api/v1/media/r2/storage/upload": { ...PUBLIC, plugin: "cloudflare-r2" },
	"GET /api/v1/media/r2/storage/download": {
		...PUBLIC,
		plugin: "cloudflare-r2",
	},
	//* plugins: page paths, only for the collections the pages plugin manages
	"POST /api/v1/pages/rebuild-paths": needs("settings:update", {
		plugin: "pages",
		skipAllowed: CHANGES_PAGE_PATHS,
	}),
	"POST /api/v1/pages/clear-path-history": needs("settings:update", {
		plugin: "pages",
		skipAllowed: CHANGES_PAGE_PATHS,
	}),
	"GET /api/v1/pages/previous-paths/landing-page/{documentId}": needs(
		"documents:landing-page:read",
		{ plugin: "pages" },
	),
	"DELETE /api/v1/pages/previous-paths/landing-page/{documentId}/{id}": needs(
		"documents:landing-page:update",
		{ plugin: "pages" },
	),
} satisfies Record<RouteKey, RouteEntry>;

/** Splits a route key into its method and its path with every `{name}` filled in. */
export const resolveRoute = (key: RouteKey, entry: RouteRequest) => {
	const [method, template] = key.split(" ") as [Method, string];
	const values = { ...ROUTE_PARAMS, ...entry.params };
	const path = template.replace(/\{(\w+)\}/g, (_, name: string) =>
		String(values[name] ?? MISSING_ID),
	);
	return { method, path };
};

/** Sends a route's request as a session, with the body and query its entry gives. */
export const callRoute = (
	session: Session,
	key: RouteKey,
	entry: RouteRequest,
): Promise<ApiResponse<unknown>> => {
	const { method, path } = resolveRoute(key, entry);
	return session.request({
		method,
		path,
		query: entry.query,
		csrf: entry.csrf,
		body: entry.body ?? (method === "GET" ? undefined : {}),
	});
};

/** Every permission a requirement names. */
const requirementPermissions = (
	requirement: Requirement,
): readonly string[] => {
	if (typeof requirement === "string") {
		return [requirement];
	}
	return isSome(requirement) ? requirement.some : requirement;
};

/** Whether a requirement is met by any one of its options. Arrays have a `some` method, so `in` can't tell. */
const isSome = (
	requirement: Requirement,
): requirement is { readonly some: readonly string[] } =>
	typeof requirement === "object" && !Array.isArray(requirement);

/**
 * The smallest sets of permissions that meet a requirement, and the largest that don't: all
 * permissions but one of a list, or all but every option of `some`.
 */
export const requirementCases = (
	requirement: Requirement,
	allPermissions: readonly string[],
) => {
	const named = requirementPermissions(requirement);
	const without = (left: readonly string[]) =>
		allPermissions.filter((permission) => !left.includes(permission));
	const anyOne = isSome(requirement);

	return {
		meets: anyOne ? named.map((permission) => [permission]) : [named],
		misses: anyOne
			? [without(named)]
			: named.map((permission) => without([permission])),
	};
};

/** Reads every permission a role can be given, from the CMS. */
export const listPermissions = async (admin: Session): Promise<string[]> => {
	type Group = {
		permissions: Array<{ key: string }>;
		subgroups?: Array<{ permissions: Array<{ key: string }> }>;
	};
	const response = await admin.request<{ data: Group[] }>({
		path: "/api/v1/permissions",
	});
	if (response.status !== 200) {
		throw new Error(`Listing permissions gave ${response.status}.`);
	}
	return response.body.data.flatMap((group) => [
		...group.permissions.map((permission) => permission.key),
		...(group.subgroups ?? []).flatMap((subgroup) =>
			subgroup.permissions.map((permission) => permission.key),
		),
	]);
};

export { createRole } from "../harness/src/client/invite-user.ts";

/** Replaces a role's permissions. A role change applies to its users' next request. */
export const setRolePermissions = async (
	admin: Session,
	roleId: number,
	permissions: readonly string[],
): Promise<void> => {
	const updated = await admin.request({
		method: "PATCH",
		path: `/api/v1/roles/${roleId}`,
		body: { permissions },
	});
	if (updated.status !== 204) {
		throw new Error(
			`Updating role ${roleId} gave ${updated.status}: ${JSON.stringify(updated.body)}`,
		);
	}
};

/** A unique name, for records a test makes in a database it may share. */
export const uniqueName = (prefix: string) =>
	`${prefix} ${randomUUID().slice(0, 8)}`;
