import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import type { Passkey } from "@types";
import { TbOutlineFingerprint, TbOutlinePencil } from "solid-icons/tb";
import { type Component, createMemo, createSignal, For } from "solid-js";
import AuthMethodRow from "@/components/AuthMethodRow/AuthMethodRow";
import Button from "@/components/Button/Button";
import DeleteDebounceButton from "@/components/DeleteDebounceButton/DeleteDebounceButton";
import InfoRow from "@/components/InfoRow/InfoRow";
import RenamePasskeyModal from "@/components/RenamePasskeyModal/RenamePasskeyModal";
import constants from "@/constants";
import api from "@/services/api";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";

interface PasskeySettingsProps {
	passkeys: Passkey[];
	/** Why the last passkey has to stay: it's the user's only way to log in, or to meet a two-factor requirement. */
	keepLast?: "login" | "two-factor";
}

const PasskeySettings: Component<PasskeySettingsProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const supported = browserSupportsWebAuthn();
	const [renaming, setRenaming] = createSignal<Passkey>();
	const [renameOpen, setRenameOpen] = createSignal(false);

	// ----------------------------------------
	// Mutations
	const createPasskey = api.account.useCreatePasskey();
	const deletePasskey = api.account.useDeletePasskey();

	// ----------------------------------------
	// Memos
	const keepLastReason = createMemo(() => {
		if (props.passkeys.length !== 1) return undefined;
		if (props.keepLast === "login")
			return T()("account.passkeys.keep.last.login");
		if (props.keepLast === "two-factor")
			return T()("account.passkeys.keep.last");
		return undefined;
	});
	const atLimit = createMemo(
		() => props.passkeys.length >= constants.passkeys.maxPerUser,
	);
	const addUnavailableReason = createMemo(() => {
		if (!supported) return T()("account.passkeys.unsupported");
		if (atLimit()) {
			return T()("account.passkeys.limit", {
				max: constants.passkeys.maxPerUser,
			});
		}
		return undefined;
	});

	// ----------------------------------------
	// Functions
	const describePasskey = (passkey: Passkey) => {
		const added = dateHelpers.formatFullDate(passkey.createdAt, {
			includeTime: false,
		});
		return passkey.lastUsedAt
			? T()("account.passkeys.detail.used", {
					added: added ?? "",
					used: dateHelpers.formatRelativeDate(passkey.lastUsedAt) ?? "",
				})
			: T()("account.passkeys.detail.unused", { added: added ?? "" });
	};

	// ----------------------------------------
	// Render
	return (
		<>
			<InfoRow.Content
				title={T()("account.passkeys.title")}
				description={T()("account.passkeys.description")}
				actions={
					<Button
						variant="outline"
						size="sm"
						type="button"
						title={addUnavailableReason()}
						disabled={addUnavailableReason() !== undefined}
						loading={createPasskey.action.isPending}
						onClick={() => createPasskey.action.mutate()}
					>
						{T()("account.passkeys.add.action")}
					</Button>
				}
				align={props.passkeys.length === 0 ? "center" : "top"}
			>
				{/* only passed with passkeys to list, so an empty section has no gap under its heading */}
				{props.passkeys.length > 0 ? (
					<div class="flex flex-col gap-3">
						<For each={props.passkeys}>
							{(passkey) => (
								<AuthMethodRow
									icon={<TbOutlineFingerprint class="size-4.5" />}
									title={passkey.name}
									badge={
										passkey.backedUp ? (
											<span
												class="text-[11px] leading-4 font-medium text-subtitle"
												title={T()("account.passkeys.synced.tooltip")}
											>
												{T()("account.passkeys.synced")}
											</span>
										) : undefined
									}
									detail={describePasskey(passkey)}
									action={
										<>
											<Button
												variant="ghost"
												size="xs"
												shape="square"
												title={T()("account.passkeys.rename.action")}
												aria-label={T()("account.passkeys.rename.action")}
												onClick={() => {
													setRenaming(passkey);
													setRenameOpen(true);
												}}
											>
												<TbOutlinePencil class="size-3.5" />
											</Button>
											<DeleteDebounceButton
												disabled={
													deletePasskey.action.isPending ||
													keepLastReason() !== undefined
												}
												title={keepLastReason()}
												callback={() => {
													deletePasskey.action.mutate({ id: passkey.id });
												}}
											/>
										</>
									}
								/>
							)}
						</For>
					</div>
				) : undefined}
			</InfoRow.Content>

			{/* Modals */}
			<RenamePasskeyModal
				passkey={renaming()}
				state={{ open: renameOpen(), setOpen: setRenameOpen }}
			/>
		</>
	);
};

export default PasskeySettings;
