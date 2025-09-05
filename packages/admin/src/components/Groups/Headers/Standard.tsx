import T from "@/translations";
import {
	type Component,
	createMemo,
	For,
	type JSXElement,
	Show,
} from "solid-js";
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
		create?: Array<{
			open: boolean;
			setOpen: (_open: boolean) => void;
			permission?: boolean;
			label?: string;
			secondary?: boolean;
		}>;
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
	const showFirstCreateAction = createMemo(() => {
		return (
			props.actions?.create !== undefined &&
			props.actions.create[0].permission !== false
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
			permission: () => showFirstCreateAction() || showCreateLink(),
			callback: () => {
				if (showFirstCreateAction()) {
					props.actions?.create?.[0]?.setOpen(true);
					return;
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
		<div class="bg-background-base border-b border-border">
			<div
				class={classNames(
					"flex justify-between flex-col-reverse md:flex-row items-start gap-x-8 gap-y-4 px-4 md:px-6 pt-4 md:pt-6 pb-4",
					{
						"md:pb-6": !props.slots?.bottom,
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
							<div class="w-full md:max-w-42">
								<ContentLocaleSelect showShortcut={false} />
							</div>
						</Show>
						<For each={props.actions?.create}>
							{(action) => (
								<Show when={action.permission !== false}>
									<Button
										type="submit"
										theme={action.secondary ? "border-outline" : "primary"}
										size="small"
										onClick={() => {
											action.setOpen(true);
										}}
									>
										<FaSolidPlus class="mr-1" />
										{action.label ?? T()("create")}
									</Button>
								</Show>
							)}
						</For>
						<Show when={showCreateLink()}>
							<Link
								theme="primary"
								size="small"
								href={props.actions?.createLink?.link}
							>
								<FaSolidPlus class="mr-1" />
								{props.actions?.createLink?.label ?? T()("create")}
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
								size="icon"
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
								size="icon"
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
