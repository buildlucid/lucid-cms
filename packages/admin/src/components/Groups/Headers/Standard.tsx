import { useNavigate } from "@solidjs/router";
import classNames from "classnames";
import { FaSolidTrash } from "solid-icons/fa";
import { type Component, createMemo, type JSXElement, Show } from "solid-js";
import Button from "@/components/Partials/Button";
import ContentLocaleSelect from "@/components/Partials/ContentLocaleSelect";
import Link from "@/components/Partials/Link";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts";
import T from "@/translations";
import HeaderPrimaryActions, {
	type HeaderPrimaryAction,
} from "./HeaderPrimaryActions";

export interface StandardCreateAction {
	open: boolean;
	setOpen: (_open: boolean) => void;
	permission?: boolean;
	label?: string;
	secondary?: boolean;
}

export interface StandardCreateLinkAction {
	link: string;
	label: string;
	permission?: boolean;
	show?: boolean;
}

export interface StandardHeaderActions {
	delete?: {
		open: boolean;
		setOpen: (_open: boolean) => void;
		permission?: boolean;
	};
	create?: StandardCreateAction[];
	createLink?: StandardCreateLinkAction;
	link?: {
		href: string;
		label: string;
		permission?: boolean;
		icon: JSXElement;
		newTab?: boolean;
	};
	contentLocale?: boolean;
}

export const Standard: Component<{
	copy?: {
		title?: string;
		description?: string;
	};
	actions?: StandardHeaderActions;
	slots?: {
		bottom?: JSXElement;
	};
}> = (props) => {
	// ----------------------------------------
	// Hooks & State
	const navigate = useNavigate();

	// ----------------------------------------
	// Memos
	const primaryActions = createMemo<HeaderPrimaryAction[]>(() => {
		const actions: HeaderPrimaryAction[] = [];

		for (const action of props.actions?.create || []) {
			if (action.permission === false) continue;
			actions.push({
				type: "button",
				label: action.label ?? T()("create"),
				secondary: action.secondary,
				onClick: () => {
					action.setOpen(true);
				},
			});
		}

		const createLink = props.actions?.createLink;
		if (
			createLink !== undefined &&
			createLink.permission !== false &&
			createLink.show !== false
		) {
			actions.push({
				type: "link",
				label: createLink.label ?? T()("create"),
				href: createLink.link,
			});
		}

		return actions;
	});

	const firstPrimaryAction = createMemo(() => primaryActions()[0]);

	// ----------------------------------------
	// Hooks & State
	useKeyboardShortcuts({
		newEntry: {
			permission: () => firstPrimaryAction() !== undefined,
			callback: () => {
				const action = firstPrimaryAction();
				if (!action) return;
				if (action.type === "button") action.onClick();
				if (action.type === "link") navigate(action.href);
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
								<ContentLocaleSelect showShortcut={true} />
							</div>
						</Show>
						<HeaderPrimaryActions actions={primaryActions()} />
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
