import config from 'config-svelte';

const sharedConfig = config();

export default {
	...sharedConfig,
	kit: {
		...sharedConfig.kit,
		output: {
			...sharedConfig.kit?.output,
			// CSS contains public artwork URLs. Keeping a single stylesheet external
			// lets Vite rebase those URLs relative to the emitted stylesheet;
			// inlining that CSS into index.html would make those rebased paths
			// resolve from the wrong directory on nested Stake hosting.
			bundleStrategy: 'single',
		},
		paths: {
			...sharedConfig.kit?.paths,
			relative: true,
		},
	},
};
