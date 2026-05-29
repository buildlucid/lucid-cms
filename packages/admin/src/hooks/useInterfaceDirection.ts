import { createMemo } from "solid-js";
import { getDirection } from "@/translations";

export const useInterfaceDirection = () => {
	const direction = createMemo(() => getDirection());
	const isLTR = createMemo(() => direction() === "ltr");
	const isRTL = createMemo(() => direction() === "rtl");

	return {
		direction,
		isLTR,
		isRTL,
	};
};

export type UseInterfaceDirection = ReturnType<typeof useInterfaceDirection>;
