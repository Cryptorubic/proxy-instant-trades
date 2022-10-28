import { BaseContract, BigNumber, CallOverrides } from 'ethers';
import { PromiseOrValue } from '../../typechain/common';
import { ethers } from 'hardhat';
const { balance } = require('@openzeppelin/test-helpers');

interface TokenWithBalanceOf extends BaseContract {
    balanceOf(account: PromiseOrValue<string>, overrides?: CallOverrides): Promise<BigNumber>;
}

export class RecipientWalletTracker {
    address: string;

    token: TokenWithBalanceOf | string;

    tracker: any;

    balanceBefore: BigNumber;

    constructor(token: TokenWithBalanceOf | string, address: string) {
        this.token = token;
        this.address = address;
        this.balanceBefore = BigNumber.from(0);
    }

    async traceBalanceBefore(): Promise<BigNumber> {
        if (this.token === ethers.constants.AddressZero) {
            this.tracker = await balance.tracker(this.address, 'wei');
            this.balanceBefore = await this.tracker.get();
            return this.balanceBefore;
        } else {
            this.balanceBefore = await (<TokenWithBalanceOf>this.token).balanceOf(this.address);
            return this.balanceBefore;
        }
    }

    async getBalanceDiff(): Promise<BigNumber> {
        if (this.token === ethers.constants.AddressZero) {
            const deltaWithFee = await this.tracker.deltaWithFees();
            return deltaWithFee.delta.add(deltaWithFee.fees);
        } else {
            const balanceAfter = await (<TokenWithBalanceOf>this.token).balanceOf(this.address);
            const diff = balanceAfter.sub(this.balanceBefore);

            this.balanceBefore = balanceAfter;

            return diff;
        }
    }
}
