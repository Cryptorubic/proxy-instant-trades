const hre = require('hardhat');
import { InstantProxy } from '../typechain';

async function main() {
    const args = [0, 0, [], [], [], []];

    const factory = await hre.ethers.getContractFactory('InstantProxy');
    const contract = (await factory.deploy(...args)) as InstantProxy;

    await contract.deployed();

    console.log('Contract deployed to:', contract.address);

    await new Promise(r => setTimeout(r, 30000));

    await hre.run('verify:verify', {
        address: contract.address,
        constructorArguments: args
    });
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
