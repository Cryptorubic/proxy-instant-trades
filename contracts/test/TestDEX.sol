// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract TestDEX {
    uint256 public constant price = 2;

    function swapTokenToToken(
        address _fromToken,
        uint256 _inputAmount,
        address _toToken,
        address _recipient
    ) external {
        IERC20(_fromToken).transferFrom(msg.sender, address(this), _inputAmount);
        IERC20(_toToken).transfer(_recipient, _inputAmount * price);
    }

    function swapNativeToToken(
        address _toToken,
        address _recipient
    ) external payable {
        IERC20(_toToken).transfer(_recipient, msg.value * price);
    }

    function swapTokenToNative(
        address _fromToken,
        uint256 _inputAmount,
        address _recipient
    ) external {
        IERC20(_fromToken).transferFrom(msg.sender, address(this), _inputAmount);
        payable(_recipient).transfer(_inputAmount * price);
    }

    function fakeSwapTokenToToken(
        address _fromToken,
        uint256 _inputAmount,
        address _toToken,
        address _recipient
    ) external {
        IERC20(_fromToken).transferFrom(msg.sender, address(this), _inputAmount);
    }
}