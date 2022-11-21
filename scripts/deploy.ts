const hre = require('hardhat');
import { InstantProxy } from '../typechain';

async function main() {
    const args = [
        0,
        0,
        [],
        [],
        [],
        '0x00009cc27c811a3e0FdD2Fd737afCc721B67eE8e',
        '0xE82CEeD600481b28417f7941fCc51b9C04170417'
    ];

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
