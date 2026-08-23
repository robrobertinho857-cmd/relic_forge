import path from 'node:path';
import config from 'config-vite';

const sharedConfig = config();

const portablePublicAssetUrls = {
	name: 'relic-forge-portable-public-asset-urls',
	apply: 'build',
	enforce: 'post',
	generateBundle(_options, bundle) {
		for (const output of Object.values(bundle)) {
			if (output.type !== 'asset' || !output.fileName.endsWith('.css')) continue;

			const relativeRoot = path.posix.relative(path.posix.dirname(output.fileName), '.') || '.';
			const css = typeof output.source === 'string' ? output.source : output.source.toString();
			output.source = css.replace(
				/url\((['"]?)\/((?:assets|symbols|panels|controls|sounds)\/[^)'"]+|(?:forge-background|spin-button)\.png)\1\)/g,
				(_match, quote, assetPath) =>
					`url(${quote}${relativeRoot}/${assetPath}${quote})`,
			);
		}
	},
};

export default {
	...sharedConfig,
	plugins: [...(sharedConfig.plugins ?? []), portablePublicAssetUrls],
};
