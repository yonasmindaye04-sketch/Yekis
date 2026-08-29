import { telebirrClient } from './src/modules/escrow/providers/telebirr.client.js';

async function run() {
  try {
    const result = await telebirrClient.initiatePayment({
      amountMinor: 10000, // 100.00 ETB
      currency: 'ETB',
      reference: 'Test Payment'
    });
    console.log('Payment initiation successful!');
    console.log('Provider Transaction ID:', result.providerTransactionId);
    console.log('Redirect URL:', result.redirectUrl);
  } catch (err) {
    console.error('Payment initiation failed:', err);
  }
}

run();
