import "./style.css";
import {
	createOAuthTransaction,
	decodeAccessToken,
	discoverOAuth,
	exchangeAuthorizationCode,
	refreshOAuthTokens,
	revokeOAuthTokens,
} from "./oauth";
import type {
	ActivityKind,
	Discovery,
	OAuthTransaction,
	TokenState,
} from "./types";

const transactionKey = "lucid-oauth-playground.transaction";
const baseUrlKey = "lucid-oauth-playground.base-url";
const transactionLifetimeMs = 6 * 60 * 1000;

const element = <T extends HTMLElement>(id: string) =>
	document.getElementById(id) as T;

const ui = {
	serverState: element<HTMLDivElement>("server-state"),
	serverStateLabel: element<HTMLSpanElement>("server-state-label"),
	lucidUrl: element<HTMLInputElement>("lucid-url"),
	discoverButton: element<HTMLButtonElement>("discover-button"),
	connectButton: element<HTMLButtonElement>("connect-button"),
	readScopesButton: element<HTMLButtonElement>("read-scopes-button"),
	scopeList: element<HTMLDivElement>("scope-list"),
	issuer: element<HTMLElement>("issuer-value"),
	resource: element<HTMLElement>("resource-value"),
	clientId: element<HTMLElement>("client-id-value"),
	redirect: element<HTMLElement>("redirect-value"),
	notice: element<HTMLDivElement>("notice"),
	noticeTitle: element<HTMLElement>("notice-title"),
	noticeCopy: element<HTMLElement>("notice-copy"),
	noticeClose: element<HTMLButtonElement>("notice-close"),
	flowDiscover: element<HTMLDivElement>("flow-discover"),
	flowAuthorize: element<HTMLDivElement>("flow-authorize"),
	flowRequest: element<HTMLDivElement>("flow-request"),
	tokenEmpty: element<HTMLDivElement>("token-empty"),
	tokenContent: element<HTMLDivElement>("token-content"),
	tokenStatus: element<HTMLSpanElement>("token-status"),
	principalIcon: element<HTMLDivElement>("principal-icon"),
	principalValue: element<HTMLElement>("principal-value"),
	grantValue: element<HTMLElement>("grant-value"),
	expiresValue: element<HTMLElement>("expires-value"),
	accessToken: element<HTMLElement>("access-token-value"),
	refreshToken: element<HTMLElement>("refresh-token-value"),
	grantedScopes: element<HTMLDivElement>("granted-scopes"),
	revealTokenButton: element<HTMLButtonElement>("reveal-token-button"),
	refreshButton: element<HTMLButtonElement>("refresh-button"),
	revokeButton: element<HTMLButtonElement>("revoke-button"),
	clearButton: element<HTMLButtonElement>("clear-button"),
	oauthTab: element<HTMLButtonElement>("oauth-tab"),
	apiKeyTab: element<HTMLButtonElement>("api-key-tab"),
	apiKeyField: element<HTMLDivElement>("api-key-field"),
	apiKey: element<HTMLInputElement>("api-key-value"),
	requestMethod: element<HTMLSelectElement>("request-method"),
	requestPath: element<HTMLInputElement>("request-path"),
	bodyField: element<HTMLDivElement>("body-field"),
	requestBody: element<HTMLTextAreaElement>("request-body"),
	requestAuthCaption: element<HTMLElement>("request-auth-caption"),
	sendButton: element<HTMLButtonElement>("send-button"),
	responseShell: document.querySelector(".response-shell") as HTMLDivElement,
	responseStatus: element<HTMLElement>("response-status"),
	responseTime: element<HTMLElement>("response-time"),
	responseValue: element<HTMLElement>("response-value"),
	activityList: element<HTMLOListElement>("activity-list"),
	clearActivityButton: element<HTMLButtonElement>("clear-activity-button"),
};

let discovery: Discovery | undefined;
let tokens: TokenState | undefined;
let requestAuth: "oauth" | "api-key" = "oauth";
let revealTokens = false;

const clientId = new URL(
	import.meta.env.VITE_OAUTH_CLIENT_ID ?? "/oauth-client.json",
	window.location.origin,
).toString();
const redirectUri = new URL("/callback", window.location.origin).toString();

const setButtonBusy = (
	button: HTMLButtonElement,
	busy: boolean,
	busyCopy?: string,
) => {
	if (busy) {
		button.dataset.copy = button.textContent ?? "";
		if (busyCopy) button.textContent = busyCopy;
		button.disabled = true;
		return;
	}

	if (button.dataset.copy) button.textContent = button.dataset.copy;
	button.disabled = false;
};

const showNotice = (
	title: string,
	copy: string,
	kind: "error" | "success" = "error",
) => {
	ui.notice.dataset.kind = kind;
	ui.noticeTitle.textContent = title;
	ui.noticeCopy.textContent = copy;
	ui.notice.classList.remove("is-hidden");
};

const hideNotice = () => {
	ui.notice.classList.add("is-hidden");
};

const addActivity = (
	title: string,
	copy: string,
	kind: ActivityKind = "neutral",
) => {
	ui.activityList.querySelector(".activity-empty")?.remove();

	const item = document.createElement("li");
	item.className = "activity-item";
	item.dataset.kind = kind;

	const time = document.createElement("time");
	time.dateTime = new Date().toISOString();
	time.textContent = new Intl.DateTimeFormat(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).format(new Date());

	const mark = document.createElement("span");
	mark.className = "activity-mark";

	const content = document.createElement("div");
	const heading = document.createElement("strong");
	heading.textContent = title;
	const description = document.createElement("p");
	description.textContent = copy;
	content.append(heading, description);

	item.append(time, mark, content);
	ui.activityList.prepend(item);
};

const selectedScopes = () =>
	Array.from(
		ui.scopeList.querySelectorAll<HTMLInputElement>(
			'input[type="checkbox"]:checked',
		),
	).map((input) => input.value);

const scopeDetails = (scope: string) => {
	const parts = scope.split(":");
	const action = parts.at(-1) ?? scope;
	const subject =
		parts[0] === "documents"
			? parts.slice(1, -1).join(" ")
			: (parts[0] ?? scope);

	const title = `${subject.replace(/[-_]/g, " ")} · ${action}`.replace(
		/\b\w/g,
		(value) => value.toUpperCase(),
	);

	return {
		title,
		copy:
			action === "read"
				? `Read ${subject.replace(/[-_]/g, " ")} data`
				: `${action.replace(/[-_]/g, " ")} ${subject.replace(/[-_]/g, " ")}`,
	};
};

const updateConnectButton = () => {
	ui.connectButton.disabled = !discovery || selectedScopes().length === 0;
};

const renderScopes = (scopes: string[]) => {
	ui.scopeList.replaceChildren();

	for (const [index, scope] of scopes.entries()) {
		const details = scopeDetails(scope);
		const label = document.createElement("label");
		label.className = "scope-option";

		const input = document.createElement("input");
		input.type = "checkbox";
		input.value = scope;
		input.checked =
			scope === "locales:read" ||
			(scope.endsWith(":read") &&
				index === scopes.findIndex((candidate) => candidate.endsWith(":read")));
		input.addEventListener("change", updateConnectButton);

		const check = document.createElement("span");
		check.className = "scope-check";
		check.textContent = "✓";

		const content = document.createElement("div");
		const title = document.createElement("strong");
		title.textContent = details.title;
		const copy = document.createElement("small");
		copy.textContent = scope;
		content.append(title, copy);

		label.append(input, check, content);
		ui.scopeList.append(label);
	}

	updateConnectButton();
};

const renderDiscovery = () => {
	if (!discovery) return;

	ui.issuer.textContent = discovery.server.issuer;
	ui.issuer.title = discovery.server.issuer;
	ui.resource.textContent = discovery.resource.resource;
	ui.resource.title = discovery.resource.resource;
	ui.clientId.textContent = clientId;
	ui.clientId.title = clientId;
	ui.redirect.textContent = redirectUri;
	ui.redirect.title = redirectUri;
	ui.serverState.dataset.state = "ready";
	ui.serverStateLabel.textContent = "Lucid discovered";
	ui.flowDiscover.classList.add("is-complete");
	ui.flowDiscover.classList.remove("is-current");
	ui.flowAuthorize.classList.add("is-current");
	renderScopes(discovery.server.scopes_supported);
};

const discover = async () => {
	hideNotice();
	ui.serverState.dataset.state = "loading";
	ui.serverStateLabel.textContent = "Discovering…";
	setButtonBusy(ui.discoverButton, true, "Checking…");

	try {
		const baseUrl = new URL(ui.lucidUrl.value).origin;
		localStorage.setItem(baseUrlKey, baseUrl);
		discovery = await discoverOAuth(baseUrl);
		renderDiscovery();
		addActivity(
			"Server discovered",
			`Loaded authorization and resource metadata from ${baseUrl}.`,
			"success",
		);
	} catch (error) {
		discovery = undefined;
		ui.serverState.dataset.state = "error";
		ui.serverStateLabel.textContent = "Discovery failed";
		ui.scopeList.replaceChildren();
		const message =
			error instanceof Error ? error.message : "OAuth discovery failed.";
		showNotice("Could not discover Lucid", message);
		addActivity("Discovery failed", message, "error");
		updateConnectButton();
	} finally {
		setButtonBusy(ui.discoverButton, false);
	}
};

const startAuthorization = async () => {
	if (!discovery) return;

	const scopes = selectedScopes();
	if (scopes.length === 0) {
		showNotice(
			"Choose at least one scope",
			"Lucid requires the client to request a non-empty set of capabilities.",
		);
		return;
	}

	setButtonBusy(ui.connectButton, true, "Preparing…");
	try {
		const prepared = await createOAuthTransaction({
			discovery,
			clientId,
			redirectUri,
		});
		sessionStorage.setItem(
			transactionKey,
			JSON.stringify(prepared.transaction),
		);

		const authorizationUrl = new URL(discovery.server.authorization_endpoint);
		authorizationUrl.search = new URLSearchParams({
			response_type: "code",
			client_id: clientId,
			redirect_uri: redirectUri,
			resource: discovery.resource.resource,
			scope: scopes.join(" "),
			state: prepared.transaction.state,
			code_challenge: prepared.challenge,
			code_challenge_method: "S256",
		}).toString();

		window.location.assign(authorizationUrl);
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "The authorization request could not be prepared.";
		showNotice("Could not start OAuth", message);
		addActivity("Authorization failed", message, "error");
		setButtonBusy(ui.connectButton, false);
	}
};

const readTransaction = (): OAuthTransaction => {
	const stored = sessionStorage.getItem(transactionKey);
	sessionStorage.removeItem(transactionKey);
	if (!stored) throw new Error("The OAuth transaction is missing or expired.");

	const transaction = JSON.parse(stored) as OAuthTransaction;
	if (Date.now() - transaction.createdAt > transactionLifetimeMs) {
		throw new Error("The OAuth transaction expired before it was completed.");
	}

	return transaction;
};

const clearCallbackUrl = () => {
	window.history.replaceState({}, document.title, "/");
};

const handleAuthorizationCallback = async () => {
	const parameters = new URLSearchParams(window.location.search);
	if (
		window.location.pathname !== "/callback" &&
		!parameters.has("code") &&
		!parameters.has("error")
	) {
		return;
	}

	try {
		const transaction = readTransaction();
		const returnedState = parameters.get("state");
		const returnedIssuer = parameters.get("iss");
		const error = parameters.get("error");
		const code = parameters.get("code");
		clearCallbackUrl();

		if (returnedState !== transaction.state) {
			throw new Error(
				"The returned state did not match the transaction in this browser.",
			);
		}
		if (returnedIssuer !== transaction.issuer) {
			throw new Error(
				"The authorization response came from an unexpected issuer.",
			);
		}
		if (error) {
			throw new Error(
				parameters.get("error_description") ??
					`Lucid returned the OAuth error “${error}”.`,
			);
		}
		if (!code) {
			throw new Error("Lucid did not return an authorization code.");
		}

		addActivity(
			"Authorization returned",
			"State and issuer matched. Exchanging the one-time code with its PKCE verifier.",
			"success",
		);
		tokens = await exchangeAuthorizationCode(transaction, code);
		revealTokens = false;
		renderTokens();
		showNotice(
			"Connection authorised",
			"The code was exchanged successfully and the tokens are held in this tab only.",
			"success",
		);
		addActivity(
			"Tokens issued",
			"Lucid issued an access token and rotating refresh token.",
			"success",
		);
	} catch (error) {
		clearCallbackUrl();
		const message =
			error instanceof Error
				? error.message
				: "The OAuth callback could not be completed.";
		showNotice("OAuth callback rejected", message);
		addActivity("Callback rejected", message, "error");
	}
};

const maskToken = (token: string) =>
	token.length > 28
		? `${token.slice(0, 13)}••••••••••${token.slice(-9)}`
		: "••••••••••••";

const renderTokens = () => {
	const active = tokens;
	ui.tokenEmpty.classList.toggle("is-hidden", Boolean(active));
	ui.tokenContent.classList.toggle("is-hidden", !active);
	ui.tokenStatus.classList.toggle("is-active", Boolean(active));
	ui.tokenStatus.textContent = active ? "Active in memory" : "No active grant";

	if (!active) {
		ui.flowRequest.classList.remove("is-current", "is-complete");
		return;
	}

	const claims = decodeAccessToken(active.access_token);
	const principalType = claims.principal_type ?? "unknown";
	ui.principalIcon.textContent =
		principalType === "system" ? "S" : principalType === "user" ? "U" : "?";
	ui.principalValue.textContent =
		principalType === "system"
			? "System integration"
			: principalType === "user"
				? `User ${claims.user_id ?? ""}`.trim()
				: "Unknown principal";
	ui.grantValue.textContent = `Grant ${claims.grant_id ?? "—"} · ${claims.tenant_key ?? "global"}`;
	ui.accessToken.textContent = revealTokens
		? active.access_token
		: maskToken(active.access_token);
	ui.refreshToken.textContent = revealTokens
		? active.refresh_token
		: maskToken(active.refresh_token);
	ui.revealTokenButton.textContent = revealTokens
		? "Hide tokens"
		: "Reveal tokens";

	ui.grantedScopes.replaceChildren();
	for (const scope of active.scope.split(" ").filter(Boolean)) {
		const chip = document.createElement("span");
		chip.className = "scope-chip";
		chip.textContent = scope;
		ui.grantedScopes.append(chip);
	}

	ui.flowAuthorize.classList.add("is-complete");
	ui.flowAuthorize.classList.remove("is-current");
	ui.flowRequest.classList.add("is-current");
	renderExpiry();
};

const renderExpiry = () => {
	if (!tokens) return;
	const remaining = Math.max(0, tokens.expiresAt - Date.now());
	if (remaining === 0) {
		ui.expiresValue.textContent = "Expired";
		return;
	}

	const minutes = Math.floor(remaining / 60_000);
	const seconds = Math.floor((remaining % 60_000) / 1000);
	ui.expiresValue.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const refreshTokens = async () => {
	if (!tokens) return;
	setButtonBusy(ui.refreshButton, true, "Refreshing…");

	try {
		tokens = await refreshOAuthTokens(tokens);
		renderTokens();
		showNotice(
			"Tokens rotated",
			"A new access token and refresh token were issued.",
			"success",
		);
		addActivity(
			"Refresh rotated",
			"The previous refresh token was consumed and replaced.",
			"success",
		);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Token refresh failed.";
		showNotice("Could not refresh tokens", message);
		addActivity("Refresh failed", message, "error");
	} finally {
		setButtonBusy(ui.refreshButton, false);
	}
};

const clearTokens = () => {
	tokens = undefined;
	revealTokens = false;
	renderTokens();
};

const revokeTokens = async () => {
	if (!tokens) return;
	setButtonBusy(ui.revokeButton, true, "Revoking…");

	try {
		await revokeOAuthTokens(tokens);
		clearTokens();
		showNotice(
			"Connection revoked",
			"Lucid invalidated the refresh-token family. Existing access tokens are also rejected because the grant is revoked.",
			"success",
		);
		addActivity(
			"Grant revoked",
			"The refresh-token family and OAuth connection were invalidated.",
			"success",
		);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Token revocation failed.";
		showNotice("Could not revoke the connection", message);
		addActivity("Revocation failed", message, "error");
	} finally {
		setButtonBusy(ui.revokeButton, false);
	}
};

const setRequestAuth = (mode: "oauth" | "api-key") => {
	requestAuth = mode;
	const oauthSelected = mode === "oauth";
	ui.oauthTab.classList.toggle("is-active", oauthSelected);
	ui.oauthTab.setAttribute("aria-selected", String(oauthSelected));
	ui.apiKeyTab.classList.toggle("is-active", !oauthSelected);
	ui.apiKeyTab.setAttribute("aria-selected", String(!oauthSelected));
	ui.apiKeyField.classList.toggle("is-hidden", oauthSelected);
	ui.requestAuthCaption.textContent = oauthSelected
		? "Uses the active OAuth access token."
		: "Uses the API integration key held in this tab.";
};

const formatResponse = async (response: Response) => {
	const text = await response.text();
	let body: unknown = text;
	try {
		body = JSON.parse(text);
	} catch {
		// Preserve non-JSON responses as text.
	}

	const headers = [
		"content-type",
		"x-request-id",
		"www-authenticate",
		"ratelimit-limit",
		"ratelimit-remaining",
		"ratelimit-reset",
	].reduce<Record<string, string>>((result, key) => {
		const value = response.headers.get(key);
		if (value) result[key] = value;
		return result;
	}, {});

	return JSON.stringify(
		{
			status: response.status,
			statusText: response.statusText,
			headers,
			body,
		},
		null,
		2,
	);
};

const sendRequest = async () => {
	hideNotice();
	let target: URL;
	try {
		const baseUrl = new URL(ui.lucidUrl.value).origin;
		target = new URL(ui.requestPath.value, baseUrl);
		if (
			target.origin !== baseUrl ||
			!target.pathname.startsWith("/lucid/api/v1/client")
		) {
			throw new Error(
				"The request console only sends credentials to this Lucid instance’s external API.",
			);
		}
	} catch (error) {
		showNotice(
			"Invalid request target",
			error instanceof Error ? error.message : "The request URL is invalid.",
		);
		return;
	}

	const headers = new Headers({ Accept: "application/json" });
	if (requestAuth === "oauth") {
		if (!tokens) {
			showNotice(
				"No OAuth access token",
				"Complete the OAuth flow or switch the console to API key authentication.",
			);
			return;
		}
		headers.set("Authorization", `Bearer ${tokens.access_token}`);
	} else {
		const apiKey = ui.apiKey.value.trim();
		if (!apiKey) {
			showNotice(
				"No API integration key",
				"Paste a generated API integration key before sending the request.",
			);
			return;
		}
		headers.set("Authorization", `ApiKey ${apiKey}`);
	}

	const method = ui.requestMethod.value;
	let body: string | undefined;
	if (method !== "GET" && ui.requestBody.value.trim()) {
		try {
			JSON.parse(ui.requestBody.value);
			body = ui.requestBody.value;
			headers.set("Content-Type", "application/json");
		} catch {
			showNotice(
				"Invalid JSON body",
				"Correct the request body before sending it.",
			);
			return;
		}
	}

	setButtonBusy(ui.sendButton, true, "Sending…");
	ui.responseShell.dataset.state = "loading";
	ui.responseStatus.textContent = "Sending request";
	ui.responseTime.textContent = "—";
	const startedAt = performance.now();

	try {
		const response = await fetch(target, { method, headers, body });
		const duration = Math.round(performance.now() - startedAt);
		ui.responseShell.dataset.state = response.ok ? "success" : "error";
		ui.responseStatus.textContent = `${response.status} ${response.statusText}`;
		ui.responseTime.textContent = `${duration} ms`;
		ui.responseValue.textContent = await formatResponse(response);
		ui.flowRequest.classList.add("is-complete");
		addActivity(
			`${method} ${target.pathname}`,
			`${requestAuth === "oauth" ? "OAuth" : "API key"} request returned ${response.status} in ${duration} ms.`,
			response.ok ? "success" : "error",
		);
	} catch (error) {
		const duration = Math.round(performance.now() - startedAt);
		const message =
			error instanceof Error ? error.message : "The API request failed.";
		ui.responseShell.dataset.state = "error";
		ui.responseStatus.textContent = "Network error";
		ui.responseTime.textContent = `${duration} ms`;
		ui.responseValue.textContent = message;
		showNotice("Request failed", message);
		addActivity(`${method} ${target.pathname}`, message, "error");
	} finally {
		setButtonBusy(ui.sendButton, false);
	}
};

ui.noticeClose.addEventListener("click", hideNotice);
ui.discoverButton.addEventListener("click", () => void discover());
ui.connectButton.addEventListener("click", () => void startAuthorization());
ui.readScopesButton.addEventListener("click", () => {
	for (const input of ui.scopeList.querySelectorAll<HTMLInputElement>(
		'input[type="checkbox"]',
	)) {
		input.checked = input.value.endsWith(":read");
	}
	updateConnectButton();
});
ui.revealTokenButton.addEventListener("click", () => {
	revealTokens = !revealTokens;
	renderTokens();
});
ui.refreshButton.addEventListener("click", () => void refreshTokens());
ui.revokeButton.addEventListener("click", () => void revokeTokens());
ui.clearButton.addEventListener("click", () => {
	clearTokens();
	addActivity(
		"Local tokens cleared",
		"No server-side revocation was performed.",
	);
});
for (const button of document.querySelectorAll<HTMLButtonElement>(
	".copy-token",
)) {
	button.addEventListener("click", async () => {
		if (!tokens) return;
		const value =
			button.dataset.token === "refresh"
				? tokens.refresh_token
				: tokens.access_token;
		await navigator.clipboard.writeText(value);
		const previous = button.textContent;
		button.textContent = "Copied";
		window.setTimeout(() => {
			button.textContent = previous;
		}, 1200);
	});
}
ui.oauthTab.addEventListener("click", () => setRequestAuth("oauth"));
ui.apiKeyTab.addEventListener("click", () => setRequestAuth("api-key"));
ui.requestMethod.addEventListener("change", () => {
	ui.bodyField.classList.toggle("is-hidden", ui.requestMethod.value === "GET");
});
ui.sendButton.addEventListener("click", () => void sendRequest());
ui.clearActivityButton.addEventListener("click", () => {
	ui.activityList.replaceChildren();
	const empty = document.createElement("li");
	empty.className = "activity-empty";
	empty.textContent = "Protocol events will appear here.";
	ui.activityList.append(empty);
});

window.setInterval(renderExpiry, 1000);

const initialize = async () => {
	ui.lucidUrl.value =
		localStorage.getItem(baseUrlKey) ??
		import.meta.env.VITE_LUCID_URL ??
		"http://localhost:6543";
	ui.clientId.textContent = clientId;
	ui.clientId.title = clientId;
	ui.redirect.textContent = redirectUri;
	ui.redirect.title = redirectUri;
	setRequestAuth("oauth");
	renderTokens();

	await handleAuthorizationCallback();
	await discover();
};

void initialize();
