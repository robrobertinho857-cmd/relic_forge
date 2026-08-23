import config from 'config-svelte';

const sharedConfig = config();

export default {
	...sharedConfig,
	kit: {
		...sharedConfig.kit,
		output: {
			...sharedConfig.kit?.output,
			// Keep the Vite-generated stylesheet external so its imported artwork
			// URLs remain portable on nested Stake hosting paths.
			bundleStrategy: 'single',
		},
		paths: {
			...sharedConfig.kit?.paths,
			relative: true,
		},
	},
};
