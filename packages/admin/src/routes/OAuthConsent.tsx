import LogoIcon from "@assets/svgs/logo-icon.svg";
import { useParams } from "@solidjs/router";
import classNames from "classnames";
import {
	FaSolidCheck,
	FaSolidChevronDown,
	FaSolidLock,
	FaSolidShieldHalved,
	FaSolidTriangleExclamation,
} from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import Button from "@/components/Partials/Button";
import IconContainer from "@/components/Partials/IconContainer";
import Pill from "@/components/Partials/Pill";
import api from "@/services/api";
import T, { translateAdminCopy } from "@/translations";
import { LucidError } from "@/utils/error-handling";
import { getProcessedImageUrl } from "@/utils/media-url";

const OAuthConsentRoute: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const params = useParams<{ requestId: string }>();
	const [principalType, setPrincipalType] = createSignal<"user" | "system">(
		"user",
	);
	const [unavailableScopesOpen, setUnavailableScopesOpen] = createSignal(false);

	// ----------------------------------------
	// Queries
	const request = api.oauthConnections.useGetAuthorizationRequest({
		requestId: () => params.requestId,
	});

	// ----------------------------------------
	// Mutations
	const complete = api.oauthConnections.useCompleteAuthorization();

	// ----------------------------------------
	// Memos
	const clientHostname = createMemo(() => {
		const authorization = request.data?.data;
		if (!authorization) return "";
		if (authorization.clientUri && URL.canParse(authorization.clientUri)) {
			return new URL(authorization.clientUri).hostname;
		}
		if (URL.canParse(authorization.clientId)) {
			return new URL(authorization.clientId).hostname;
		}
		return authorization.clientName;
	});
	const usesMetadataClientId = createMemo(() => {
		const clientId = request.data?.data.clientId;
		return clientId ? URL.canParse(clientId) : false;
	});
	const effectiveScopes = createMemo(() => {
		const authorization = request.data?.data;
		if (!authorization) return [];
		return principalType() === "system"
			? authorization.scopes
			: authorization.userScopes;
	});
	const effectiveScopeSet = createMemo(
		() => new Set<string>(effectiveScopes()),
	);
	const scopeGroups = createMemo(
		() =>
			request.data?.data.scopeGroups
				.map((group) => ({
					...group,
					scopes: group.scopes.filter((scope) =>
						effectiveScopeSet().has(scope.key),
					),
				}))
				.filter((group) => group.scopes.length > 0) ?? [],
	);
	const unavailableUserScopes = createMemo(() => {
		const authorization = request.data?.data;
		if (!authorization || principalType() !== "user") return [];

		const userScopes = new Set<string>(authorization.userScopes);
		return authorization.scopes.filter((scope) => !userScopes.has(scope));
	});
	const canAllow = createMemo(
		() =>
			effectiveScopes().length > 0 &&
			!request.isFetching &&
			!complete.action.isPending,
	);
	const requestErrorCode = createMemo(() =>
		request.error instanceof LucidError
			? request.error.errorRes.code
			: undefined,
	);
	const invalidScopeRequest = createMemo(
		() => requestErrorCode() === "invalid_scope",
	);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (
			request.isSuccess &&
			!request.data.data.canConnectAsSystem &&
			principalType() === "system"
		) {
			setPrincipalType("user");
		}
	});

	// ----------------------------------------
	// Functions
	const denyAuthorization = () => {
		complete.action.mutate({
			requestId: params.requestId,
			body: { decision: "deny" },
		});
	};
	const allowAuthorization = () => {
		complete.action.mutate({
			requestId: params.requestId,
			body: {
				decision: "allow",
				principalType: principalType(),
			},
		});
	};

	// ----------------------------------------
	// Render
	return (
		<Switch>
			{/* Loading */}
			<Match when={request.isLoading}>
				<div class="mx-auto w-full max-w-160 animate-pulse">
					<div class="mx-auto mb-2 h-5 w-48 rounded bg-input-base" />
					<div class="mx-auto mb-5 h-3 w-72 max-w-full rounded bg-input-base" />
					<div class="overflow-hidden rounded-xl border border-border bg-card-base">
						<div class="h-20 border-b border-border p-4">
							<div class="h-full rounded-md bg-input-base" />
						</div>
						<div class="grid gap-3 border-b border-border p-4 sm:grid-cols-2">
							<div class="h-24 rounded-md bg-input-base" />
							<div class="h-24 rounded-md bg-input-base" />
						</div>
						<div class="h-32 border-b border-border p-4">
							<div class="h-full rounded-md bg-input-base" />
						</div>
						<div class="h-16 bg-input-base/25" />
					</div>
				</div>
			</Match>

			{/* Invalid, expired or completed request */}
			<Match when={request.isError}>
				<div class="mx-auto w-full max-w-md">
					<div class="rounded-xl border border-border bg-card-base p-6 text-center shadow-lg sm:p-8">
						<h1 class="text-base! tracking-normal!">
							{invalidScopeRequest()
								? T()("oauth.consent.error.scopes.title")
								: T()("oauth.consent.error.title")}
						</h1>
						<p class="mx-auto mt-1.5 max-w-sm text-sm">
							{invalidScopeRequest()
								? T()("oauth.consent.error.scopes.description")
								: T()("oauth.consent.error.description")}
						</p>
						<p class="mx-auto mt-4 max-w-xs border-t border-border pt-4 text-xs text-unfocused">
							{T()("oauth.consent.error.next.step")}
						</p>
					</div>
				</div>
			</Match>

			{/* Consent request */}
			<Match when={request.data?.data}>
				{(authorization) => (
					<div class="mx-auto w-full max-w-160">
						<header class="mb-6 text-center">
							<div class="mb-2.5 flex items-center justify-center">
								<IconContainer theme="default">
									<img src={LogoIcon} alt="" class="size-6" />
								</IconContainer>
								<Show when={authorization().clientLogo}>
									{(logo) => (
										<>
											<span class="h-px w-7 bg-border" aria-hidden="true" />
											<IconContainer
												theme="default"
												class="overflow-hidden bg-white!"
											>
												<img
													src={getProcessedImageUrl(logo().file.url, {
														preset: "thumbnail-small",
														format: "webp",
													})}
													alt={T()("oauth.consent.client.logo.alt", {
														name: authorization().clientName,
													})}
													class="size-full object-contain p-1"
												/>
											</IconContainer>
										</>
									)}
								</Show>
							</div>
							<h1 class="mx-auto max-w-lg text-lg! tracking-normal! sm:text-xl!">
								{T()("oauth.consent.application.request", {
									name: authorization().clientName,
								})}
							</h1>
						</header>

						<div class="overflow-hidden rounded-xl border border-border bg-card-base shadow-[0_16px_60px_rgba(0,0,0,0.22)]">
							{/* Application identity */}
							<section class="border-b border-border p-4">
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<h2 class="truncate text-sm font-semibold">
											{authorization().clientName}
										</h2>
										<p class="mt-0.5 text-xs">
											{usesMetadataClientId()
												? T()("oauth.consent.verified.by", {
														hostname: clientHostname(),
													})
												: T()("oauth.consent.registered.application")}
										</p>
									</div>
									<Pill theme="outline" class="shrink-0">
										{T()(
											effectiveScopes().length === 1
												? "oauth.connections.permission.count"
												: "oauth.connections.permissions.count",
											{ count: effectiveScopes().length },
										)}
									</Pill>
								</div>
							</section>

							{/* Connection identity */}
							<section class="border-b border-border p-4">
								<div class="mb-3">
									<h2 class="mb-0.5 text-sm font-semibold">
										{T()("oauth.consent.principal.title")}
									</h2>
									<p class="text-xs">
										{T()("oauth.consent.principal.description")}
									</p>
								</div>
								<fieldset
									class={classNames("m-0 grid min-w-0 gap-2.5 border-0 p-0", {
										"sm:grid-cols-2": authorization().canConnectAsSystem,
									})}
								>
									<legend class="sr-only">
										{T()("oauth.consent.principal.title")}
									</legend>
									<button
										type="button"
										aria-pressed={principalType() === "user"}
										class={classNames(
											"group relative rounded-md border p-3 pr-8 text-left transition-colors focus-visible:ring-1 focus-visible:ring-primary-base",
											{
												"border-primary-muted-border bg-primary-muted-bg/25":
													principalType() === "user",
												"border-border bg-input-base/40 hover:bg-input-base":
													principalType() !== "user",
											},
										)}
										onClick={() => setPrincipalType("user")}
									>
										<span class="block min-w-0">
											<strong class="block text-xs font-semibold text-title">
												{T()("oauth.consent.connect.as.me")}
											</strong>
											<span class="mt-0.5 block text-[11px] leading-4 text-body">
												{T()("oauth.consent.connect.as.me.description")}
											</span>
										</span>
										<span
											class={classNames(
												"absolute right-2.5 top-2.5 grid size-4 place-items-center rounded-full border",
												{
													"border-primary-base bg-primary-base text-primary-contrast":
														principalType() === "user",
													"border-border text-transparent":
														principalType() !== "user",
												},
											)}
										>
											<FaSolidCheck class="size-2" />
										</span>
									</button>

									<Show when={authorization().canConnectAsSystem}>
										<button
											type="button"
											aria-pressed={principalType() === "system"}
											class={classNames(
												"group relative rounded-md border p-3 pr-8 text-left transition-colors focus-visible:ring-1 focus-visible:ring-primary-base",
												{
													"border-primary-muted-border bg-primary-muted-bg/25":
														principalType() === "system",
													"border-border bg-input-base/40 hover:bg-input-base":
														principalType() !== "system",
												},
											)}
											onClick={() => setPrincipalType("system")}
										>
											<span class="block min-w-0">
												<strong class="block text-xs font-semibold text-title">
													{T()("oauth.consent.connect.as.system")}
												</strong>
												<span class="mt-0.5 block text-[11px] leading-4 text-body">
													{T()("oauth.consent.connect.as.system.description")}
												</span>
											</span>
											<span
												class={classNames(
													"absolute right-2.5 top-2.5 grid size-4 place-items-center rounded-full border",
													{
														"border-primary-base bg-primary-base text-primary-contrast":
															principalType() === "system",
														"border-border text-transparent":
															principalType() !== "system",
													},
												)}
											>
												<FaSolidCheck class="size-2" />
											</span>
										</button>
									</Show>
								</fieldset>

								<div
									class={classNames(
										"mt-2.5 flex items-start gap-2 rounded-md border px-3 py-2",
										{
											"border-border bg-input-base/40":
												principalType() === "user",
											"border-warning-base/20 bg-warning-base/5":
												principalType() === "system",
										},
									)}
								>
									<Show
										when={principalType() === "system"}
										fallback={
											<FaSolidLock class="mt-0.75 size-2.5 shrink-0 text-primary-base" />
										}
									>
										<FaSolidTriangleExclamation class="mt-0.75 size-2.5 shrink-0 text-warning-base" />
									</Show>
									<p class="m-0 text-[10px] leading-4">
										{principalType() === "system"
											? T()("oauth.consent.system.warning")
											: T()("oauth.consent.user.notice")}
									</p>
								</div>
							</section>

							{/* Permissions */}
							<section class="border-b border-border p-4">
								<div class="mb-3">
									<h2 class="text-sm font-semibold">
										{T()("oauth.consent.scopes.title")}
									</h2>
									<p class="mt-0.5 text-xs">
										{T()("oauth.consent.scopes.description", {
											count: effectiveScopes().length,
										})}
									</p>
								</div>
								<Show when={unavailableUserScopes().length > 0}>
									<div class="mb-2.5 rounded-md border border-warning-base/20 bg-warning-base/5 px-3 py-2">
										<div class="flex items-start gap-2">
											<FaSolidTriangleExclamation class="mt-0.75 size-2.5 shrink-0 text-warning-base" />
											<button
												type="button"
												class="flex min-w-0 flex-1 items-start justify-between gap-2 rounded text-left hover:text-title! focus:outline-hidden focus-visible:ring-1 focus-visible:ring-warning-base"
												aria-expanded={unavailableScopesOpen()}
												aria-controls="unavailable-oauth-scopes"
												onClick={() =>
													setUnavailableScopesOpen(!unavailableScopesOpen())
												}
											>
												<span class="text-[10px] leading-4">
													{T()(
														unavailableUserScopes().length === 1
															? "oauth.consent.scopes.reduced"
															: "oauth.consent.scopes.reduced.multiple",
														{
															count: unavailableUserScopes().length,
														},
													)}
												</span>
												<FaSolidChevronDown
													class="mt-1 size-2 shrink-0 text-warning-base transition-transform"
													classList={{
														"rotate-180": unavailableScopesOpen(),
													}}
												/>
											</button>
										</div>
										<Show when={unavailableScopesOpen()}>
											<ul
												id="unavailable-oauth-scopes"
												class="mt-1 ml-4.5 flex flex-wrap gap-x-1.5 gap-y-0 rounded-md border border-border bg-background-base px-2 py-1"
											>
												<For each={unavailableUserScopes()}>
													{(scope) => (
														<li class="font-mono! text-[9px]! leading-3! tracking-normal! text-body">
															<code class="font-mono text-[9px] leading-3 text-body">
																{scope}
															</code>
														</li>
													)}
												</For>
											</ul>
										</Show>
									</div>
								</Show>

								<div class="max-h-52 overflow-y-auto rounded-md border border-border scrollbar">
									<For each={scopeGroups()}>
										{(group) => (
											<div class="border-b border-border p-3 last:border-b-0">
												<h3 class="mb-1.5 text-[11px] font-semibold text-title">
													{translateAdminCopy(group.details.name)}
												</h3>
												<ul class="space-y-1.5">
													<For each={group.scopes}>
														{(scope) => (
															<li class="flex items-center gap-2">
																<span class="grid size-3.5 shrink-0 place-items-center rounded-full bg-primary-muted-bg text-primary-base">
																	<FaSolidCheck class="size-1.5" />
																</span>
																<span class="min-w-0">
																	<strong class="block text-[11px] font-medium leading-4 text-subtitle">
																		{translateAdminCopy(scope.details.name)}
																	</strong>
																	<Show when={scope.details.description}>
																		{(description) => (
																			<span class="block text-[10px] leading-4 text-body">
																				{translateAdminCopy(description())}
																			</span>
																		)}
																	</Show>
																</span>
															</li>
														)}
													</For>
												</ul>
											</div>
										)}
									</For>
									<Show when={effectiveScopes().length === 0}>
										<p class="m-0 px-3 py-5 text-center text-xs">
											{T()("oauth.consent.scopes.none")}
										</p>
									</Show>
								</div>
							</section>

							{/* Actions */}
							<footer class="flex flex-col-reverse gap-3 bg-input-base/20 p-4 lg:flex-row lg:items-center lg:justify-between">
								<div class="flex max-w-xs items-start gap-2">
									<FaSolidShieldHalved class="mt-0.75 size-2.5 shrink-0 text-icon-faded" />
									<p class="m-0 text-[10px] leading-4 text-unfocused">
										{T()("oauth.consent.security.notice", {
											hostname: clientHostname(),
										})}
									</p>
								</div>
								<div class="flex shrink-0 items-center justify-start gap-2 lg:justify-end">
									<Button
										type="button"
										theme="border-outline"
										size="small"
										disabled={complete.action.isPending}
										onClick={denyAuthorization}
									>
										{T()("common.cancel")}
									</Button>
									<Button
										type="button"
										theme="primary"
										size="small"
										loading={complete.action.isPending}
										disabled={!canAllow()}
										onClick={allowAuthorization}
									>
										{T()("oauth.consent.allow.action")}
									</Button>
								</div>
							</footer>
						</div>

						<Show when={complete.action.isError}>
							<div class="mt-2.5 rounded-md border border-error-base/25 bg-error-base/5 px-3 py-2">
								<p class="m-0 text-xs text-error-base">
									{complete.errors()?.message ??
										T()("oauth.consent.error.description")}
								</p>
							</div>
						</Show>
					</div>
				)}
			</Match>
		</Switch>
	);
};

export default OAuthConsentRoute;
