const focusableSelector = [
	"input:not([disabled]):not([type='hidden'])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	"button:not([disabled])",
	"[contenteditable='true']",
	"[tabindex]:not([tabindex='-1'])",
].join(",");

/** Centers the field and focuses it or its first focusable child. Used by error links. */
export const focusField = (id: string) => {
	const element = document.getElementById(id);
	if (!element) return;

	const target = element.matches(focusableSelector)
		? element
		: element.querySelector<HTMLElement>(focusableSelector);
	const reducedMotion =
		window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

	element.scrollIntoView({
		behavior: reducedMotion ? "auto" : "smooth",
		block: "center",
	});
	target?.focus({ preventScroll: true });
};
