/* eslint-disable @typescript-eslint/no-loop-func */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable no-console */
import hre, { network } from 'hardhat';
const clc = require('cli-color');
import Config from '../config/InstantTradesProxyConfig.json';

async function main() {
    const filterChains = ['oasis'];

    const networks = hre.userConfig.networks;

    const blockchainNames = Object.keys(<{ [networkName: string]: any }>networks).filter(name => {
        return filterChains.includes(name);
    });

    for (let blockchain of blockchainNames) {
        try {
            console.log(`deploying to ${clc.blue(blockchain)}`);
            hre.changeNetwork(blockchain);

            const factory = await hre.ethers.getContractFactory('InstantProxy');
            const config = Config.chains.find(_chain => _chain.id === network.config.chainId)!;
            const admin = config.admin
                ? config.admin
                : '0x050965d524CBDd4098C2c5c2AeDA83dA27f582e4';

            console.log('admin: ', admin);
            console.log('WL: ', config.whitelistContract);
            console.log('cryptoFee: ', config.fixedCryptoFee);

            const args = [config.fixedCryptoFee, 0, [], [], [], admin, config.whitelistContract];

            console.log(`start deploy on ${clc.blue(blockchain)}`);
            const contract = await factory.deploy(...args);

            console.log(`waiting on ${clc.blue(blockchain)}`);
            await contract.deployed();

            await new Promise(r => setTimeout(r, 15000));

            console.log(
                `waiting for verification on ${clc.blue(blockchain)} at ${contract.address}`
            );

            await hre.run('verify:verify', {
                address: contract.address,
                constructorArguments: args
            });

            console.log(`deployed in ${clc.blue(blockchain)} to:`, contract.address);
        } catch (e) {
            console.log(`${clc.red('ERROR on ')} ${clc.red(blockchain)}: ${e}`);
        }
    }
}

main()
    .then(() => {
        console.log('Finished');
    })
    .catch(err => {
        console.log('Error = ', err);
    });
