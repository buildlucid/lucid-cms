import type { OAuthConnection } from "@types";
import {
	FaSolidChevronDown,
	FaSolidGlobe,
	FaSolidShieldHalved,
} from "solid-icons/fa";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import UpdateOAuthConnection from "@/components/Modals/OAuth/UpdateOAuthConnection";
import ActionDropdown from "@/components/Partials/ActionDropdown";
import DateText from "@/components/Partials/DateText";
import IconContainer from "@/components/Partials/IconContainer";
import api from "@/services/api";
import type { OAuthConnectionOwner } from "@/services/api/oauth-connections";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

const OAuthConnectionRow: Component<{
	connection: OAuthConnection;
	owner: OAuthConnectionOwner;
	canUpdate: boolean;
	canRevoke: boolean;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [detailsOpen, setDetailsOpen] = createSignal(false);
	const [updateOpen, setUpdateOpen] = createSignal(false);
	const [revokeOpen, setRevokeOpen] = createSignal(false);

	// ----------------------------------------
	// Mutations
	const revokeConnection = api.oauthConnections.useRevokeConnection({
		onSuccess: () => {
			setRevokeOpen(false);
			spawnToast({
				title: T()("oauth.connections.revoked.title"),
				message: T()("oauth.connections.revoked.message"),
				status: "success",
			});
		},
	});

	// ----------------------------------------
	// Memos
	const hasCustomName = createMemo(
		() => props.connection.name !== props.connection.clientName,
	);
	const clientHostname = createMemo(() => {
		if (
			props.connection.clientUri &&
			URL.canParse(props.connection.clientUri)
		) {
			return new URL(props.connection.clientUri).hostname;
		}
		if (URL.canParse(props.connection.clientId)) {
			return new URL(props.connection.clientId).hostname;
		}
		return props.connection.clientId;
	});
	const permissionCount = createMemo(() => props.connection.scopes.length);

	// ----------------------------------------
	// Functions
	const revoke = () => {
		revokeConnection.action.mutate({
			owner: props.owner,
			id: props.connection.id,
		});
	};
	const cancelRevoke = () => {
		setRevokeOpen(false);
		revokeConnection.reset();
	};

	// ----------------------------------------
	// Render
	return (
		<>
			<article class="border-b border-border p-4 last:border-b-0">
				<div class="flex min-w-0 items-start justify-between gap-3">
					<div class="flex min-w-0 items-start gap-3">
						<IconContainer>
							<FaSolidGlobe class="size-3.5 text-primary-base" />
						</IconContainer>
						<div class="min-w-0">
							<h3 class="truncate text-sm font-semibold text-title">
								{props.connection.name}
							</h3>
							<p class="mt-0.5 truncate text-xs">
								<Show when={hasCustomName()}>
									<span>{props.connection.clientName}</span>
									<span class="mx-1.5 text-unfocused">·</span>
								</Show>
								<span>{clientHostname()}</span>
							</p>
							<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-unfocused">
								<button
									type="button"
									class="inline-flex items-center gap-1 rounded text-xs text-body hover:text-title"
									aria-expanded={detailsOpen()}
									onClick={() => setDetailsOpen(!detailsOpen())}
								>
									<FaSolidShieldHalved class="size-2.5" />
									{T()(
										permissionCount() === 1
											? "oauth.connections.permission.count"
											: "oauth.connections.permissions.count",
										{ count: permissionCount() },
									)}
									<FaSolidChevronDown
										class="size-2 transition-transform"
										classList={{ "rotate-180": detailsOpen() }}
									/>
								</button>
								<Show when={props.connection.tenantKey}>
									{(tenantKey) => (
										<span>
											{T()("oauth.connections.tenant.label")}: {tenantKey()}
										</span>
									)}
								</Show>
								<span class="inline-flex items-center gap-1">
									{T()("common.last.used.at")}:
									<DateText
										date={props.connection.lastUsedAt}
										includeTime={true}
										class="text-xs!"
									/>
								</span>
							</div>
						</div>
					</div>
					<ActionDropdown
						actions={[
							{
								type: "button",
								label: T()("oauth.connections.update.action"),
								icon: "pen",
								onClick: () => setUpdateOpen(true),
								hide: !props.canUpdate,
							},
							{
								type: "button",
								label: T()("oauth.connections.revoke.action"),
								icon: "trash",
								onClick: () => setRevokeOpen(true),
								hide: !props.canRevoke,
							},
						]}
						options={{ raised: true }}
					/>
				</div>
				<Show when={detailsOpen()}>
					<div class="mt-3 border-t border-border pt-3 sm:ml-12">
						<p class="mb-2 text-xs font-medium text-subtitle">
							{T()("common.permissions")}
						</p>
						<ul class="flex flex-wrap gap-x-4 gap-y-1">
							<For each={props.connection.scopes}>
								{(scope) => (
									<li class="font-mono text-xs text-body">{scope}</li>
								)}
							</For>
						</ul>
					</div>
				</Show>
			</article>
			<UpdateOAuthConnection
				connection={props.connection}
				owner={props.owner}
				state={{ open: updateOpen(), setOpen: setUpdateOpen }}
			/>
			<Confirmation
				theme="danger"
				state={{
					open: revokeOpen(),
					setOpen: setRevokeOpen,
					isLoading: revokeConnection.action.isPending,
					isError: revokeConnection.action.isError,
				}}
				copy={{
					title: T()("oauth.connections.revoke.title"),
					description: T()("oauth.connections.revoke.description", {
						name: props.connection.name,
					}),
					error: revokeConnection.errors()?.message,
					confirm: T()("oauth.connections.revoke.action"),
				}}
				callbacks={{
					onConfirm: revoke,
					onCancel: cancelRevoke,
				}}
			/>
		</>
	);
};

export default OAuthConnectionRow;
