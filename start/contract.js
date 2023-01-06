/*global ethereum, MetamaskOnboarding */

/*
The `piggybankContract` is compiled from:

  pragma solidity ^0.4.0;
  contract PiggyBank {

      uint private balance;
      address public owner;

      function PiggyBank() public {
          owner = msg.sender;
          balance = 0;
      }

      function deposit() public payable returns (uint) {
          balance += msg.value;
          return balance;
      }

      function withdraw(uint withdrawAmount) public returns (uint remainingBal) {
          require(msg.sender == owner);
          balance -= withdrawAmount;

          msg.sender.transfer(withdrawAmount);

          return balance;
      }
  }
*/
import { encrypt } from '@metamask/eth-sig-util';

const forwarderOrigin = 'http://localhost:9010'

// Created check function to see if the MetaMask extension is installed
const isMetaMaskInstalled = () => {
  //Have to check the ethereum binding on the window object to see if it's installed
  const { ethereum } = window;
  return Boolean(ethereum && ethereum.isMetaMask);
};

// Dapp status section
const networkDiv = document.getElementById('network');
const chainIdDiv = document.getElementById('chainId');
const accountsDiv = document.getElementById('accounts');

// Basic Actions Section
const onboardButton = document.getElementById('connectButton');
const getAccountsButton = document.getElementById('getAccounts');
const getAccountsResult = document.getElementById('getAccountsResult');

// Encrypt / Decrypt  Section
const getEncryptionKeyButton = document.getElementById('getEncryptionKeyButton');
const encryptMessageInput = document.getElementById('encryptMessageInput');
const encryptButton = document.getElementById('encryptButton');
const decryptButton = document.getElementById('decryptButton');
const encryptionKeyDisplay = document.getElementById('encryptionKeyDisplay');
const ciphertextDisplay = document.getElementById('ciphertextDisplay');
const cleartextDisplay = document.getElementById('cleartextDisplay');


const initialize = async () => {

  let accounts;
  let accountButtonsInitialized = false;

  const accountButtons = [
    getEncryptionKeyButton,
    encryptMessageInput,
    encryptButton,
    decryptButton,
  ]

  const isMetaMaskConnected = () => accounts && accounts.length > 0
  
  const onClickConnect = async () => {
    try {
      // Will open the MetaMask UI
      // You should disable this button while the request is pending!
      const newAccounts = await ethereum.request({ method: 'eth_requestAccounts', });
      handleNewAccounts(newAccounts)
      getNetworkAndChainId()
    } catch (error) {
      console.error(error);
    }
  };

  function handleNewAccounts (newAccounts) {
    accounts = newAccounts
    accountsDiv.innerHTML = accounts
    if (isMetaMaskConnected()) {
      initializeAccountButtons()  
    }
    updateButtons() 
  }

  const updateButtons = () => {
    const accountButtonsDisabled = !isMetaMaskConnected() || !isMetaMaskInstalled()
    if (accountButtonsDisabled) {
      for (const button of accountButtons) {
        button.disabled = true
      }
      clearTextDisplays()
    } else {
      // Todo: implement this for disabling additional buttons
    }
    
    if (isMetaMaskConnected()) {
      onboardButton.innerText = 'Connected'
      onboardButton.disabled = true
    } else {
      onboardButton.innerText = 'Connect'
      onboardButton.onclick = onClickConnect
      onboardButton.disabled = false
    }
  }

  const clearTextDisplays = () => {
    // Todo: implement this when there are text displays to clear
  }

  const initializeAccountButtons = () => {
    if (accountButtonsInitialized) {
      return 
    }
    accountButtonsInitialized = true
  }

  if (isMetaMaskInstalled()) {
    // Access the decentralized web!
    ethereum.autoRefreshOnNetworkChange = false;
    getNetworkAndChainId()

    ethereum.on('chainChanged', handleNewChain);
    ethereum.on('networkChanged', handleNewNetwork);
    ethereum.on('accountsChanged', handleNewAccounts);

    try {
      const newAccounts = await ethereum.request({ method: 'eth_accounts', });
      handleNewAccounts(newAccounts)
    } catch (error) {
      console.error('Error on init when getting accounts', error);
    }
  }

  async function getNetworkAndChainId() {
    try {
      const chainId = await ethereum.request({ method: 'eth_chainId', });
      console.log('chainId', chainId);
      handleNewChain(chainId);
      const networkId = await ethereum.request({ method: 'net_version', });
      handleNewNetwork(networkId); 
    } catch (error) {
      console.error(error);
    }
  }
  
  function handleNewChain (chainId) {
    chainIdDiv.innerHTML = chainId
  } 
  
  function handleNewNetwork (networkId) {
    networkDiv.innerHTML = networkId
  } 
  
  // Eth_Accounts-getAccountsButton
  getAccountsButton.addEventListener('click', async () => {
    // use eth_accounts to return a list of addresses owned by the user.
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    // take the first address in the array of addresses and display it.
    getAccountsResult.innerHTML = accounts[0] || 'Not able to get accounts';
  });
  
 // This to ensure user has MetaMask installed before connecting
  const MetaMaskClientCheck = () => {
    //Now we check to see if MetaMask is installed
    if (!isMetaMaskInstalled()) {
      //If it isn't installed we ask the user to click to install it
      onboardButton.innerText = 'Please install MetaMask!';
      //The button is now disabled
      onboardButton.disabled = true;
    } else {
      //If MetaMask is installed we ask the user to connect to their wallet
      onboardButton.innerText = 'Connect';
      //When the button is clicked we call this function to connect the users MetaMask Wallet
      onboardButton.onclick = onClickConnect;
      //The button is now enabled
      onboardButton.disabled = false;
    } 
    
    // Encryption / Decryption
    getEncryptionKeyButton.onclick = async () => {
      try {
        encryptionKeyDisplay.innerText = await ethereum.request({
          method: 'eth_getEncryptionPublicKey',
          params: [accounts[0]],
        });
        encryptMessageInput.disabled = false;
      } catch (error) {
        encryptionKeyDisplay.innerText = `Error: ${error.message}`;
        encryptMessageInput.disabled = true;
        encryptButton.disabled = true;
        decryptButton.disabled = true; 
      }
    };

    encryptMessageInput.onkeyup = () => {
      if (
        !getEncryptionKeyButton.disabled &&
        encryptMessageInput.value.length > 0
      ) {
        if (encryptButton.disabled) {
          encryptButton.disabled = false;
        }
      } else if (!encryptButton.disabled) {
        encryptButton.disabled = true;
      } 
    }

    encryptButton.onclick = () => {
      try {
        ciphertextDisplay.innerText = web3.toHex(JSON.stringify(
          encrypt(
            encryptionKeyDisplay.innerText,
            { 'data': encryptMessageInput.value },
            'x25519-xsalsa20-poly1305',
          ),
          )
        )
        decryptButton.disabled = false;
      } catch (error) {
        ciphertextDisplay.innerText = `Error: ${error.message}`;
        decryptButton.disabled = true; 
      }
    };

    decryptButton.onclick = async () => {
      try {
        cleartextDisplay.innerText = await ethereum.request({
          method: 'eth_decrypt',
          params: [ciphertextDisplay.innerText, ethereum.selectedAddress],
        });
      } catch (error) {
        cleartextDisplay.innerText = `Error: ${error.message}`;
      }
    }

  };

  MetaMaskClientCheck();


}
window.addEventListener('DOMContentLoaded', initialize)
