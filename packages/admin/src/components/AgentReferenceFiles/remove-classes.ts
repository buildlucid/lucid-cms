/** The small square danger outline that removes a reference, revealed on hover or focus. Position it with `start-*`/`end-*` and `top-*`. */
export const referenceRemoveClasses =
	"absolute flex size-5 items-center justify-center rounded border transition-[opacity,background-color,color] focus:outline-hidden focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-primary group-hover:opacity-100 pointer-coarse:opacity-100";

/** Its resting look, before hover or a confirming click. */
export const referenceRemoveIdleClasses =
	"border-border bg-input text-subtitle fill-subtitle opacity-0 hover:border-danger hover:bg-danger-hover hover:text-danger-foreground hover:fill-danger-foreground";
