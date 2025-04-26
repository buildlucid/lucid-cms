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
                    base: "#FFFFFF",
                    hover: "#F1F1F1",
                    contrast: "#131313",
                },
                container: {
                    1: "#070707", // navbar / header
                    2: "#1D1D1D", // banner / primary container
                    3: "#131313", // background
                    4: "#242424", // inputs / secondary container
                    5: "#111111", // table hover
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
                    DEFAULT: "#252525",
                    input: "#343434",
                },
                // Typography
                title: "#F1F1F1",
                body: "#C7C7C7",
                unfocused: "#A0A0A0",
            },
            fontFamily: {
                display: ["Archivo", "sans-serif"],
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
