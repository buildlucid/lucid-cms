import type { OAuthConnection } from "@types";
import { FaSolidGlobe, FaSolidServer, FaSolidUser } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
} from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import { InputFull } from "@/components/Groups/Form";
import { Confirmation } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import DateText from "@/components/Partials/DateText";
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
	const [name, setName] = createSignal(props.connection.name);
	const [revokeOpen, setRevokeOpen] = createSignal(false);

	// ----------------------------------------
	// Mutations
	const updateConnection = api.oauthConnections.useUpdateConnection({
		onSuccess: () => {
			spawnToast({
				title: T()("oauth.connections.updated.title"),
				message: T()("oauth.connections.updated.message"),
				status: "success",
			});
		},
	});
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
	const nameChanged = createMemo(
		() => name().trim() !== props.connection.name && name().trim().length > 0,
	);
	const clientHostname = createMemo(
		() => new URL(props.connection.clientId).hostname,
	);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		setName(props.connection.name);
	});

	// ----------------------------------------
	// Functions
	const updateName = () => {
		updateConnection.action.mutate({
			owner: props.owner,
			id: props.connection.id,
			name: name().trim(),
		});
	};
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
			<InfoRow.Content
				title={props.connection.clientName}
				description={clientHostname()}
				reducedMargin={true}
				actions={
					<Show when={props.canRevoke}>
						<Button
							type="button"
							theme="danger-outline"
							size="small"
							onClick={() => setRevokeOpen(true)}
						>
							{T()("oauth.connections.revoke.action")}
						</Button>
					</Show>
				}
			>
				<div class="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-4">
					<span class="inline-flex items-center gap-1.5 rounded-full border border-border bg-input-base px-2 py-1 text-[10px] font-medium text-subtitle">
						<FaSolidGlobe class="size-2.5 text-primary-base" />
						{clientHostname()}
					</span>
					<span class="inline-flex items-center gap-1.5 rounded-full border border-border bg-input-base px-2 py-1 text-[10px] font-medium text-subtitle">
						<Show
							when={props.connection.principalType === "system"}
							fallback={<FaSolidUser class="size-2.5 text-primary-base" />}
						>
							<FaSolidServer class="size-2.5 text-primary-base" />
						</Show>
						{props.connection.principalType === "system"
							? T()("common.system")
							: T()("common.user")}
					</span>
					<code
						class="min-w-0 grow truncate text-right text-[9px] text-unfocused"
						title={props.connection.clientId}
					>
						{props.connection.clientId}
					</code>
				</div>
				<div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
					<InputFull
						id={`oauth-connection-name-${props.connection.id}`}
						name="name"
						type="text"
						value={name()}
						onChange={setName}
						copy={{ label: T()("common.name") }}
						disabled={!props.canUpdate}
						noMargin={true}
					/>
					<Show when={props.canUpdate}>
						<Button
							type="button"
							theme="border-outline"
							size="small"
							disabled={!nameChanged()}
							loading={updateConnection.action.isPending}
							onClick={updateName}
						>
							{T()("common.save")}
						</Button>
					</Show>
				</div>
				<div class="mt-4 flex flex-wrap gap-1.5">
					{props.connection.scopes.map((scope) => (
						<span class="rounded-md bg-input-base border border-border px-2 py-1 font-mono text-[10px] text-subtitle">
							{scope}
						</span>
					))}
				</div>
				<div class="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-xs text-body">
					<Show when={props.connection.tenantKey}>
						{(tenantKey) => (
							<span>
								{T()("oauth.connections.tenant.label")}: {tenantKey()}
							</span>
						)}
					</Show>
					<span>
						{T()("common.last.used.at")}:{" "}
						<DateText date={props.connection.lastUsedAt} includeTime={true} />
					</span>
				</div>
			</InfoRow.Content>
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
