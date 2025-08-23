import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
    site: "https://lucidcms.io",
    integrations: [
        starlight({
            title: "Lucid CMS",
            favicon: "./favicon.svg",
            social: {
                github: "https://github.com/buildlucid/lucid-cms",
            },
            logo: {
                light: "./src/assets/dark-logo.svg",
                dark: "./src/assets/dark-logo.svg",
                replacesTitle: true,
            },
            components: {
                Hero: "./src/components/Hero.astro",
                SocialIcons: "./src/components/SocialIcons.astro",
            },
            customCss: ["./src/styles.css"],
            sidebar: [
                {
                    label: "Start Here",
                    items: [
                        {
                            label: "Getting Started",
                            link: "/getting-started/",
                        },
                        // {
                        // 	label: "For Non-Techies",
                        // 	link: "/non-techies/",
                        // },
                        // {
                        // 	label: "Why Lucid?",
                        // 	link: "/why-lucid/",
                        // },
                    ],
                },
                {
                    label: "Configuration",
                    items: [
                        {
                            label: "Configuring Lucid",
                            link: "/guides/configuring-lucid/",
                        },
                        {
                            label: "Collections",
                            link: "/guides/collections/",
                        },
                        {
                            label: "Bricks",
                            link: "/guides/bricks/",
                        },
                    ],
                },
                {
                    label: "Extending Lucid",
                    items: [
                        {
                            label: "With Toolkit",
                            link: "/guides/extending-with-toolkit/",
                        },
                        {
                            label: "With Hooks",
                            link: "/guides/extending-with-hooks/",
                        },
                        {
                            label: "With Plugins",
                            link: "/guides/extending-with-plugins/",
                        },
                    ],
                },
                {
                    label: "Client Integrations",
                    items: [
                        {
                            label: "Data Fetching",
                            link: "/guides/data-fetching/",
                        },
                        {
                            label: "SDK",
                            link: "/guides/sdk/",
                        },
                    ],
                },
                {
                    label: "Plugins",
                    items: [
                        // {
                        // 	label: "Forms",
                        // 	link: "/plugins/forms/",
                        // },

                        // {
                        // 	label: "Cookie Consent",
                        // 	link: "/plugins/cookie-consent/",
                        // },
                        // {
                        // 	label: "Resend",
                        // 	link: "/plugins/resend/",
                        // },
                        {
                            label: "Pages",
                            link: "/plugins/pages/",
                        },
                        {
                            label: "Nodemailer",
                            link: "/plugins/nodemailer/",
                        },
                        {
                            label: "S3",
                            link: "/plugins/s3/",
                        },
                        {
                            label: "Local Storage",
                            link: "/plugins/local-storage/",
                        },
                    ],
                },
            ],
        }),
        tailwind({
            applyBaseStyles: false,
        }),
    ],
});
