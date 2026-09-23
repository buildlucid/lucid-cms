import classNames from "classnames";

const DIVIDER_CLASSES = [
	"[&>[data-menu-row]+[data-menu-row]]:relative",
	"[&>[data-menu-row]+[data-menu-row]]:mt-2",
	"[&>[data-menu-row]+[data-menu-row]]:before:absolute",
	"[&>[data-menu-row]+[data-menu-row]]:before:-top-1",
	"[&>[data-menu-row]+[data-menu-row]]:before:left-0",
	"[&>[data-menu-row]+[data-menu-row]]:before:right-0",
	"[&>[data-menu-row]+[data-menu-row]]:before:h-px",
	"[&>[data-menu-row]+[data-menu-row]]:before:bg-border",
].join(" ");

export interface MenuPanelAppearance {
	dividers: boolean;
	/** Caps the height at 15rem as well as the available space. */
	compact?: boolean;
}

export const menuPanelClasses = (props: MenuPanelAppearance) =>
	classNames(
		"z-60 min-w-56 max-w-(--kb-popper-content-available-width) overflow-y-auto bg-popover border border-border rounded-md p-1.5 shadow-md animate-dropdown focus:outline-hidden scrollbar",
		props.compact
			? "max-h-[min(15rem,var(--kb-popper-content-available-height))]"
			: "max-h-(--kb-popper-content-available-height)",
		props.dividers && DIVIDER_CLASSES,
	);
