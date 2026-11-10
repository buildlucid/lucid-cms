import classNames from "classnames";
import {
	TbOutlineLayoutSidebarRightCollapse,
	TbOutlineLayoutSidebarRightExpand,
} from "solid-icons/tb";
import { type Component, createMemo, type JSXElement, Show } from "solid-js";
import Button from "@/components/Button/Button";
import Tooltip from "@/components/Tooltip/Tooltip";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import T from "@/translations";

/**
 * Sticky document details with independent overflow scrolling. Collapses to a clickable 40px rail
 * and remembers its state on this device.
 */
const DetailsColumn: Component<{ children: JSXElement }> = (props) => {
	// ----------------------------------------
	// State & Hooks
	let expandButton: HTMLButtonElement | undefined;
	let collapseButton: HTMLButtonElement | undefined;

	// ----------------------------------------
	// Memos
	const collapsed = createMemo(
		() => userPreferencesStore.getSectionOpen("pageBuilder.sidebar") === false,
	);

	// ----------------------------------------
	// Functions
	//* the button pressed goes as the column changes, so focus moves to the one that replaces it
	const setOpen = (open: boolean) => {
		userPreferencesStore.setSectionOpen("pageBuilder.sidebar", open);
		(open ? collapseButton : expandButton)?.focus();
	};

	// ----------------------------------------
	// Render
	return (
		<aside
			aria-label={T()("builder.details.label")}
			class={classNames(
				"relative shrink-0 overflow-clip border-s border-border bg-card transition-[width] duration-300 ease-emphasized motion-reduce:transition-none",
				collapsed() ? "w-10" : "w-82.5",
			)}
		>
			<Show
				when={!collapsed()}
				fallback={
					<Tooltip
						ref={expandButton}
						type="button"
						aria-label={T()("builder.details.expand")}
						content={T()("builder.details.expand")}
						aria-expanded={false}
						onClick={() => setOpen(true)}
						class="group absolute inset-0 flex cursor-pointer justify-center text-icon transition-colors hover:bg-card-hover hover:text-icon-hover focus-ring-inset"
					>
						<span class="sticky top-[calc(50dvh+var(--document-header-bar-height,0px)/2-1.375rem)] mt-[calc(50dvh-5rem)] flex size-7 items-center justify-center">
							<TbOutlineLayoutSidebarRightExpand size={12} />
						</span>
					</Tooltip>
				}
			>
				<div class="scrollbar sticky top-(--document-header-bar-height) max-h-[calc(100dvh-var(--document-header-bar-height,0px)-1rem)] w-82.5 animate-fade-in overflow-y-auto">
					<div class="sticky top-0 z-10 flex h-11 items-center justify-between gap-2 border-b border-border bg-card ps-4 pe-2 md:ps-5">
						<h2 class="truncate text-sm font-medium text-title">
							{T()("builder.details.label")}
						</h2>
						<Button
							ref={collapseButton}
							type="button"
							variant="toolbar"
							size="xs"
							shape="square"
							tooltip={T()("builder.details.collapse")}
							aria-label={T()("builder.details.collapse")}
							aria-expanded={true}
							onClick={() => setOpen(false)}
						>
							<TbOutlineLayoutSidebarRightCollapse size={12} />
						</Button>
					</div>
					{props.children}
				</div>
			</Show>
		</aside>
	);
};

export default DetailsColumn;
