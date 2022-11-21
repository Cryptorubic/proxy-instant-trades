import { ethers, network } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { Wallet } from '@ethersproject/wallet';
import { InstantProxy, TestDEX, TestERC20 } from '../typechain';
import { expect } from 'chai';
import { BigNumber, BigNumber as BN, Contract } from 'ethers';
import * as consts from './shared/consts';
import { proxyFixture } from './shared/fixtures';
import { RecipientWalletTracker } from './shared/recipientWallet';
import { calcCryptoFees } from 'rubic-bridge-base/lib';
import { BridgeBase } from 'rubic-bridge-base/lib/typechain-types';
import { calcTokenFeesFromUser } from 'rubic-bridge-base/lib/test/shared/utils';

const { balance } = require('@openzeppelin/test-helpers');

interface CallSwapParams {
    inputToken?: string | TestERC20;
    inputAmount?: BigNumber;
    outputToken?: string | TestERC20;
    minOutputAmount?: BigNumber;
    recipient?: string;
    integrator?: string;
    dexAddress?: string;
}

interface EncodeDataParams {
    inputToken?: string | TestERC20;
    inputAmount?: BigNumber;
    outputToken?: string | TestERC20;
    recipient?: string;
}

describe('TestOnlySource', () => {
    let owner: Wallet, recipientWallet: Wallet, other: Wallet;
    let proxy: InstantProxy;
    let whitelist: Contract;
    let dex: TestDEX;
    let tokenA: TestERC20;
    let tokenB: TestERC20;

    async function callSwap(
        data: string,
        {
            inputToken = tokenA,
            inputAmount = consts.DEFAULT_AMOUNT_IN,
            outputToken = tokenB,
            minOutputAmount = consts.DEFAULT_AMOUNT_IN.mul(consts.DEX_PRICE),
            recipient = recipientWallet.address,
            integrator = ethers.constants.AddressZero,
            dexAddress = dex.address
        }: CallSwapParams = {}
    ) {
        const sender = await proxy.signer.getAddress();
        const recipientWalletTracker = new RecipientWalletTracker(outputToken, recipient);

        const outputTokenAddress =
            typeof outputToken !== 'string' ? outputToken.address : outputToken;

        const cryptoFees = await calcCryptoFees({
            bridge: proxy as unknown as BridgeBase,
            integrator
        });

        const tokenAmounts = await calcTokenFeesFromUser({
            bridge: proxy as unknown as BridgeBase,
            amountWithoutFee: inputAmount
        });

        if (inputToken !== ethers.constants.AddressZero) {
            const inputTokenBalanceBefore = await (<TestERC20>inputToken).balanceOf(sender);

            console.log('instantTrade', 'receive token: ', outputTokenAddress);
            await recipientWalletTracker.traceBalanceBefore();

            await proxy.instantTrade(
                {
                    inputToken: (<TestERC20>inputToken).address,
                    inputAmount: tokenAmounts.amountWithFee,
                    outputToken: outputTokenAddress,
                    minOutputAmount,
                    recipient,
                    integrator,
                    dex: dexAddress
                },
                data,
                { value: cryptoFees.totalCryptoFee }
            );

            const inputTokenBalanceAfter = await (<TestERC20>inputToken).balanceOf(sender);

            expect(inputTokenBalanceBefore.sub(inputTokenBalanceAfter)).to.be.eq(
                tokenAmounts.amountWithFee
            );
            expect(await recipientWalletTracker.getBalanceDiff()).to.be.gte(minOutputAmount);
        } else {
            const tracker = await balance.tracker(sender, 'wei');

            await recipientWalletTracker.traceBalanceBefore();

            const value = tokenAmounts.amountWithFee.add(cryptoFees.totalCryptoFee);

            console.log('instantTradeNative', 'receive token: ', outputTokenAddress);
            await proxy.instantTradeNative(
                {
                    inputToken: inputToken,
                    inputAmount,
                    outputToken: outputTokenAddress,
                    minOutputAmount,
                    recipient,
                    integrator,
                    dex: dexAddress
                },
                data,
                { value }
            );
            const deltaWithFeesSender = await tracker.deltaWithFees();

            expect(deltaWithFeesSender.delta.add(deltaWithFeesSender.fees)).to.be.eq(value.mul(-1));
            expect(await recipientWalletTracker.getBalanceDiff()).to.be.gte(minOutputAmount);
        }
    }

    async function encodeData({
        inputToken = tokenA,
        outputToken = tokenB,
        inputAmount = consts.DEFAULT_AMOUNT_IN,
        recipient = recipientWallet.address
    }: EncodeDataParams = {}): Promise<string> {
        if (typeof inputToken !== 'string') {
            if (typeof outputToken !== 'string') {
                console.log('encode swapTokenToToken');
                return dex.interface.encodeFunctionData('swapTokenToToken', [
                    (<TestERC20>inputToken).address,
                    inputAmount,
                    outputToken.address,
                    recipient
                ]);
            } else {
                console.log('encode swapTokenToNative');
                return dex.interface.encodeFunctionData('swapTokenToNative', [
                    (<TestERC20>inputToken).address,
                    inputAmount,
                    recipient
                ]);
            }
        } else {
            console.log('encode swapNativeToToken');
            if (typeof outputToken === 'string') {
                throw new Error('Cannot swap Native to Native');
            } else {
                return dex.interface.encodeFunctionData('swapNativeToToken', [
                    outputToken.address,
                    recipient
                ]);
            }
        }
    }

    async function performSwap({
        inputToken = tokenA,
        inputAmount = consts.DEFAULT_AMOUNT_IN,
        outputToken = tokenB,
        minOutputAmount = consts.DEFAULT_AMOUNT_IN.mul(consts.DEX_PRICE),
        recipient = recipientWallet.address,
        integrator = ethers.constants.AddressZero,
        dexAddress = dex.address
    }: CallSwapParams = {}) {
        const data = await encodeData({
            inputToken,
            outputToken,
            inputAmount,
            recipient
        });

        await callSwap(data, {
            inputToken,
            inputAmount,
            outputToken,
            minOutputAmount,
            recipient,
            integrator,
            dexAddress
        });
    }

    before('initialize', async () => {
        [owner, recipientWallet, other] = await (ethers as any).getSigners();
    });

    beforeEach('deploy proxy', async () => {
        ({ proxy, whitelist, dex, tokenA, tokenB } = await loadFixture(proxyFixture));
    });

    describe('right settings', () => {
        it('routers', async () => {
            const routers = await whitelist.getAvailableDEXs();
            expect(routers).to.deep.eq([dex.address]);
        });
    });

    describe('test swaps', () => {
        beforeEach('setup for swaps', async () => {
            await tokenA.transfer(dex.address, ethers.utils.parseEther('100'));
            await tokenB.transfer(dex.address, ethers.utils.parseEther('100'));

            await tokenA.approve(proxy.address, ethers.constants.MaxUint256);
            await tokenB.approve(proxy.address, ethers.constants.MaxUint256);

            await network.provider.send('hardhat_setBalance', [dex.address, '0x56bc75e2d63100000']);

            expect(await ethers.provider.getBalance(dex.address)).to.be.eq(
                ethers.utils.parseEther('100')
            );
        });

        it('swap token to token', async () => {
            await performSwap();
        });
        it('swap token to native', async () => {
            await performSwap({ outputToken: ethers.constants.AddressZero });
        });
        it('swap native to token', async () => {
            await performSwap({ inputToken: ethers.constants.AddressZero });
        });

        describe('handling abnormal situations', () => {
            it('wrong input amount in data', async () => {
                const data = await encodeData({
                    inputAmount: consts.DEFAULT_AMOUNT_IN.sub(ethers.utils.parseEther('1'))
                });

                await expect(callSwap(data)).to.be.revertedWithCustomError(
                    proxy,
                    'DifferentAmountSpent'
                );
            });
            it('user got less than minOutputAmount', async () => {
                const data = dex.interface.encodeFunctionData('fakeSwapTokenToToken', [
                    tokenA.address,
                    consts.DEFAULT_AMOUNT_IN,
                    tokenB.address,
                    owner.address
                ]);

                await expect(callSwap(data)).to.be.revertedWithCustomError(proxy, 'TooFewReceived');
            });
            it('wrong recipient', async () => {
                const data = await encodeData({
                    recipient: other.address
                });

                await expect(callSwap(data)).to.be.revertedWithCustomError(proxy, 'TooFewReceived');
            });
        });
    });
});
