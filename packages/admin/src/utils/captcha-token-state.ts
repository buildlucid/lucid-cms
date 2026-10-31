const TOKEN_TIMEOUT = 120_000;

/** Holds a captcha widget's token for its `CaptchaWidgetHandle`. Pass `setToken` to the provider's success callback. */
export const createCaptchaTokenState = () => {
	let token: string | undefined;
	let waiting:
		| { resolve: (token: string) => void; reject: (error: Error) => void }
		| undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const reset = () => {
		clearTimeout(timer);
		token = undefined;
		waiting?.reject(new Error("The captcha check was interrupted."));
		waiting = undefined;
	};

	return {
		setToken: (value: string) => {
			clearTimeout(timer);
			if (waiting) {
				waiting.resolve(value);
				waiting = undefined;
			} else {
				token = value;
			}
		},
		getToken: (challenge?: () => void): Promise<string> => {
			if (token) {
				const value = token;
				token = undefined;
				return Promise.resolve(value);
			}

			reset();
			return new Promise<string>((resolve, reject) => {
				waiting = { resolve, reject };
				timer = setTimeout(reset, TOKEN_TIMEOUT);
				try {
					challenge?.();
				} catch {
					reset();
				}
			});
		},
		/** Clears the token and rejects anything waiting, such as when the token expires or the widget fails. */
		reset,
	};
};
