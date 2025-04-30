import T from "@/translations";
import { type Component, createMemo, type JSXElement, Show } from "solid-js";
import classNames from "classnames";
import { FaSolidPlus, FaSolidTrash } from "solid-icons/fa";
import Link from "@/components/Partials/Link";
import Button from "@/components/Partials/Button";
import ContentLocaleSelect from "@/components/Partials/ContentLocaleSelect";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts";
import { useNavigate } from "@solidjs/router";

export const Standard: Component<{
	copy?: {
		title?: string;
		description?: string;
	};
	actions?: {
		delete?: {
			open: boolean;
			setOpen: (_open: boolean) => void;
			permission?: boolean;
		};
		create?: {
			open: boolean;
			setOpen: (_open: boolean) => void;
			permission?: boolean;
			label?: string;
		};
		createLink?: {
			link: string;
			label: string;
			permission?: boolean;
			show?: boolean;
		};
		link?: {
			href: string;
			label: string;
			permission?: boolean;
			icon: JSXElement;
			newTab?: boolean;
		};
		contentLocale?: boolean;
	};
	slots?: {
		bottom?: JSXElement;
	};
}> = (props) => {
	// ----------------------------------------
	// Hooks & State
	const navigate = useNavigate();

	// ----------------------------------------
	// Memos
	const showCreateAction = createMemo(() => {
		return (
			props.actions?.create !== undefined &&
			props.actions.create.permission !== false
		);
	});
	const showCreateLink = createMemo(() => {
		return (
			props.actions?.createLink !== undefined &&
			props.actions.createLink.permission !== false &&
			props.actions.createLink.show !== false
		);
	});

	// ----------------------------------------
	// Hooks & State
	useKeyboardShortcuts({
		newEntry: {
			permission: () => showCreateAction() || showCreateLink(),
			callback: () => {
				if (showCreateAction()) {
					props.actions?.create?.setOpen(true);
				}

				if (showCreateLink() && props.actions?.createLink?.link) {
					navigate(props.actions?.createLink?.link);
				}
			},
		},
	});

	// ----------------------------------------
	// Render
	return (
		<div class="bg-container-2 border-b border-border">
			<div
				class={classNames(
					"flex justify-between flex-col-reverse md:flex-row items-start gap-x-10 gap-y-15 px-15 md:px-5 pt-15 md:pt-5 pb-15",
					{
						"md:pb-5": !props.slots?.bottom,
					},
				)}
			>
				{/* Title and description */}
				<div class="w-full">
					<Show when={props.copy?.title}>
						<h1>{props.copy?.title}</h1>
					</Show>
					<Show when={props.copy?.description}>
						<p class="mt-1">{props.copy?.description}</p>
					</Show>
				</div>
				{/* Actions */}
				<Show when={props.actions}>
					<div class="flex items-center justify-end space-x-2.5 w-full">
						<Show
							when={
								props.actions?.contentLocale !== undefined &&
								props.actions.contentLocale !== false
							}
						>
							<div class="w-full md:max-w-62">
								<ContentLocaleSelect showShortcut={true} />
							</div>
						</Show>
						<Show when={showCreateAction()}>
							<Button
								type="submit"
								theme="primary"
								size="x-icon"
								onClick={() => {
									props.actions?.create?.setOpen(true);
								}}
							>
								<FaSolidPlus />
								<span class="sr-only">
									{props.actions?.create?.label ?? T()("create")}
								</span>
							</Button>
						</Show>
						<Show when={showCreateLink()}>
							<Link
								theme="primary"
								size="x-icon"
								href={props.actions?.createLink?.link}
							>
								<FaSolidPlus />
								<span class="sr-only">
									{props.actions?.createLink?.label ?? T()("create")} -{" "}
								</span>
							</Link>
						</Show>
						<Show
							when={
								props.actions?.link !== undefined &&
								props.actions.link.permission !== false
							}
						>
							<Link
								theme="primary"
								size="x-icon"
								href={props.actions?.link?.href}
								target={props.actions?.link?.newTab ? "_blank" : undefined}
							>
								{props.actions?.link?.icon}
								<span class="sr-only">{props.actions?.link?.label}</span>
							</Link>
						</Show>
						<Show
							when={
								props.actions?.delete !== undefined &&
								props.actions.delete.permission !== false
							}
						>
							<Button
								theme="danger"
								size="x-icon"
								type="button"
								onClick={() => props.actions?.delete?.setOpen(true)}
							>
								<span class="sr-only">{T()("delete")}</span>
								<FaSolidTrash />
							</Button>
						</Show>
					</div>
				</Show>
			</div>
			<Show when={props.slots?.bottom}>{props.slots?.bottom}</Show>
		</div>
	);
};
