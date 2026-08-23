import { build } from 'vite';

// SvelteKit's static public-env module only exposes variables present at build
// time. Keep optional observability/site flags explicit without inventing
// deployment values when a local production build has no .env file.
process.env.PUBLIC_SITE_MODE ??= '';
process.env.PUBLIC_SENTRY_DSN ??= '';
process.env.PUBLIC_CHROMATIC ??= 'false';

try {
	await build();
	process.exit(0);
} catch (error) {
	console.error(error);
	process.exit(1);
}
