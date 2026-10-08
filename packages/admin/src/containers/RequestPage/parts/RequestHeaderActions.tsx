import type { RequestDetail } from "@types";
import classNames from "classnames";
import { TbOutlineChevronDown } from "solid-icons/tb";
import { type Component, createMemo, For, Show } from "solid-js";
import ActionMenu from "@/components/ActionMenu/ActionMenu";
import Button from "@/components/Button/Button";
import Menu from "@/components/Menu/Menu";
import { useInterfaceDirection } from "@/hooks/useInterfaceDirection/useInterfaceDirection";
import api from "@/services/api";
import T from "@/translations";
import { getApprovalsAfter, hasApproved } from "@/utils/requests";

/**
 * The request's next step as a split button, eg. Approve, with related
 * actions in its menu. Everything else lives in the more menu beside it.
 */
export const RequestHeaderActions: Component<{
	request: RequestDetail;
	publishing: boolean;
	onApprove: () => void;
	onComplete: () => void;
	onApproveAndComplete: () => void;
	onRename: () => void;
	onClose: () => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const interfaceDirection = useInterfaceDirection();

	// ----------------------------------------
	// Queries & Mutations
	const unapprove = api.requests.useUnapprove();
	const reopen = api.requests.useReopen();

	// ----------------------------------------
	// Memos
	const open = createMemo(() => props.request.status === "open");
	const approvedByMe = createMemo(() => hasApproved(props.request));
	const approvalCompletes = createMemo(
		() => getApprovalsAfter(props.request) >= props.request.requiredApprovals,
	);
	//* an earlier approval can approve again once the request needs fewer
	const canApprove = createMemo(
		() =>
			!props.request.approved &&
			props.request.permissions.approve &&
			(!approvedByMe() || approvalCompletes()),
	);
	const canWithdraw = createMemo(
		() => open() && approvedByMe() && props.request.permissions.approve,
	);
	const blocked = createMemo(
		() =>
			props.request.blockers.length > 0 ||
			(!props.request.approved && props.request.openComments > 0),
	);
	const primary = createMemo(() => {
		if (!open()) return undefined;
		if (canApprove()) {
			return { label: T()("requests.approve"), onClick: props.onApprove };
		}
		if (props.request.approved && props.request.permissions.request) {
			return {
				label: T()(
					props.request.failure ? "requests.retry" : "requests.complete.now",
				),
				onClick: props.onComplete,
			};
		}
		return undefined;
	});
	const related = createMemo(() =>
		[
			{
				label: T()("requests.approve.and.complete"),
				onSelect: props.onApproveAndComplete,
				disabled: blocked(),
				show:
					open() &&
					canApprove() &&
					approvalCompletes() &&
					props.request.permissions.request,
			},
			{
				label: T()("requests.withdraw"),
				onSelect: () => unapprove.action.mutate({ id: props.request.id }),
				disabled: false,
				show: canWithdraw() && primary() !== undefined,
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
			<Show when={!primary() && canWithdraw()}>
				<Button
					size="sm"
					variant="outline"
					loading={unapprove.action.isPending}
					onClick={() => unapprove.action.mutate({ id: props.request.id })}
				>
					{T()("requests.withdraw")}
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
										"flex h-9 w-9 items-center justify-center bg-secondary text-secondary-foreground ring-primary transition-colors duration-200 hover:bg-secondary-hover focus:outline-none focus-visible:ring-1",
										{
											"rounded-r-md border-l border-black/10":
												interfaceDirection.isLTR(),
											"rounded-l-md border-r border-black/10":
												interfaceDirection.isRTL(),
										},
									)}
									aria-label={T()("requests.actions.more")}
								>
									<TbOutlineChevronDown size={10} />
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
						label: T()("requests.rename"),
						type: "button",
						icon: "pen",
						onClick: props.onRename,
						show: props.request.permissions.edit,
					},
					{
						label: T()("requests.reopen"),
						type: "button",
						icon: "restore",
						loading: reopen.action.isPending,
						onClick: () => reopen.action.mutate({ id: props.request.id }),
						show: props.request.permissions.reopen,
					},
					{
						label: T()("requests.close"),
						type: "button",
						icon: "ban",
						variant: "danger",
						onClick: props.onClose,
						show: props.request.permissions.edit,
					},
				]}
			/>
		</>
	);
};
