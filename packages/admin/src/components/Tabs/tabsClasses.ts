import classNames from "classnames";

export const tabsRootClasses = (fill: boolean, custom?: string) =>
	classNames(
		"relative flex items-center rounded-md border border-border bg-card p-1",
		{
			"w-full": fill,
			"max-w-max": !fill,
		},
		custom,
	);

//* tabs that don't fit scroll in one row rather than wrapping
export const tabsScrollerClasses =
	"relative min-w-0 grow overflow-x-auto overscroll-x-contain scroll-smooth scrollbar-none motion-reduce:scroll-auto";

export const tabsListClasses = (stretch: boolean) =>
	classNames(
		"relative z-10 flex w-max min-w-full flex-row items-center gap-1",
		{
			"[&>li]:grow": stretch,
		},
	);

export const tabsIndicatorClasses = (ready: boolean, hovered: boolean) =>
	classNames("pointer-events-none absolute top-0 left-0 rounded", {
		"transition-none": !ready,
		"transition-[transform,width,height,background-color] duration-200 ease-out will-change-transform":
			ready,
		//* its ring is drawn inside, as the tab row scrolls and would clip one outside
		"bg-background shadow-xs inset-ring inset-ring-border dark:bg-input dark:shadow-none dark:inset-ring-0":
			!hovered,
		"bg-background/70 inset-ring inset-ring-border dark:bg-card-hover dark:inset-ring-0":
			hovered,
	});

export const tabsItemClasses = (
	stretch: boolean,
	active: boolean,
	custom?: string,
) =>
	classNames(
		"relative z-10 flex h-8 items-center gap-1.5 rounded px-3 text-sm font-medium whitespace-nowrap ring-inset transition-colors duration-200 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60",
		{
			"w-full justify-center": stretch,
			"text-title": active,
			"text-body hover:text-title": !active,
		},
		custom,
	);
