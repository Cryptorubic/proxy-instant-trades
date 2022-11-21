import { InstantProxy, TestERC20, TestDEX } from '../../typechain';
import { ethers } from 'hardhat';
import { FIXED_CRYPTO_FEE, RUBIC_PLATFORM_FEE } from './consts';
import {
    abi as WHITELIST_ABI,
    bytecode as WHITELIST_BYTECODE
} from 'rubic-whitelist-contract/artifacts/contracts/test/WhitelistMock.sol/WhitelistMock.json';
import { Contract } from 'ethers';

interface ProxyFixture {
    proxy: InstantProxy;
    whitelist: Contract;
    dex: TestDEX;
    tokenA: TestERC20;
    tokenB: TestERC20;
}

export const proxyFixture = async function (): Promise<ProxyFixture> {
    const dexFactory = await ethers.getContractFactory('TestDEX');
    const dex = (await dexFactory.deploy()) as TestDEX;

    const whitelistFactory = await ethers.getContractFactory(WHITELIST_ABI, WHITELIST_BYTECODE);
    const whitelist = await whitelistFactory.deploy();

    await whitelist.addDEXs([dex.address]);

    const proxyFactory = await ethers.getContractFactory('InstantProxy');
    const proxy = (await proxyFactory.deploy(
        FIXED_CRYPTO_FEE,
        RUBIC_PLATFORM_FEE,
        [],
        [],
        [],
        await proxyFactory.signer.getAddress(),
        whitelist.address
    )) as InstantProxy;

    const tokenFactory = await ethers.getContractFactory('TestERC20');
    const tokenA = (await tokenFactory.deploy()) as TestERC20;
    const tokenB = (await tokenFactory.deploy()) as TestERC20;

    return { proxy, whitelist, dex, tokenA, tokenB };
};
