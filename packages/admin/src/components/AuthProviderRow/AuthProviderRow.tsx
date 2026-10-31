import type { AuthProviders, User } from "@types";
import { TbOutlineLink, TbOutlineUnlink, TbOutlineUser } from "solid-icons/tb";
import type { Component } from "solid-js";
import { createMemo, Show } from "solid-js";
import Button from "@/components/Button/Button";
import ConfirmActionButton from "@/components/ConfirmActionButton/ConfirmActionButton";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";

const AuthProviderRow: Component<{
	provider: AuthProviders["providers"][number];
	linkedProvider?: NonNullable<User["authProviders"]>[number];
	onUnlink?: () => void;
	onLink?: () => void;
	isLoading?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const linked = createMemo(() => props.linkedProvider !== undefined);
	const formattedLinkedDate = createMemo(() =>
		dateHelpers.formatFullDate(props.linkedProvider?.linkedAt ?? undefined),
	);

	// ----------------------------------------
	// Render
	return (
		<div class="flex items-center justify-between gap-4 rounded-lg border border-border bg-input p-2">
			<div class="flex items-center gap-3">
				<span class="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-icon">
					<Show
						when={props.provider.icon}
						fallback={<TbOutlineUser class="size-4.5" />}
					>
						<img
							src={props.provider.icon as string}
							alt={props.provider.name}
							class="size-4.5 object-contain"
						/>
					</Show>
				</span>
				<div class="flex flex-col">
					<span class="text-sm font-medium text-title">
						{props.provider.name}
					</span>
					<Show
						when={linked()}
						fallback={
							<span class="text-xs text-body">
								{T()("common.status.not.linked")}
							</span>
						}
					>
						<span class="text-xs text-body">
							{formattedLinkedDate()
								? T()("common.linked.on", { date: formattedLinkedDate() })
								: T()("common.status.linked")}
						</span>
					</Show>
				</div>
			</div>
			<Show when={linked() && props.onUnlink}>
				<ConfirmActionButton
					variant="danger-ghost"
					shape="square"
					label={T()("auth.providers.unlink.action", {
						provider: props.provider.name,
					})}
					loading={props.isLoading}
					onConfirm={() => props.onUnlink?.()}
				>
					<TbOutlineUnlink class="size-4" />
				</ConfirmActionButton>
			</Show>
			<Show when={!linked() && props.onLink}>
				<Button
					variant="ghost"
					size="sm"
					shape="square"
					title={T()("auth.providers.link.action", {
						provider: props.provider.name,
					})}
					aria-label={T()("auth.providers.link.action", {
						provider: props.provider.name,
					})}
					loading={props.isLoading}
					onClick={props.onLink}
				>
					<TbOutlineLink class="size-4" />
				</Button>
			</Show>
		</div>
	);
};

export default AuthProviderRow;
