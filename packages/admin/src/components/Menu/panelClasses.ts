import classNames from "classnames";

//* Kobalte pads the panel with focus sentinels, so the line keys off the
//* marker every row carries rather than sibling position. Adjacency matters:
//* a general sibling selector would also draw a line under a separator, and
//* anything between two rows - a label, a separator, a radio group - is meant
//* to break the run. It is drawn as a pseudo element centred in the gap,
//* because a border on the row itself follows the row's rounded corners and
//* curls at both ends.
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

/** Shared by the menu panel and any nested one, so the two match. */
export const menuPanelClasses = (dividers: boolean) =>
	classNames(
		//* above sticky page chrome; an overlay's layer overrides it below
		"z-60 min-w-56 bg-dropdown-base border border-border rounded-md p-1.5 shadow-md animate-dropdown focus:outline-hidden scrollbar",
		dividers && DIVIDER_CLASSES,
	);
