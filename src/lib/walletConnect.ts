
// main.ts

import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi'

import { mainnet, arbitrum, sepolia } from 'viem/chains';
import { reconnect, signTypedData } from '@wagmi/core';
import { createStorage } from '@wagmi/core'
import { browser } from '$app/environment';

// Your WalletConnect Cloud project ID
export const projectId = 'e8bd9608b3552831851abb8ba436a708'

// Create a metadata object
const metadata = {
	name: 'latest-wagmi-test',
	description: 'AppKit Example',
	url: 'https://oracle1.stage.diadata.org', // origin must match your domain & subdomain
	icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// Create wagmiConfig
const chains = [mainnet, arbitrum, sepolia] as const
export const config = defaultWagmiConfig({
	chains,
	projectId,
	metadata,
})

export async function initializeWalletConnect() {
	console.log('loading!!!!!')
	await reconnect(config)
}

export const modal = createWeb3Modal({
	wagmiConfig: config,
	projectId,
	enableAnalytics: true, // Optional - defaults to your Cloud configuration
	enableOnramp: true // Optional - false as default
})

export const signData = async (chainId, contents, oracleaddress) => {
	const signParams = {
		domain: {
			chainId: chainId,
			name: 'Oracle Builder',
			verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
			version: '1'
		},
		types: {
			Oracle: [
				{ name: 'contents', type: 'string' },
				{ name: 'creator', type: 'address' },
				{ name: 'oracleaddress', type: 'address' }
			]
		},
		message: {
			contents,
			creator: oracleaddress,
			oracleaddress
		},
		primaryType: 'Oracle'
	}

	try {
		return await signTypedData(config, signParams)
	} catch (error) {
		console.error(error)
		return null
	}
}
