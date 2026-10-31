/** Slot that captcha plugins use to render their widget on protected public forms. */
export const captchaSlotPolicies = {
	"captcha.widget": {
		surface: "captcha",
		multiple: false,
		group: "captcha.widget",
	},
} as const;
