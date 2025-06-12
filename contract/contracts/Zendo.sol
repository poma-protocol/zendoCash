// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// Uncomment this line to use console.log
// import "hardhat/console.sol";
contract Zendo {
    struct Deal {
        uint32 id;
        string dealName;
        address creator;
        uint32 maxParticipants;
        uint256 rewards;
        uint256 goal;
        uint16 numberOfDays;
        uint256 startDate;
        uint256 endDate;
        address[] participants;
        bool isActive;
        address tokenAddress;
    }
    mapping(uint32 => Deal) public deals;
    event DealCreated(
        uint32 id,
        string dealName,
        address creator,
        uint32 maxParticipants,
        uint256 rewards,
        uint256 goal,
        uint16 numberOfDays,
        uint256 startDate,
        uint256 endDate,
        address tokenAddress
    );
>
    function createDeal(
        uint32 _id,
        string memory _dealName,
        uint32 _maxParticipants,
        address _creator,
        uint256 _rewards,
        uint256 _goal,
        uint16 _numberOfDays,
        uint256 _startDate,
        uint256 _endDate,
        address _tokenAddress
    ) public returns (uint32) {
        Deal storage newDeal = deals[_id];
        newDeal.id = _id;
        newDeal.dealName = _dealName;
        newDeal.creator = _creator;
        newDeal.maxParticipants = _maxParticipants;
        newDeal.rewards = _rewards;
        newDeal.goal = _goal;
        newDeal.numberOfDays = _numberOfDays;
        newDeal.startDate = _startDate;
        newDeal.endDate = _endDate;
        newDeal.isActive = false;
        newDeal.tokenAddress = _tokenAddress;
        emit DealCreated(
            _id,
            _dealName,
            _creator,
            _maxParticipants,
            _rewards,
            _goal,
            _numberOfDays,
            _startDate,
            _endDate,
            _tokenAddress
        );
        return _id;
    }

    function activateDeal(uint32 _id, address tokenAddress) external{
        Deal storage deal = deals[_id];
        require(deal.id == _id, "Deal does not exist");
        require(!deal.isActive, "Deal is already active");
        require(deal.endDate >= block.timestamp, "Deal has ended");
        
        IERC20 token = IERC20(tokenAddress);
        uint256 amount = deal.rewards;
        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        deal.isActive = true;

    }
    
}
