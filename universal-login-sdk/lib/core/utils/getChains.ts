import {ProviderDict, Chains} from '../../config/Chains';

export function getChains(providerDict: ProviderDict): Chains {
    const chains: Chains = {};
    for (const chainName in providerDict) {
        const provider = providerDict[chainName];
        chains[chainName] = {provider};
    }
    return chains;
}
