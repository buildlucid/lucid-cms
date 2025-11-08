import type { Component } from "solid-js";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import { FaSolidCircleUser } from "solid-icons/fa";
import type { AuthProvidersResponse, UserResponse } from "@types";
import Button from "@/components/Partials/Button";
import dateHelpers from "@/utils/date-helpers";
import T from "@/translations";

const AuthProviderRow: Component<{
	provider: AuthProvidersResponse["providers"][number];
	linkedProvider?: NonNullable<UserResponse["authProviders"]>[number];
	onUnlink?: () => void;
	onLink?: () => void;
	isLoading?: boolean;
}> = (props) => {
	// ----------------------------------------
	// State
	const [awaitingConfirmation, setAwaitingConfirmation] = createSignal(false);
	let confirmationTimeout: number | undefined;

	// ----------------------------------------
	// Functions
	const handleUnlinkClick = () => {
		if (awaitingConfirmation()) {
			clearTimeout(confirmationTimeout);
			setAwaitingConfirmation(false);
			props.onUnlink?.();
		} else {
			setAwaitingConfirmation(true);
			confirmationTimeout = window.setTimeout(() => {
				setAwaitingConfirmation(false);
			}, 4000);
		}
	};

	// ----------------------------------------
	// Effects
	onCleanup(() => {
		if (confirmationTimeout) {
			clearTimeout(confirmationTimeout);
		}
	});

	// ----------------------------------------
	// Memos
	const linked = createMemo(() => props.linkedProvider !== undefined);
	const formattedLinkedDate = createMemo(() =>
		dateHelpers.formatFullDate(props.linkedProvider?.linkedAt ?? undefined),
	);

	// ----------------------------------------
	// Render
	return (
		<div class="flex items-center justify-between gap-4 rounded-lg border border-border bg-input-base p-2">
			<div class="flex items-center gap-2">
				<Show
					when={props.provider.icon}
					fallback={
						<FaSolidCircleUser class="size-10 rounded-full bg-card-base p-2 text-title" />
					}
				>
					<img
						src={props.provider.icon as string}
						alt={props.provider.name}
						class="size-10 rounded-full border border-border bg-white object-contain p-2"
					/>
				</Show>
				<div class="flex flex-col">
					<span class="text-sm font-medium text-title">
						{props.provider.name}
					</span>
					<Show
						when={linked()}
						fallback={
							<span class="text-xs text-body">{T()("not_linked")}</span>
						}
					>
						<span class="text-xs text-body">
							{formattedLinkedDate()
								? T()("linked_on", { date: formattedLinkedDate() })
								: T()("linked")}
						</span>
					</Show>
				</div>
			</div>
			<Show when={linked() && props.onUnlink}>
				<Button
					onClick={handleUnlinkClick}
					theme="danger-outline"
					size="small"
					type="button"
					loading={props.isLoading}
				>
					{awaitingConfirmation() ? T()("click_to_confirm") : T()("unlink")}
				</Button>
			</Show>
			<Show when={!linked() && props.onLink}>
				<Button
					onClick={props.onLink}
					theme="border-outline"
					size="small"
					type="button"
					loading={props.isLoading}
				>
					{T()("link")}
				</Button>
			</Show>
		</div>
	);
};

export default AuthProviderRow;
