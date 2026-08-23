import config from 'config-vite';

const sharedConfig = config();

export default {
	...sharedConfig,
	build: {
		...sharedConfig.build,
		assetsInlineLimit: 0,
	},
};
