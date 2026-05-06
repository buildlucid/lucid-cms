/** @type {import('tailwindcss').Config} */

export default {
	mode: "jit",
	content: ["../src/**/*.{js,jsx,ts,tsx}"],
	theme: {
		extend: {
			colors: {
				primary: {
					base: "#C1FE77",
					hover: "#D0FF96",
					contrast: "#131313",
					"muted-bg": "#2F3A20",
					"muted-border": "#5B753B",
				},
				secondary: {
					base: "rgba(229, 229, 229, 1)",
					hover: "rgba(229, 229, 229, 0.9)",
					contrast: "#171717",
				},
				sidebar: {
					base: "#171717",
				},
				background: {
					base: "#0A0A0A",
					hover: "#171717",
				},
				card: {
					base: "#0F0F0F",
					hover: "#171717",
					contrast: "#a1a1a1",
				},
				dropdown: {
					base: "#121212",
					hover: "#0A0A0A",
					contrast: "#C9C9C9",
				},
				input: {
					base: "#181818",
					contrast: "#C9C9C9",
				},
				icon: {
					base: "#E3E3E3",
					hover: "#E8E8E8",
				},
				error: {
					base: "#F75555",
					hover: "#F63737",
					contrast: "#242424",
				},
				warning: {
					base: "#FFC107",
					contrast: "#000000",
				},
				workflow: {
					yellow: {
						bg: "rgba(255, 193, 7, 0.14)",
						border: "rgba(255, 193, 7, 0.28)",
						text: "#FFD95A",
					},
					green: {
						bg: "rgba(61, 220, 151, 0.14)",
						border: "rgba(61, 220, 151, 0.28)",
						text: "#6EE7B7",
					},
					blue: {
						bg: "rgba(56, 189, 248, 0.14)",
						border: "rgba(56, 189, 248, 0.28)",
						text: "#7DD3FC",
					},
					purple: {
						bg: "rgba(168, 85, 247, 0.14)",
						border: "rgba(168, 85, 247, 0.28)",
						text: "#C084FC",
					},
				},
				info: {
					faded: "#ABABAB",
					base: "#007BFF",
					contrast: "#FFFFFF",
				},
				border: {
					DEFAULT: "rgba(255, 255, 255, 0.1)",
				},
				// Typography
				title: "#F1F1F1",
				subtitle: "#C9C9C9",
				body: "#a1a1a1",
				unfocused: "#A0A0A0",
			},
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
