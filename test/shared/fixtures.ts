import { InstantProxy, TestERC20, TestDEX } from '../../typechain';
import { ethers } from 'hardhat';

interface ProxyFixture {
    proxy: InstantProxy;
    dex: TestDEX;
    tokenA: TestERC20;
    tokenB: TestERC20;
}

export const proxyFixture = async function (): Promise<ProxyFixture> {
    const dexFactory = await ethers.getContractFactory('TestDEX');
    const dex = (await dexFactory.deploy()) as TestDEX;

    const proxyFactory = await ethers.getContractFactory('InstantProxy');
    const proxy = (await proxyFactory.deploy([dex.address], [], [], [])) as InstantProxy;

    const tokenFactory = await ethers.getContractFactory('TestERC20');
    const tokenA = (await tokenFactory.deploy()) as TestERC20;
    const tokenB = (await tokenFactory.deploy()) as TestERC20;

    return { proxy, dex, tokenA, tokenB };
};
