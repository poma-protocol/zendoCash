// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

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
        uint256 endDate
    );

    function createDeal(
        uint32 _id,
        string memory _dealName,
        uint32 _maxParticipants,
        address _creator,
        uint256 _rewards,
        uint256 _goal,
        uint16 _numberOfDays,
        uint256 _startDate,
        uint256 _endDate
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
        emit DealCreated(
            _id,
            _dealName,
            _creator,
            _maxParticipants,
            _rewards,
            _goal,
            _numberOfDays,
            _startDate,
            _endDate
        );
        return _id;
    }
}
