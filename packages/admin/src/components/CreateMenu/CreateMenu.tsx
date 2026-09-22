import classNames from "classnames";
import { FaSolidChevronRight, FaSolidPlus } from "solid-icons/fa";
import { type Component, createMemo, For, Match, Switch } from "solid-js";
import ActionIcon, {
	type ActionIconName,
} from "@/components/ActionIcon/ActionIcon";
import Button from "@/components/Button/Button";
import Link from "@/components/Link/Link";
import Menu from "@/components/Menu/Menu";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

export type CreateMenuAction =
	| {
			type: "button";
			label: string;
			icon?: ActionIconName;
			onClick: () => void;
			disabled?: boolean;
			disabledToast?: {
				title: string;
				message?: string;
				status?: "success" | "error" | "warning" | "info";
				duration?: number;
			};
	  }
	| {
			type: "link";
			label: string;
			icon?: ActionIconName;
			href: string;
	  };

/**
 * A page's create control. One thing to create renders a button, more than one
 * renders a menu behind the same plus trigger.
 */
const CreateMenu: Component<{
	actions: CreateMenuAction[];
}> = (props) => {
	// ----------------------------------
	// Memos
	const visibleActions = createMemo(() => props.actions);
	const singleAction = createMemo(() => visibleActions()[0]);

	// ----------------------------------
	// Functions
	const spawnDisabledToast = (action: CreateMenuAction) => {
		if (action.type !== "button" || !action.disabledToast) return;

		spawnToast({
			...action.disabledToast,
			status: action.disabledToast.status ?? "warning",
		});
	};
	const handleButtonAction = (
		action: Extract<CreateMenuAction, { type: "button" }>,
	) => {
		if (action.disabled) {
			spawnDisabledToast(action);
			return;
		}

		action.onClick();
	};

	// ----------------------------------
	// Render
	const renderSingleAction = () => {
		const action = singleAction();
		if (!action) return null;

		if (action.type === "button") {
			return (
				<Button
					type="button"
					variant="primary"
					size="sm"
					shape="square"
					title={action.label}
					aria-label={action.label}
					//* left clickable so a disabled action can explain itself, as the menu does
					aria-disabled={action.disabled ? "true" : undefined}
					onClick={() => handleButtonAction(action)}
					class={classNames({
						"opacity-80 cursor-not-allowed": action.disabled,
					})}
				>
					<FaSolidPlus />
				</Button>
			);
		}

		return (
			<Link
				variant="primary"
				size="sm"
				shape="square"
				href={action.href}
				title={action.label}
				aria-label={action.label}
			>
				<FaSolidPlus />
				<span class="sr-only">{action.label}</span>
			</Link>
		);
	};

	return (
		<Switch>
			<Match when={visibleActions().length === 1}>{renderSingleAction()}</Match>
			<Match when={visibleActions().length > 1}>
				<Menu.Root>
					<Menu.Trigger
						class="w-9 h-9 bg-primary hover:bg-primary-hover text-primary-foreground fill-primary-foreground border border-transparent outline-none ring-0 focus-visible:ring-1 focus:ring-primary rounded-md flex justify-center items-center transition-colors"
						onClick={(e) => e.stopPropagation()}
						title={T()("common.create")}
						aria-label={T()("common.create")}
					>
						<span class="sr-only">{T()("common.create")}</span>
						<FaSolidPlus class="pointer-events-none" />
					</Menu.Trigger>
					<Menu.Content>
						<For each={visibleActions()}>
							{(action) => (
								<Menu.Item
									href={action.type === "link" ? action.href : undefined}
									textValue={action.label}
									icon={<ActionIcon icon={action.icon} />}
									end={
										action.icon === undefined ? (
											<FaSolidChevronRight size={14} />
										) : undefined
									}
									unavailable={action.type === "button" && action.disabled}
									onSelect={() => {
										if (action.type === "button") handleButtonAction(action);
									}}
								>
									{action.label}
								</Menu.Item>
							)}
						</For>
					</Menu.Content>
				</Menu.Root>
			</Match>
		</Switch>
	);
};

export default CreateMenu;
