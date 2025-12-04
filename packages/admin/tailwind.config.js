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
                    hover: "#242424",
                    contrast: "#a1a1a1",
                },
                dropdown: {
                    base: "#171717",
                    hover: "#0A0A0A",
                    contrast: "#E3E3E3",
                },
                input: {
                    base: "#181818",
                    contrast: "#E3E3E3",
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
                border: {
                    DEFAULT: 'rgba(255, 255, 255, 0.1)',
                },
                // Typography
                title: "#F1F1F1",
                body: "#a1a1a1",
                unfocused: "#A0A0A0",
            },
            fontFamily: {
                body: ["Inter", "sans-serif"],
            },
            screens: {
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

                "animate-slide-from-right-in":
                    "animate-slide-from-right-in 200ms ease",
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
    safelist: [
        "ql-toolbar",
        "ql-container",
        "ql-picker-label",
        "ql-stroke",
        "ql-fill",
        "ql-toolbar",
        "ql-picker-options",
        "ql-picker-item",
        "ql-selected",
        "ql-tooltip",
        "ql-action",
        "ql-remove",
        "ql-preview",
        "ql-snow",
    ],
};
