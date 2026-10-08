import type { Collection, RequestDetail, RequestDocument } from "@types";
import { TbOutlinePlus, TbOutlineX } from "solid-icons/tb";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import Button from "@/components/Button/Button";
import Menu from "@/components/Menu/Menu";
import Modal from "@/components/Modal/Modal";
import StatusIndicator, {
	type StatusIndicatorVariant,
} from "@/components/StatusIndicator/StatusIndicator";
import api from "@/services/api";
import T from "@/translations";
import {
	getAllowedTargets,
	getTargetLabel,
	getTargetStatus,
} from "@/utils/requests";

const toneIndicators: Record<
	NonNullable<ReturnType<typeof getTargetStatus>>["tone"],
	StatusIndicatorVariant
> = {
	warning: "warning-subtle",
	success: "success-subtle",
	default: "info-subtle",
	muted: "neutral-subtle",
};

export const RequestTargets: Component<{
	request: RequestDetail;
	document: RequestDocument;
	collection: Collection | undefined;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [pending, setPending] = createSignal<string[]>();

	// ----------------------------------------
	// Queries & Mutations
	const update = api.requests.useUpdateTargets({
		onSuccess: () => setPending(undefined),
	});

	// ----------------------------------------
	// Memos
	const selected = createMemo(() =>
		props.document.targets.map((target) => target.target),
	);
	//* create requests always land their document in latest
	const editable = createMemo(
		() =>
			props.request.type === "publish" &&
			props.request.status === "open" &&
			props.request.permissions.edit,
	);
	const available = createMemo(() =>
		getAllowedTargets(props.collection, props.document.source).filter(
			(target) => !selected().includes(target),
		),
	);
	//* a request always keeps at least one target
	const removable = createMemo(() => editable() && selected().length > 1);

	// ----------------------------------------
	// Functions
	const save = (targets: string[]) => {
		if (props.request.approved) {
			setPending(targets);
			return;
		}
		update.action.mutate({
			id: props.request.id,
			requestDocumentId: props.document.id,
			body: { targets },
		});
	};
	const add = (target: string) => {
		const allowed = getAllowedTargets(props.collection, props.document.source);
		save(allowed.filter((key) => key === target || selected().includes(key)));
	};
	const remove = (target: string) =>
		save(selected().filter((key) => key !== target));

	// ----------------------------------------
	// Render
	return (
		<>
			<ul class="flex flex-wrap items-center gap-2">
				<For each={props.document.targets}>
					{(target) => {
						const targetStatus = () => getTargetStatus(props.request, target);
						return (
							<li class="flex h-8 items-center gap-2 rounded-full border border-border bg-input ps-3 pe-1 text-xs">
								<Show when={targetStatus()}>
									{(status) => (
										<StatusIndicator variant={toneIndicators[status().tone]} />
									)}
								</Show>
								<span class="text-subtitle">
									{getTargetLabel(props.collection, target.target)}
								</span>
								<Show when={targetStatus()}>
									{(status) => <span class="text-muted">{status().label}</span>}
								</Show>
								<Show when={removable()} fallback={<span class="w-2" />}>
									<Button
										variant="danger-ghost"
										size="xs"
										shape="circle"
										aria-label={T()("requests.targets.remove", {
											target: getTargetLabel(props.collection, target.target),
										})}
										disabled={update.action.isPending}
										onClick={() => remove(target.target)}
									>
										<TbOutlineX size={10} />
									</Button>
								</Show>
							</li>
						);
					}}
				</For>
				<Show when={editable() && available().length > 0}>
					<li>
						<Menu.Root>
							<Menu.Trigger
								class="flex h-8 items-center gap-1.5 rounded-full border border-dashed border-border px-3 text-xs text-muted transition-colors hover:border-primary/60 hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-60"
								disabled={update.action.isPending}
							>
								<TbOutlinePlus size={9} />
								{T()("requests.targets.add")}
							</Menu.Trigger>
							<Menu.Content>
								<For each={available()}>
									{(target) => (
										<Menu.Item onSelect={() => add(target)}>
											{getTargetLabel(props.collection, target)}
										</Menu.Item>
									)}
								</For>
							</Menu.Content>
						</Menu.Root>
					</li>
				</Show>
			</ul>
			<Modal.Confirm
				open={pending() !== undefined}
				onOpenChange={(open) => {
					if (!open) setPending(undefined);
				}}
				title={T()("requests.targets.change.title")}
				description={T()("requests.targets.change.description")}
				confirmLabel={T()("common.save")}
				confirmVariant="primary"
				loading={update.action.isPending}
				error={update.errors()?.message}
				onConfirm={() => {
					const targets = pending();
					if (!targets) return;
					update.action.mutate({
						id: props.request.id,
						requestDocumentId: props.document.id,
						body: { targets },
					});
				}}
			/>
		</>
	);
};
