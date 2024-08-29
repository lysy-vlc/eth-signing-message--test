import { browser } from '$app/environment'
import { initializeWalletConnect } from '$lib/walletConnect'

export const load = () => {
	if (browser) {
		return {
			initializeApp: async () => {
				await initializeWalletConnect()
			}
		}
	}
	return {}
}