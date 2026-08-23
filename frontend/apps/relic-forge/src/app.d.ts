/// <reference types="@sveltejs/kit" />

/**
 * The shared env package is consumed by SvelteKit applications, so these
 * public variables need to be part of the app's generated env contract even
 * when they are intentionally unset in local development.
 */
declare module '$env/static/public' {
	export const PUBLIC_SITE_MODE: string | undefined;
	export const PUBLIC_SENTRY_DSN: string | undefined;
	export const PUBLIC_CHROMATIC: string | undefined;
}
