interface FocusSnapshot {
	id?: string;
	focusKey?: string;
	selectionStart?: number | null;
	selectionEnd?: number | null;
}

export function useFocusSnapshot() {
	const escapeAttributeValue = (value: string) => {
		return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
	};

	const getFocusableElement = (element: HTMLElement): HTMLElement | null => {
		if (
			element instanceof HTMLInputElement ||
			element instanceof HTMLTextAreaElement ||
			element.isContentEditable
		) {
			return element;
		}

		return element.querySelector<HTMLElement>(
			'input, textarea, [contenteditable="true"], [tabindex]',
		);
	};

	const captureFocusSnapshot = (): FocusSnapshot | null => {
		const activeElement = document.activeElement;
		if (!(activeElement instanceof HTMLElement)) return null;
		const focusContainer =
			activeElement.closest<HTMLElement>("[data-focus-key]");
		const focusKey = focusContainer?.dataset.focusKey;
		if (!activeElement.id && !focusKey) return null;

		if (
			activeElement instanceof HTMLInputElement ||
			activeElement instanceof HTMLTextAreaElement
		) {
			return {
				id: activeElement.id || undefined,
				focusKey,
				selectionStart: activeElement.selectionStart,
				selectionEnd: activeElement.selectionEnd,
			};
		}

		return {
			id: activeElement.id || undefined,
			focusKey,
		};
	};

	const restoreFocusSnapshot = (snapshot: FocusSnapshot | null) => {
		if (!snapshot) return;

		requestAnimationFrame(() => {
			const focusKeySelector = snapshot.focusKey
				? `[data-focus-key="${escapeAttributeValue(snapshot.focusKey)}"]`
				: null;
			const element = focusKeySelector
				? document.querySelector<HTMLElement>(focusKeySelector)
				: snapshot.id
					? document.getElementById(snapshot.id)
					: null;
			if (!(element instanceof HTMLElement)) return;

			const focusTarget = getFocusableElement(element) || element;

			focusTarget.focus({ preventScroll: true });

			if (
				(focusTarget instanceof HTMLInputElement ||
					focusTarget instanceof HTMLTextAreaElement) &&
				snapshot.selectionStart !== undefined &&
				snapshot.selectionEnd !== undefined
			) {
				focusTarget.setSelectionRange(
					snapshot.selectionStart,
					snapshot.selectionEnd,
				);
			}
		});
	};

	return {
		captureFocusSnapshot,
		restoreFocusSnapshot,
	};
}
