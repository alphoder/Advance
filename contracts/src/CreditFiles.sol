// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Encrypted credit files, stored as event data on Monad. Contents are encrypted in the
/// browser with keys derived from the owner's passkey; this contract only sees ciphertext.
/// Sharing = publishing the file key wrapped (ECDH) to one lender's passkey-derived public key.
contract CreditFiles {
    uint256 public constant MAX_BLOB = 48_000;

    event EncryptionKey(address indexed owner, bytes pubkey);
    event FilePublished(address indexed owner, bytes32 indexed id, string name, bytes blob);
    event AccessGranted(address indexed owner, bytes32 indexed id, address indexed lender, bytes wrappedKey);

    error TooLarge();

    function setEncryptionKey(bytes calldata pubkey) external {
        emit EncryptionKey(msg.sender, pubkey);
    }

    function publish(bytes32 id, string calldata name, bytes calldata blob) external {
        if (blob.length > MAX_BLOB) revert TooLarge();
        emit FilePublished(msg.sender, id, name, blob);
    }

    function grant(bytes32 id, address lender, bytes calldata wrappedKey) external {
        emit AccessGranted(msg.sender, id, lender, wrappedKey);
    }
}
