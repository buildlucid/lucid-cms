import notifyIllustration from "@assets/illustrations/notify.svg";
import LogoIcon from "@assets/svgs/logo-icon.svg";
import { useParams } from "@solidjs/router";
import classNames from "classnames";
import {
	FaSolidCheck,
	FaSolidGlobe,
	FaSolidLock,
	FaSolidServer,
	FaSolidShieldHalved,
	FaSolidTriangleExclamation,
	FaSolidUser,
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
import { Select } from "@/components/Groups/Form";
import Button from "@/components/Partials/Button";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import api from "@/services/api";
import tenantStore from "@/store/tenantStore";
import T, { translateAdminCopy } from "@/translations";

const OAuthConsentRoute: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const params = useParams<{ requestId: string }>();
	const [principalType, setPrincipalType] = createSignal<"user" | "system">(
		"user",
	);
	const [tenantKey, setTenantKey] = createSignal<string | undefined>(
		tenantStore.get.tenant,
	);

	// ----------------------------------------
	// Queries
	const request = api.oauthConnections.useGetAuthorizationRequest({
		requestId: () => params.requestId,
		tenantKey,
	});

	// ----------------------------------------
	// Mutations
	const complete = api.oauthConnections.useCompleteAuthorization();

	// ----------------------------------------
	// Memos
	const clientHostname = createMemo(() => {
		const clientId = request.data?.data.clientId;
		return clientId ? new URL(clientId).hostname : "";
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
		if (!authorization || principalType() !== "user") return 0;
		return authorization.scopes.length - authorization.userScopes.length;
	});
	const canAllow = createMemo(
		() =>
			effectiveScopes().length > 0 &&
			(tenantStore.get.tenants.length === 0 ||
				tenantStore.get.tenants.some((tenant) => tenant.key === tenantKey())) &&
			!request.isFetching &&
			!complete.action.isPending,
	);
	const tenantOptions = createMemo(() =>
		tenantStore.get.tenants.map((tenant) => ({
			value: tenant.key,
			label: translateAdminCopy(tenant.name),
		})),
	);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const tenants = tenantStore.get.tenants;
		if (tenants.length === 0) {
			setTenantKey(undefined);
		} else if (!tenants.some((tenant) => tenant.key === tenantKey())) {
			setTenantKey(
				tenants.find((tenant) => tenant.default)?.key ?? tenants[0]?.key,
			);
		}

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
			tenantKey: tenantKey(),
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
			<Match when={request.isLoading}>
				<div class="mx-auto w-full max-w-180 animate-pulse">
					<div class="mx-auto mb-7 size-11 rounded-xl bg-input-base" />
					<div class="mx-auto mb-3 h-5 w-52 rounded bg-input-base" />
					<div class="mx-auto mb-9 h-4 w-80 max-w-full rounded bg-input-base" />
					<div class="space-y-5 rounded-xl border border-border bg-card-base p-5 sm:p-7">
						<div class="h-20 rounded-lg bg-input-base" />
						<div class="grid gap-3 sm:grid-cols-2">
							<div class="h-28 rounded-lg bg-input-base" />
							<div class="h-28 rounded-lg bg-input-base" />
						</div>
						<div class="h-40 rounded-lg bg-input-base" />
					</div>
				</div>
			</Match>
			<Match when={request.isError}>
				<div class="mx-auto max-w-lg rounded-xl border border-border bg-card-base p-8">
					<ErrorBlock
						content={{
							image: notifyIllustration,
							title: T()("oauth.consent.error.title"),
							description: T()("oauth.consent.error.description"),
						}}
					/>
				</div>
			</Match>
			<Match when={request.data?.data}>
				{(authorization) => (
					<div class="mx-auto w-full max-w-180">
						<header class="mb-7 text-center">
							<div class="mb-5 flex items-center justify-center">
								<div class="grid size-11 place-items-center rounded-xl border border-primary-muted-border/40 bg-primary-muted-bg/30">
									<img src={LogoIcon} alt="" class="size-7" />
								</div>
								<div class="mx-2 h-px w-8 bg-border" />
								<div class="grid size-11 place-items-center rounded-xl border border-border bg-input-base text-lg font-semibold text-title">
									{authorization().clientName.charAt(0).toUpperCase()}
								</div>
							</div>
							<p class="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-base">
								{T()("oauth.consent.eyebrow")}
							</p>
							<h1 class="mx-auto mb-2 max-w-xl text-xl! tracking-normal! sm:text-2xl!">
								{T()("oauth.consent.application.request", {
									name: authorization().clientName,
								})}
							</h1>
							<p class="mx-auto max-w-lg text-sm">
								{T()("oauth.consent.description")}
							</p>
						</header>

						<div class="overflow-hidden rounded-xl border border-border bg-card-base shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
							<section class="border-b border-border p-5 sm:p-6">
								<div class="flex items-start gap-3">
									<div class="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-input-base">
										<FaSolidGlobe class="size-4 text-primary-base" />
									</div>
									<div class="min-w-0 grow">
										<div class="flex flex-wrap items-center gap-2">
											<h2 class="text-base font-semibold">
												{authorization().clientName}
											</h2>
											<span class="inline-flex items-center rounded-full border border-primary-muted-border/40 bg-primary-muted-bg/30 px-2 py-0.5 text-[10px] font-medium text-primary-base">
												{T()("oauth.consent.external.application")}
											</span>
										</div>
										<p class="mt-1 text-sm">
											{T()("oauth.consent.verified.by", {
												hostname: clientHostname(),
											})}
										</p>
										<code
											class="mt-2 block max-w-full truncate text-[10px] text-unfocused"
											title={authorization().clientId}
										>
											{authorization().clientId}
										</code>
									</div>
								</div>
							</section>

							<section class="border-b border-border p-5 sm:p-6">
								<div class="mb-4">
									<h2 class="mb-1 text-sm font-semibold">
										{T()("oauth.consent.principal.title")}
									</h2>
									<p class="text-xs">
										{T()("oauth.consent.principal.description")}
									</p>
								</div>
								<fieldset class="m-0 grid min-w-0 gap-3 border-0 p-0 sm:grid-cols-2">
									<legend class="sr-only">
										{T()("oauth.consent.principal.title")}
									</legend>
									<button
										type="button"
										aria-pressed={principalType() === "user"}
										class={classNames(
											"group relative flex min-h-28 items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:ring-1 focus-visible:ring-primary-base",
											{
												"border-primary-muted-border bg-primary-muted-bg/25":
													principalType() === "user",
												"border-border bg-input-base/50 hover:border-border/80 hover:bg-input-base":
													principalType() !== "user",
											},
										)}
										onClick={() => setPrincipalType("user")}
									>
										<span
											class={classNames(
												"grid size-8 shrink-0 place-items-center rounded-lg border",
												{
													"border-primary-muted-border/50 bg-primary-muted-bg text-primary-base":
														principalType() === "user",
													"border-border bg-card-base text-body":
														principalType() !== "user",
												},
											)}
										>
											<FaSolidUser class="size-3.5" />
										</span>
										<span class="min-w-0">
											<strong class="mb-1 block text-sm font-semibold text-title">
												{T()("oauth.consent.connect.as.me")}
											</strong>
											<span class="block text-xs leading-5 text-body">
												{T()("oauth.consent.connect.as.me.description")}
											</span>
										</span>
										<span
											class={classNames(
												"absolute right-3 top-3 grid size-4 place-items-center rounded-full border",
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
												"group relative flex min-h-28 items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:ring-1 focus-visible:ring-primary-base",
												{
													"border-primary-muted-border bg-primary-muted-bg/25":
														principalType() === "system",
													"border-border bg-input-base/50 hover:border-border/80 hover:bg-input-base":
														principalType() !== "system",
												},
											)}
											onClick={() => setPrincipalType("system")}
										>
											<span
												class={classNames(
													"grid size-8 shrink-0 place-items-center rounded-lg border",
													{
														"border-primary-muted-border/50 bg-primary-muted-bg text-primary-base":
															principalType() === "system",
														"border-border bg-card-base text-body":
															principalType() !== "system",
													},
												)}
											>
												<FaSolidServer class="size-3.5" />
											</span>
											<span class="min-w-0">
												<strong class="mb-1 block text-sm font-semibold text-title">
													{T()("oauth.consent.connect.as.system")}
												</strong>
												<span class="block text-xs leading-5 text-body">
													{T()("oauth.consent.connect.as.system.description")}
												</span>
											</span>
											<span
												class={classNames(
													"absolute right-3 top-3 grid size-4 place-items-center rounded-full border",
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
										"mt-3 flex items-start gap-2 rounded-lg border px-3 py-2.5",
										{
											"border-border bg-input-base/50":
												principalType() === "user",
											"border-warning-base/20 bg-warning-base/5":
												principalType() === "system",
										},
									)}
								>
									<Show
										when={principalType() === "system"}
										fallback={
											<FaSolidLock class="mt-0.5 size-3 shrink-0 text-primary-base" />
										}
									>
										<FaSolidTriangleExclamation class="mt-0.5 size-3 shrink-0 text-warning-base" />
									</Show>
									<p class="m-0 text-[11px] leading-5">
										{principalType() === "system"
											? T()("oauth.consent.system.warning")
											: T()("oauth.consent.user.notice")}
									</p>
								</div>
							</section>

							<Show when={tenantOptions().length > 1}>
								<section class="border-b border-border p-5 sm:p-6">
									<Select
										id="oauth-connection-tenant"
										name="tenant"
										value={tenantKey()}
										onChange={(value) =>
											setTenantKey(
												typeof value === "string" ? value : undefined,
											)
										}
										options={tenantOptions()}
										copy={{
											label: T()("oauth.consent.tenant.label"),
											describedBy: T()("oauth.consent.tenant.description"),
										}}
										required={true}
										noClear={true}
										noMargin={true}
										disabled={request.isFetching}
									/>
								</section>
							</Show>

							<section class="border-b border-border p-5 sm:p-6">
								<div class="mb-4 flex items-start gap-3">
									<div class="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-input-base">
										<FaSolidShieldHalved class="size-3.5 text-primary-base" />
									</div>
									<div>
										<h2 class="mb-1 text-sm font-semibold">
											{T()("oauth.consent.scopes.title")}
										</h2>
										<p class="text-xs">
											{T()("oauth.consent.scopes.description", {
												count: effectiveScopes().length,
											})}
										</p>
									</div>
								</div>

								<Show when={unavailableUserScopes() > 0}>
									<div class="mb-3 flex items-start gap-2 rounded-lg border border-warning-base/20 bg-warning-base/5 px-3 py-2.5">
										<FaSolidTriangleExclamation class="mt-0.5 size-3 shrink-0 text-warning-base" />
										<p class="m-0 text-[11px] leading-5">
											{T()("oauth.consent.scopes.reduced", {
												count: unavailableUserScopes(),
											})}
										</p>
									</div>
								</Show>

								<div class="max-h-64 space-y-3 overflow-y-auto rounded-lg border border-border bg-input-base/30 p-3 scrollbar">
									<For each={scopeGroups()}>
										{(group) => (
											<div>
												<h3 class="mb-2 text-xs font-semibold text-title">
													{translateAdminCopy(group.details.name)}
												</h3>
												<div class="space-y-1.5">
													<For each={group.scopes}>
														{(scope) => (
															<div class="flex items-start gap-2 rounded-md border border-border bg-card-base px-3 py-2">
																<span class="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-primary-muted-bg text-primary-base">
																	<FaSolidCheck class="size-2" />
																</span>
																<div class="min-w-0">
																	<strong class="block text-xs font-medium text-subtitle">
																		{translateAdminCopy(scope.details.name)}
																	</strong>
																	<Show when={scope.details.description}>
																		{(description) => (
																			<p class="mt-0.5 text-[10px] leading-4">
																				{translateAdminCopy(description())}
																			</p>
																		)}
																	</Show>
																</div>
															</div>
														)}
													</For>
												</div>
											</div>
										)}
									</For>
									<Show when={effectiveScopes().length === 0}>
										<p class="m-0 px-3 py-6 text-center text-xs">
											{T()("oauth.consent.scopes.none")}
										</p>
									</Show>
								</div>
							</section>

							<footer class="flex flex-col-reverse gap-4 bg-input-base/25 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
								<div class="flex max-w-sm items-start gap-2">
									<FaSolidShieldHalved class="mt-0.5 size-3 shrink-0 text-icon-faded" />
									<p class="m-0 text-[10px] leading-4 text-unfocused">
										{T()("oauth.consent.security.notice", {
											hostname: clientHostname(),
										})}
									</p>
								</div>
								<div class="flex shrink-0 items-center justify-end gap-2">
									<Button
										type="button"
										theme="border-outline"
										size="medium"
										disabled={complete.action.isPending}
										onClick={denyAuthorization}
									>
										{T()("common.cancel")}
									</Button>
									<Button
										type="button"
										theme="primary"
										size="medium"
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
							<div class="mt-3 rounded-lg border border-error-base/25 bg-error-base/5 px-4 py-3">
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
