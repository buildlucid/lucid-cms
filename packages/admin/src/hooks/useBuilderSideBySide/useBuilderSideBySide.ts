import { type Accessor, createMemo } from "solid-js";
import { useAgentSession } from "@/hooks/useAgentSession/useAgentSession";
import { useMediaQuery } from "@/hooks/useMediaQuery/useMediaQuery";

/**
 * Matches `content-lg` to determine whether fields fit beside another view, accounting for the
 * docked agent panel from xl.
 */
export const useBuilderSideBySide = (): Accessor<boolean> => {
	const session = useAgentSession();
	const lg = useMediaQuery("(width >= 64rem)");
	const lgBesidePanel = useMediaQuery("(width >= 89rem)");

	return createMemo(() => lg() && (!session.panel.docked() || lgBesidePanel()));
};
