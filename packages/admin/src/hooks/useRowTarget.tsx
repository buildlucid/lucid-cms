/*
    To avoid each row containing modals and panels, this is a helper hook to allow the modals to sit on the level above and
    register the targeted row and update an open state for the specific modal or panel.
*/
import { createSignal } from "solid-js";

interface UseRowTargetProps<T extends string | number | symbol> {
	triggers: Record<T, boolean>;
}

const useRowTarget = <T extends string | number | symbol>(
	config: UseRowTargetProps<T>,
) => {
	const [getTriggers, setTriggers] = createSignal(config.triggers);
	const [getTargetId, setTargetId] = createSignal<number>();

	return {
		getTriggers,
		setTrigger: (key: T, state: boolean) => {
			setTriggers((prev) => {
				return {
					...prev,
					[key]: state,
				};
			});
			if (state === false) setTargetId(undefined);
		},
		getTargetId,
		setTargetId,
	};
};

export default useRowTarget;
