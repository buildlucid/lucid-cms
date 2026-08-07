/** @type {import('tailwindcss').Config} */

export default {
	mode: "jit",
	content: ["../src/**/*.{js,jsx,ts,tsx}"],
	theme: {
		extend: {
			fontFamily: {
				body: ["Inter", "sans-serif"],
			},
			screens: {
				xs: "420px",
				"3xl": "1600px",
			},
			gridTemplateColumns: {
				"main-layout": "auto 1fr",
			},
			animation: {
				"animate-enter": "animation-enter 0.2s ease",
				"animate-leave": "animation-leave 0.2s ease",
				"animate-dropdown": "animation-dropdown 0.2s ease",
				"animate-from-left": "animation-from-left 0.2s ease",

				"animate-fade-out": "animation-fade-out 0.2s ease",
				"animate-fade-in": "animation-fade-in 0.2s ease",

				"animate-slide-from-right-in": "animate-slide-from-right-in 200ms ease",
				"animate-slide-from-right-out":
					"animate-slide-from-right-out 200ms ease 100ms forwards",
				"animate-slide-from-left-in": "animate-slide-from-left-in 200ms ease",
				"animate-slide-from-left-out":
					"animate-slide-from-left-out 200ms ease 100ms forwards",

				"animate-slide-from-bottom-in":
					"animate-slide-from-bottom-in 200ms ease",
				"animate-slide-from-bottom-out":
					"animate-slide-from-bottom-out 200ms ease 100ms forwards",

				"animate-overlay-show": "animate-overlay-show 0.2s ease",
				"animate-overlay-hide": "animate-overlay-hide 0.2s ease",
				"animate-modal-show": "animate-modal-show 0.2s ease",
				"animate-modal-hide": "animate-modal-hide 0.2s ease",
			},
			spacing: {
				15: "15px",
			},
		},
	},
	safelist: [],
};
