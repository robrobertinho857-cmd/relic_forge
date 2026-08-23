const ASSET_ROOT = './assets';

export const assetUrl = (assetPath: string) =>
	`${ASSET_ROOT}/${assetPath.replace(/^\/+/, '')}`;
