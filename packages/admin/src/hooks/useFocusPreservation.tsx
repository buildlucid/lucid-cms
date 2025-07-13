export type FocusState = {
	selector: string | null;
};

export const useFocusPreservation = () => {
	const captureFocus = (): FocusState => {
		const activeElement = document.activeElement as HTMLElement;

		if (!activeElement) {
			return {
				selector: null,
			};
		}

		let selector: string | null = null;
		if (activeElement.id) {
			selector = `#${activeElement.id}`;
		}

		return {
			selector,
		};
	};

	const restoreFocus = (focusState: FocusState | null) => {
		if (typeof focusState?.selector !== "string") return;

		setTimeout(() => {
			if (typeof focusState?.selector !== "string") return;

			const fieldToFocus = document.querySelector(
				focusState.selector,
			) as HTMLInputElement;

			if (fieldToFocus) fieldToFocus.focus();
		}, 100);
	};

	return { captureFocus, restoreFocus };
};
