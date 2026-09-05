process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
import { telebirrClient } from './src/modules/escrow/providers/telebirr.client.js';

async function run() {
  try {
    const result = await telebirrClient.initiatePayment({
      amountMinor: 1000, // 10.00 ETB
      currency: 'ETB',
      reference: 'Wallet Top-up'
    });
    console.log('Payment initiation successful!');
    console.log('Provider Transaction ID:', result.providerTransactionId);
    console.log('Redirect URL:', result.redirectUrl);
  } catch (err) {
    console.error('Payment initiation failed:', err);
  }
}

run();
