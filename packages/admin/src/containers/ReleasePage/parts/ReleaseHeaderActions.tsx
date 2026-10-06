import type { Release } from "@types";
import classNames from "classnames";
import { FaSolidChevronDown } from "solid-icons/fa";
import { type Component, createMemo, For, Show } from "solid-js";
import ActionMenu from "@/components/ActionMenu/ActionMenu";
import Button from "@/components/Button/Button";
import Menu from "@/components/Menu/Menu";
import { useInterfaceDirection } from "@/hooks/useInterfaceDirection/useInterfaceDirection";
import api from "@/services/api";
import T from "@/translations";

/**
 * The release's next step as a split button, eg. Approve, with related
 * actions in its menu. Everything else lives in the more menu beside it.
 */
export const ReleaseHeaderActions: Component<{
	release: Release;
	publishing: boolean;
	onApprove: () => void;
	onRelease: () => void;
	onApproveAndRelease: () => void;
	onRename: () => void;
	onClose: () => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const interfaceDirection = useInterfaceDirection();

	// ----------------------------------------
	// Queries & Mutations
	const unapprove = api.releases.useUnapprove();
	const reopen = api.releases.useReopen();

	// ----------------------------------------
	// Memos
	const open = createMemo(() => props.release.status === "open");
	//* open comments also stop approval
	const blocked = createMemo(
		() =>
			props.release.blockers.length > 0 ||
			(!props.release.approved && props.release.openComments > 0),
	);
	const primary = createMemo(() => {
		if (!open()) return undefined;
		if (!props.release.approved && props.release.permissions.approve) {
			return { label: T()("releases.approve"), onClick: props.onApprove };
		}
		if (props.release.approved && props.release.permissions.release) {
			return {
				label: T()(
					props.release.failure ? "releases.retry" : "releases.release.now",
				),
				onClick: props.onRelease,
			};
		}
		return undefined;
	});
	const related = createMemo(() =>
		[
			{
				label: T()("releases.approve.and.release"),
				onSelect: props.onApproveAndRelease,
				disabled: blocked(),
				show:
					open() &&
					!props.release.approved &&
					props.release.permissions.approve &&
					props.release.permissions.release,
			},
			{
				label: T()("releases.withdraw"),
				onSelect: () => unapprove.action.mutate({ id: props.release.id }),
				disabled: false,
				show:
					open() && props.release.approved && props.release.permissions.approve,
			},
		].filter((action) => action.show),
	);

	// ----------------------------------------
	// Render
	return (
		<>
			<Show when={props.publishing}>
				<Button size="sm" variant="secondary" loading={true}>
					{T()("common.publishing")}
				</Button>
			</Show>
			<Show when={primary()}>
				{(action) => (
					<div class="flex items-center">
						<Button
							size="sm"
							variant="secondary"
							disabled={blocked()}
							class={classNames({
								"rounded-r-none":
									related().length > 0 && interfaceDirection.isLTR(),
								"rounded-l-none":
									related().length > 0 && interfaceDirection.isRTL(),
							})}
							onClick={() => action().onClick()}
						>
							{action().label}
						</Button>
						<Show when={related().length > 0}>
							<Menu.Root placement="bottom-end">
								<Menu.Trigger
									class={classNames(
										"flex h-9 w-9 items-center justify-center bg-secondary text-secondary-foreground fill-secondary-foreground ring-primary transition-colors duration-200 hover:bg-secondary-hover focus:outline-none focus-visible:ring-1",
										{
											"rounded-r-md border-l border-black/10":
												interfaceDirection.isLTR(),
											"rounded-l-md border-r border-black/10":
												interfaceDirection.isRTL(),
										},
									)}
									aria-label={T()("releases.actions.more")}
								>
									<FaSolidChevronDown size={10} />
								</Menu.Trigger>
								<Menu.Content>
									<For each={related()}>
										{(item) => (
											<Menu.Item
												disabled={item.disabled}
												onSelect={item.onSelect}
											>
												{item.label}
											</Menu.Item>
										)}
									</For>
								</Menu.Content>
							</Menu.Root>
						</Show>
					</div>
				)}
			</Show>
			<ActionMenu
				size="md"
				actions={[
					...(primary()
						? []
						: related().map((item) => ({
								label: item.label,
								type: "button" as const,
								disabled: item.disabled,
								onClick: item.onSelect,
							}))),
					{
						label: T()("releases.rename"),
						type: "button",
						icon: "pen",
						onClick: props.onRename,
						show: props.release.permissions.edit,
					},
					{
						label: T()("releases.reopen"),
						type: "button",
						icon: "restore",
						loading: reopen.action.isPending,
						onClick: () => reopen.action.mutate({ id: props.release.id }),
						show: props.release.permissions.reopen,
					},
					{
						label: T()("releases.close"),
						type: "button",
						icon: "ban",
						variant: "danger",
						onClick: props.onClose,
						show: props.release.permissions.edit,
					},
				]}
			/>
		</>
	);
};
