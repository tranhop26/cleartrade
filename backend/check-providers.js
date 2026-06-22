'use strict';
require('dotenv').config();
const { ethers } = require('ethers');
const { createInferenceBroker } = require('@0gfoundation/0g-compute-ts-sdk');

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log('=== Wallet Info ===');
  console.log('Address:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), '0G');

  console.log('\n=== 0G Compute Providers (chatbot) ===');
  try {
    const broker = await createInferenceBroker(wallet);
    const services = await broker.inference.listService();
    const chatbots = services.filter(s => s[1] === 'chatbot');
    
    if (chatbots.length === 0) {
      console.log('No chatbot providers found on testnet right now.');
    } else {
      chatbots.slice(0, 5).forEach((s, i) => {
        console.log(`\nProvider ${i+1}:`);
        console.log('  Address:', s[0]);
        console.log('  Model:  ', s[6]);
        console.log('  TEE:    ', s[10]);
      });
      console.log('\n👉 Copy a provider address above into COMPUTE_PROVIDER_ADDRESS in .env');
    }
  } catch(e) {
    console.log('Compute broker error:', e.message);
  }
}

main().catch(console.error);
