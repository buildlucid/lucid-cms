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

export const menuPanelClasses = (dividers: boolean) =>
	classNames(
		"z-60 min-w-56 bg-dropdown-base border border-border rounded-md p-1.5 shadow-md animate-dropdown focus:outline-hidden scrollbar",
		dividers && DIVIDER_CLASSES,
	);
