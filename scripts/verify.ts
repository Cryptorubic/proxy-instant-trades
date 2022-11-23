import Config from '../config/InstantTradesProxyConfig.json';
import hre, { network } from 'hardhat';

async function main() {
    const config = Config.chains.find(_chain => _chain.id === network.config.chainId)!;
    const admin = config.admin ? config.admin : '0x050965d524CBDd4098C2c5c2AeDA83dA27f582e4';

    const args = [config.fixedCryptoFee, 0, [], [], [], admin, config.whitelistContract];

    await hre.run('verify:verify', {
        address: '0xC30877f01976cF1E710f902956200A901A2997f3',
        constructorArguments: args
    });
}

main()
    .then(() => {
        console.log('Finished');
    })
    .catch(err => {
        console.log('Error = ', err);
    });
