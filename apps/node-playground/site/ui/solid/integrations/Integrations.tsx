import {
	createSignal,
	For,
	type JSX,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import {
	createOAuthTransaction,
	decodeAccessToken,
	discoverOAuth,
	exchangeAuthorizationCode,
	refreshOAuthTokens,
	revokeOAuthTokens,
} from "./api";
import type {
	ActivityKind,
	Discovery,
	OAuthTransaction,
	TokenState,
} from "./types";
import "./integrations.css";

type Activity = {
	id: number;
	at: Date;
	title: string;
	copy: string;
	kind: ActivityKind;
};

type ConsoleResponse = {
	ok: boolean;
	status: string;
	duration: number;
	body: string;
};

const TRANSACTION_KEY = "lucid-playground.oauth-transaction";
const TRANSACTION_LIFETIME_MS = 6 * 60 * 1000;
const RESPONSE_HEADERS = [
	"content-type",
	"x-request-id",
	"www-authenticate",
	"ratelimit-limit",
	"ratelimit-remaining",
	"ratelimit-reset",
];

const errorMessage = (error: unknown, fallback: string) =>
	error instanceof Error ? error.message : fallback;

const maskToken = (token: string) =>
	token.length > 28
		? `${token.slice(0, 13)}••••••••••${token.slice(-9)}`
		: "••••••••••••";

const readTransaction = (): OAuthTransaction => {
	const stored = sessionStorage.getItem(TRANSACTION_KEY);
	sessionStorage.removeItem(TRANSACTION_KEY);
	if (!stored) throw new Error("The OAuth transaction is missing or expired.");

	const transaction: OAuthTransaction = JSON.parse(stored);
	if (Date.now() - transaction.createdAt > TRANSACTION_LIFETIME_MS) {
		throw new Error("The OAuth transaction expired before it was completed.");
	}
	return transaction;
};

const formatResponse = async (response: Response) => {
	const text = await response.text();
	let body: unknown = text;
	try {
		body = JSON.parse(text);
	} catch {
		// Non-JSON responses stay as text.
	}

	const headers = Object.fromEntries(
		RESPONSE_HEADERS.flatMap((key) => {
			const value = response.headers.get(key);
			return value ? [[key, value]] : [];
		}),
	);
	return JSON.stringify({ status: response.status, headers, body }, null, 2);
};

const Field = (props: { label: string; children: JSX.Element }) => (
	<div>
		<dt>{props.label}</dt>
		<dd>
			<code>{props.children}</code>
		</dd>
	</div>
);

/** Tests OAuth discovery, PKCE authorisation and callbacks, token refresh and revocation, and content API requests with integration keys or tokens kept in memory. */
export default function Integrations(props: {
	/** The URL of the client metadata document, `pages/oauth-client.json.kiln`. */
	clientId: string;
	/** This page's URL, listed in the client metadata's `redirect_uris`. */
	redirectUri: string;
}) {
	const [discovery, setDiscovery] = createSignal<Discovery>();
	const [discoveryError, setDiscoveryError] = createSignal<string>();
	const [selectedScopes, setSelectedScopes] = createSignal<string[]>([
		"locales:read",
	]);
	const [tokens, setTokens] = createSignal<TokenState>();
	const [revealTokens, setRevealTokens] = createSignal(false);
	const [busy, setBusy] = createSignal<string>();
	const [now, setNow] = createSignal(Date.now());
	const [auth, setAuth] = createSignal<"oauth" | "api-key">("oauth");
	const [apiKey, setApiKey] = createSignal("");
	const [method, setMethod] = createSignal("GET");
	const [path, setPath] = createSignal("/api/v1/content/locales");
	const [body, setBody] = createSignal("");
	const [response, setResponse] = createSignal<ConsoleResponse>();
	const [activity, setActivity] = createSignal<Activity[]>([]);

	let activityId = 0;
	const log = (title: string, copy: string, kind: ActivityKind = "neutral") =>
		setActivity((items) => [
			{ id: ++activityId, at: new Date(), title, copy, kind },
			...items,
		]);

	/** Runs an action with its button marked busy, logging what it throws. */
	const run = async (
		name: string,
		failure: string,
		action: () => Promise<void>,
	) => {
		setBusy(name);
		try {
			await action();
		} catch (error) {
			log(failure, errorMessage(error, failure), "error");
		} finally {
			setBusy(undefined);
		}
	};

	const discover = () =>
		run("discover", "Discovery failed", async () => {
			setDiscoveryError(undefined);
			try {
				setDiscovery(await discoverOAuth(location.origin));
				log(
					"Server discovered",
					`Loaded authorization and resource metadata from ${location.origin}.`,
					"success",
				);
			} catch (error) {
				setDiscovery(undefined);
				setDiscoveryError(errorMessage(error, "OAuth discovery failed."));
				throw error;
			}
		});

	const toggleScope = (scope: string, checked: boolean) =>
		setSelectedScopes((scopes) =>
			checked ? [...scopes, scope] : scopes.filter((item) => item !== scope),
		);

	const authorize = () =>
		run("authorize", "Authorisation failed", async () => {
			const current = discovery();
			if (!current) return;

			const prepared = await createOAuthTransaction({
				discovery: current,
				clientId: props.clientId,
				redirectUri: props.redirectUri,
			});
			sessionStorage.setItem(
				TRANSACTION_KEY,
				JSON.stringify(prepared.transaction),
			);

			const url = new URL(current.server.authorization_endpoint);
			url.search = new URLSearchParams({
				response_type: "code",
				client_id: props.clientId,
				redirect_uri: props.redirectUri,
				resource: current.resource.resource,
				scope: selectedScopes().join(" "),
				state: prepared.transaction.state,
				code_challenge: prepared.challenge,
				code_challenge_method: "S256",
			}).toString();
			location.assign(url);
		});

	/** Finishes the flow when Lucid redirects back here with `code` or `error`. */
	const handleCallback = async () => {
		const parameters = new URLSearchParams(location.search);
		if (!parameters.has("code") && !parameters.has("error")) return;
		history.replaceState(null, "", location.pathname);

		await run("callback", "Callback rejected", async () => {
			const transaction = readTransaction();
			if (parameters.get("state") !== transaction.state) {
				throw new Error(
					"The returned state did not match the transaction in this browser.",
				);
			}
			if (parameters.get("iss") !== transaction.issuer) {
				throw new Error(
					"The authorization response came from an unexpected issuer.",
				);
			}
			const error = parameters.get("error");
			if (error) {
				throw new Error(
					parameters.get("error_description") ??
						`Lucid returned the OAuth error "${error}".`,
				);
			}
			const code = parameters.get("code");
			if (!code) throw new Error("Lucid did not return an authorization code.");

			log(
				"Authorisation returned",
				"State and issuer matched. Exchanging the code with its PKCE verifier.",
				"success",
			);
			setTokens(await exchangeAuthorizationCode(transaction, code));
			setRevealTokens(false);
			log(
				"Tokens issued",
				"Lucid issued an access token and a rotating refresh token.",
				"success",
			);
		});
	};

	const refresh = () =>
		run("refresh", "Refresh failed", async () => {
			const current = tokens();
			if (!current) return;
			setTokens(await refreshOAuthTokens(current));
			log(
				"Tokens rotated",
				"The previous refresh token was consumed and replaced.",
				"success",
			);
		});

	const revoke = () =>
		run("revoke", "Revocation failed", async () => {
			const current = tokens();
			if (!current) return;
			await revokeOAuthTokens(current);
			setTokens(undefined);
			log(
				"Grant revoked",
				"The refresh token family and its access tokens were invalidated.",
				"success",
			);
		});

	const clear = () => {
		setTokens(undefined);
		log("Local tokens cleared", "No server-side revocation was performed.");
	};

	const send = () =>
		run("send", "Request failed", async () => {
			const target = new URL(path(), location.origin);
			if (
				target.origin !== location.origin ||
				!target.pathname.startsWith("/api/v1/content")
			) {
				throw new Error(
					"The console only sends credentials to this server's content API.",
				);
			}

			const headers = new Headers({ Accept: "application/json" });
			if (auth() === "oauth") {
				const current = tokens();
				if (!current)
					throw new Error(
						"Complete the OAuth flow or switch to an integration key.",
					);
				headers.set("Authorization", `Bearer ${current.access_token}`);
			} else {
				if (!apiKey().trim())
					throw new Error(
						"Paste an integration key before sending the request.",
					);
				headers.set("Authorization", `ApiKey ${apiKey().trim()}`);
			}

			let requestBody: string | undefined;
			if (method() !== "GET" && body().trim()) {
				JSON.parse(body());
				requestBody = body();
				headers.set("Content-Type", "application/json");
			}

			const startedAt = performance.now();
			const result = await fetch(target, {
				method: method(),
				headers,
				body: requestBody,
				credentials: "omit",
			});
			const duration = Math.round(performance.now() - startedAt);
			setResponse({
				ok: result.ok,
				status: `${result.status} ${result.statusText}`,
				duration,
				body: await formatResponse(result),
			});
			log(
				`${method()} ${target.pathname}`,
				`${auth() === "oauth" ? "OAuth" : "Integration key"} request returned ${result.status} in ${duration} ms.`,
				result.ok ? "success" : "error",
			);
		});

	const expiresIn = () => {
		const current = tokens();
		if (!current) return "";
		const remaining = Math.max(0, current.expiresAt - now());
		if (remaining === 0) return "Expired";
		const minutes = Math.floor(remaining / 60_000);
		const seconds = Math.floor((remaining % 60_000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	const principal = (token: TokenState) => {
		const claims = decodeAccessToken(token.access_token);
		const name =
			claims.principal_type === "system"
				? "System integration"
				: claims.principal_type === "user"
					? `User ${claims.user_id ?? ""}`.trim()
					: "Unknown principal";
		return `${name}, grant ${claims.grant_id ?? "—"}`;
	};

	onMount(async () => {
		const timer = setInterval(() => setNow(Date.now()), 1000);
		onCleanup(() => clearInterval(timer));
		await handleCallback();
		await discover();
	});

	return (
		<div class="integrations">
			<section class="panel">
				<h2>1. Connect</h2>
				<dl class="integrations__details">
					<Field label="Issuer">{discovery()?.server.issuer ?? "—"}</Field>
					<Field label="Resource">
						{discovery()?.resource.resource ?? "—"}
					</Field>
					<Field label="Client ID">{props.clientId}</Field>
					<Field label="Redirect URI">{props.redirectUri}</Field>
				</dl>
				<Show when={discoveryError()}>
					{(message) => (
						<p class="integrations__error">
							{message()}{" "}
							<button
								type="button"
								onClick={discover}
								disabled={busy() === "discover"}
							>
								Try again
							</button>
						</p>
					)}
				</Show>
				<Show when={discovery()}>
					{(current) => (
						<fieldset>
							<legend>Scopes</legend>
							<button
								type="button"
								class="button--quiet"
								onClick={() =>
									setSelectedScopes(
										current().server.scopes_supported.filter((scope) =>
											scope.endsWith(":read"),
										),
									)
								}
							>
								Select read scopes
							</button>
							<div class="integrations__scopes">
								<For each={current().server.scopes_supported}>
									{(scope) => (
										<label>
											<input
												type="checkbox"
												checked={selectedScopes().includes(scope)}
												onChange={(event) =>
													toggleScope(scope, event.currentTarget.checked)
												}
											/>{" "}
											<code>{scope}</code>
										</label>
									)}
								</For>
							</div>
						</fieldset>
					)}
				</Show>
				<button
					type="button"
					onClick={authorize}
					disabled={
						!discovery() ||
						selectedScopes().length === 0 ||
						busy() === "authorize"
					}
				>
					Continue to Lucid
				</button>
			</section>

			<section class="panel">
				<h2>2. Tokens</h2>
				<Show
					when={tokens()}
					fallback={<p>No OAuth tokens in memory. Complete the flow above.</p>}
				>
					{(current) => (
						<>
							<dl class="integrations__details">
								<Field label="Principal">{principal(current())}</Field>
								<Field label="Access token expires in">{expiresIn()}</Field>
								<Field label="Access token">
									{revealTokens()
										? current().access_token
										: maskToken(current().access_token)}
								</Field>
								<Field label="Refresh token">
									{revealTokens()
										? current().refresh_token
										: maskToken(current().refresh_token)}
								</Field>
								<Field label="Granted scopes">{current().scope}</Field>
							</dl>
							<div class="integrations__actions">
								<button
									type="button"
									class="button--quiet"
									onClick={() => setRevealTokens(!revealTokens())}
								>
									{revealTokens() ? "Hide tokens" : "Reveal tokens"}
								</button>
								<button
									type="button"
									onClick={refresh}
									disabled={busy() === "refresh"}
								>
									Refresh tokens
								</button>
								<button
									type="button"
									onClick={revoke}
									disabled={busy() === "revoke"}
								>
									Revoke connection
								</button>
								<button type="button" class="button--quiet" onClick={clear}>
									Clear locally
								</button>
							</div>
						</>
					)}
				</Show>
			</section>

			<section class="panel">
				<h2>3. Request console</h2>
				<fieldset class="integrations__auth">
					<legend>Authenticate with</legend>
					<label>
						<input
							type="radio"
							name="auth"
							checked={auth() === "oauth"}
							onChange={() => setAuth("oauth")}
						/>{" "}
						OAuth access token
					</label>
					<label>
						<input
							type="radio"
							name="auth"
							checked={auth() === "api-key"}
							onChange={() => setAuth("api-key")}
						/>{" "}
						Integration key
					</label>
				</fieldset>
				<Show when={auth() === "api-key"}>
					<label class="field">
						Integration key
						<input
							type="password"
							autocomplete="off"
							spellcheck={false}
							value={apiKey()}
							onInput={(event) => setApiKey(event.currentTarget.value)}
						/>
					</label>
				</Show>
				<div class="integrations__request">
					<label class="field">
						Method
						<select
							value={method()}
							onChange={(event) => setMethod(event.currentTarget.value)}
						>
							<For each={["GET", "POST", "PATCH", "DELETE"]}>
								{(item) => <option>{item}</option>}
							</For>
						</select>
					</label>
					<label class="field">
						Path
						<input
							type="text"
							spellcheck={false}
							value={path()}
							onInput={(event) => setPath(event.currentTarget.value)}
							list="integrations-paths"
						/>
						<datalist id="integrations-paths">
							<option value="/api/v1/content/locales" />
							<option value="/api/v1/content/search?query=page&locale=en" />
							<option value="/api/v1/content/search/media?query=image&locale=en" />
							<option value="/api/v1/content/documents/page" />
						</datalist>
					</label>
				</div>
				<Show when={method() !== "GET"}>
					<label class="field">
						JSON body
						<textarea
							rows="5"
							spellcheck={false}
							value={body()}
							onInput={(event) => setBody(event.currentTarget.value)}
						/>
					</label>
				</Show>
				<button type="button" onClick={send} disabled={busy() === "send"}>
					Send request
				</button>
				<Show when={response()}>
					{(current) => (
						<div class="integrations__response" data-ok={current().ok}>
							<p>
								<strong>{current().status}</strong> in {current().duration} ms
							</p>
							<pre>
								<code>{current().body}</code>
							</pre>
						</div>
					)}
				</Show>
			</section>

			<section class="panel">
				<h2>Activity</h2>
				<Show
					when={activity().length > 0}
					fallback={<p>Protocol events will appear here.</p>}
				>
					<ol class="integrations__activity">
						<For each={activity()}>
							{(item) => (
								<li data-kind={item.kind}>
									<time datetime={item.at.toISOString()}>
										{item.at.toLocaleTimeString()}
									</time>
									<strong>{item.title}</strong>
									<span>{item.copy}</span>
								</li>
							)}
						</For>
					</ol>
					<button
						type="button"
						class="button--quiet"
						onClick={() => setActivity([])}
					>
						Clear
					</button>
				</Show>
			</section>
		</div>
	);
}
