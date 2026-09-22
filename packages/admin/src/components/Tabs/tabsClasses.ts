import classNames from "classnames";

export const tabsRootClasses = (fill: boolean, custom?: string) =>
	classNames(
		"relative flex items-center rounded-md border border-border bg-card-base p-1",
		{
			"w-full": fill,
			"max-w-max": !fill,
		},
		custom,
	);

export const tabsListClasses = (stretch: boolean) =>
	classNames(
		"relative z-10 flex min-w-0 flex-row flex-wrap items-center gap-1",
		{
			"w-full [&>li]:grow": stretch,
		},
	);

export const tabsIndicatorClasses = (ready: boolean, hovered: boolean) =>
	classNames("pointer-events-none absolute top-0 left-0 rounded", {
		"transition-none": !ready,
		"transition-[transform,width,height,background-color] duration-200 ease-out will-change-transform":
			ready,
		"bg-secondary-base dark:bg-input-base": !hovered,
		"bg-secondary-hover dark:bg-card-hover": hovered,
	});

export const tabsItemClasses = (
	stretch: boolean,
	active: boolean,
	custom?: string,
) =>
	classNames(
		"relative z-10 flex h-8 items-center gap-1.5 rounded px-3 text-sm font-medium whitespace-nowrap ring-inset transition-colors duration-200 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-60",
		{
			"w-full justify-center": stretch,
			"text-secondary-contrast dark:text-title": active,
			"text-body hover:text-title": !active,
		},
		custom,
	);
