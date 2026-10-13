/** Classes shared by composer toolbar menu triggers. */
export const composerTriggerClasses =
	"flex h-7 items-center justify-center gap-1.5 rounded-md text-xs text-subtitle transition-colors hover:bg-card-hover hover:text-title focus:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary";

/** Composer triggers that hold a `ComposerTriggerLabel`. */
export const composerLabelTriggerClasses = `${composerTriggerClasses} min-w-0 max-w-48 px-2 disabled:opacity-50`;
