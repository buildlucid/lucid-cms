import { createElement } from "react";

/** Preserves template slot HTML in `<client-slot>` elements whose content React leaves unchanged during hydration. */
const staticHtml = (name: string, html: string) =>
	createElement("client-slot", {
		key: name,
		name,
		style: { display: "contents" },
		suppressHydrationWarning: true,
		dangerouslySetInnerHTML: { __html: html },
	});

/** A component's props and children from its slots: `default` is its children, and each other slot a prop. */
export const slotProps = (
	props: Record<string, unknown>,
	slots: Record<string, string>,
) => {
	const { default: children, ...named } = slots;
	return {
		props: {
			...props,
			...Object.fromEntries(
				Object.entries(named).map(([name, html]) => [
					name,
					staticHtml(name, html),
				]),
			),
		},
		children:
			children === undefined ? undefined : staticHtml("default", children),
	};
};
