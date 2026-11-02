import type { OAuthConnection } from "@types";
import classnames from "classnames";
import {
	TbOutlineChevronDown,
	TbOutlineShieldHalf,
	TbOutlineWorld,
} from "solid-icons/tb";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import ActionMenu from "@/components/ActionMenu/ActionMenu";
import DateText from "@/components/DateText/DateText";
import Modal from "@/components/Modal/Modal";
import RowIcon from "@/components/RowIcon/RowIcon";
import UpdateOAuthConnectionModal from "@/components/UpdateOAuthConnectionModal/UpdateOAuthConnectionModal";
import api from "@/services/api";
import type { OAuthConnectionOwner } from "@/services/api/oauth-connections";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

/** An OAuth connection with its permissions, which expand below it, and a menu to rename or revoke it. */
const OAuthConnectionRow: Component<{
	connection: OAuthConnection;
	owner: OAuthConnectionOwner;
	canUpdate: boolean;
	canRevoke: boolean;
	/** `card` is a bordered card, for stacked lists. `row` is a divided row in an `InfoRow.Content` with `padding="none"`. @default "card" */
	variant?: "card" | "row";
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
		//* Use the client ID's origin; metadata can claim any website.
		if (URL.canParse(props.connection.clientId)) {
			return new URL(props.connection.clientId).hostname;
		}
		if (
			props.connection.clientUri &&
			URL.canParse(props.connection.clientUri)
		) {
			return new URL(props.connection.clientUri).hostname;
		}
		return props.connection.clientId;
	});
	const permissionCount = createMemo(() => props.connection.scopes.length);
	const isRow = createMemo(() => props.variant === "row");

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
			<article
				class={classnames({
					"rounded-lg border border-border bg-input p-2": !isRow(),
					"px-5 py-4": isRow(),
				})}
			>
				<div
					class={classnames("flex min-w-0 items-center justify-between", {
						"gap-3": !isRow(),
						"gap-4": isRow(),
					})}
				>
					<div
						class={classnames("flex min-w-0 items-center", {
							"gap-3": !isRow(),
							"gap-4": isRow(),
						})}
					>
						<RowIcon>
							<TbOutlineWorld class="size-4" />
						</RowIcon>
						<div class="min-w-0">
							<h3 class="truncate text-sm font-medium text-title">
								{props.connection.name}
							</h3>
							<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
								<span class="min-w-0 truncate text-body">
									<Show when={hasCustomName()}>
										{props.connection.clientName}
										<span class="mx-1.5 text-muted">·</span>
									</Show>
									{clientHostname()}
								</span>
								<button
									type="button"
									class="inline-flex items-center gap-1 rounded text-xs text-body hover:text-title"
									aria-expanded={detailsOpen()}
									onClick={() => setDetailsOpen(!detailsOpen())}
								>
									<TbOutlineShieldHalf class="size-2.5" />
									{T()(
										permissionCount() === 1
											? "oauth.connections.permission.count"
											: "oauth.connections.permissions.count",
										{ count: permissionCount() },
									)}
									<TbOutlineChevronDown
										class="size-2 transition-transform"
										classList={{ "rotate-180": detailsOpen() }}
									/>
								</button>
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
					<ActionMenu
						variant="ghost"
						actions={[
							{
								type: "button",
								label: T()("oauth.connections.update.action"),
								icon: "pen",
								onClick: () => setUpdateOpen(true),
								show: props.canUpdate,
								sortOrder: 0,
							},
							{
								type: "button",
								label: T()("oauth.connections.revoke.action"),
								icon: "trash",
								onClick: () => setRevokeOpen(true),
								show: props.canRevoke,
								sortOrder: 70,
								variant: "danger",
							},
						]}
					/>
				</div>
				<Show when={detailsOpen()}>
					<div
						class={classnames("mt-3 border-t border-border pt-3", {
							"sm:ml-13": !isRow(),
							"sm:ml-14": isRow(),
						})}
					>
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
			<UpdateOAuthConnectionModal
				connection={props.connection}
				owner={props.owner}
				state={{ open: updateOpen(), setOpen: setUpdateOpen }}
			/>
			<Modal.Confirm
				open={revokeOpen()}
				onOpenChange={setRevokeOpen}
				title={T()("oauth.connections.revoke.title")}
				description={T()("oauth.connections.revoke.description", {
					name: props.connection.name,
				})}
				confirmLabel={T()("oauth.connections.revoke.action")}
				loading={revokeConnection.action.isPending}
				error={revokeConnection.errors()?.message}
				onConfirm={revoke}
				onCancel={cancelRevoke}
			/>
		</>
	);
};

export default OAuthConnectionRow;
