import { getMediationQueue } from "./src/modules/disputes/dispute.service.js";

async function run() {
  try {
    const queue = await getMediationQueue();
    console.log("Queue size:", queue.total);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
