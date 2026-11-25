import { type Language } from "./i18n";
import type { PaymentRail } from "./BrowserWallet";

export type BrowserWalletCopy = {
  providers: Record<PaymentRail, string>;
  creditedToWallet: (amountEtb: string) => string;
  paymentDeclined: string;
  couldNotRefreshStatus: string;
  checkoutAwaiting: string;
  sandboxSimFailed: string;
  enterValidAmount: string;
  checkoutInitFailed: string;
  enterTxRef: string;
  uploadReceiptPrompt: string;
  topUpSubmitted: string;
  submissionFailed: string;
  enterTxCode: string;
  selectReceiptFile: string;
  receiptAttached: string;
  attachReceiptFailed: string;
  otpSent: string;
  otpSendFailed: string;
  enterWithdrawAmountAndDest: string;
  withdrawExceedsBalance: string;
  enterOtpCode: string;
  withdrawHeldReview: string;
  withdrawActiveContract: string;
  withdrawSuccess: (amountEtb: string) => string;
  withdrawalFailed: string;
  availableBalance: string;
  heroDescFreelancer: string;
  heroDescBoth: string;
  heroDescClient: string;
  payoutTaxVoucherBtn: string;
  invoiceEscrowReceiptBtn: string;
  verifiedPayoutEyebrow: string;
  withdrawEarningsHeading: string;
  choosePayoutDest: string;
  telebirrSub: string;
  cbeBankName: string;
  cbeBankSub: string;
  mpesaSub: string;
  amountEtbLabel: string;
  amountPlaceholder: string;
  telebirrPhoneLabel: string;
  mpesaPhoneLabel: string;
  cbeAccountLabel: string;
  approvalCodeLabel: string;
  approvalCodePlaceholder: string;
  sending: string;
  resendCode: string;
  sendCode: string;
  devCodePrefix: string;
  processing: string;
  requestWithdrawalBtn: string;
  addFundsEyebrow: string;
  topUpWalletHeading: string;
  hideTopUpAria: string;
  showTopUpAria: string;
  topUpMethodAria: string;
  instantCheckoutTab: string;
  manualTransferTab: string;
  instantIntro: string;
  instantC2b: string;
  manualTransferSub: string;
  cbeTitle: string;
  mpesaTitle: string;
  amountToAddLabel: string;
  amountToAddPlaceholder: string;
  fallbackTitle: string;
  fallbackDesc: (providerName: string) => string;
  switchToManualBtn: string;
  dismissBtn: string;
  startingCheckout: string;
  payWith: (providerName: string) => string;
  manualIntro: string;
  yekisTopUpAccount: string;
  cbeBankFull: string;
  mpesaTill: string;
  selectedPrefix: string;
  selectedLabels: Record<PaymentRail, string>;
  copiedBtn: string;
  copyAccountBtn: string;
  amountSentLabel: string;
  amountSentPlaceholder: string;
  txRefLabel: string;
  refPlaceholderTelebirr: string;
  refPlaceholderMpesa: string;
  refPlaceholderCbe: string;
  receiptUploadLabel: string;
  receiptAcceptedLabel: string;
  receiptDropSub: string;
  submitting: string;
  submitForApprovalBtn: string;
  viewInstructionsBtn: string;
  topUpAuditEyebrow: string;
  recentTopUpsHeading: string;
  noTopUpsYet: string;
  awaitingConfirmation: string;
  completeCheckoutBtn: string;
  cancelBtn: string;
  attachReceiptBtn: string;
  receiptBtn: string;
  submitProviderReceiptTitle: string;
  submitProviderReceiptDesc: string;
  txCodeLabel: string;
  txCodePlaceholder: string;
  providerReceiptDropSub: string;
  submitForStaffVerificationBtn: string;
  ledgerEyebrow: string;
  txMovementsHeading: string;
  refreshing: string;
  refreshStatementBtn: string;
  totalInflowLabel: string;
  totalOutflowLabel: string;
  pendingSettlementsLabel: string;
  transactionSingular: string;
  transactionPlural: string;
  totalMovementCountLabel: string;
  searchPlaceholder: string;
  filterStatusAria: string;
  allStatuses: string;
  statusCompleted: string;
  statusPending: string;
  statusProcessing: string;
  statusRejected: string;
  filterCategoryAria: string;
  tabAll: (count: number) => string;
  tabMoneyIn: (count: number) => string;
  tabMoneyOut: (count: number) => string;
  tabPayouts: (count: number) => string;
  tabTopUps: (count: number) => string;
  tabEscrow: (count: number) => string;
  loadingMovements: string;
  noMovementsRecorded: string;
  noMatchingMovements: string;
  clientPrefix: string;
  freelancerPrefix: string;
  partyPrefix: string;
  contractPrefix: string;
  accPrefix: string;
  feePrefix: (amountStr: string) => string;
  escrowDeposit: string;
  netCredited: string;
  disbursed: string;
  detailsTitle: string;
  detailsBtn: string;
  receiptTitle: string;
  attachProviderReceiptTitle: string;
  attachProviderReceiptDesc: string;
  txCodeAltPlaceholder: string;
  movementBreakdownBadge: string;
  copyMovementIdTitle: string;
  copiedId: string;
  copyId: string;
  printTitle: string;
  printBtn: string;
  closeDetailsAria: string;
  invoiceDocTitle: string;
  invoiceDocSubtitle: string;
  companyName: string;
  companyTagline: string;
  ercaTin: string;
  vatReg: string;
  addisEthiopia: string;
  toLabel: string;
  platformUser: string;
  partyRoleSuffix: (roleText: string) => string;
  clientParty: string;
  freelancerParty: string;
  destinationAccountLabel: string;
  platformWalletVault: string;
  directionLabel: string;
  creditMoneyIn: string;
  debitMoneyOut: string;
  dateLabel: string;
  invoiceNumLabel: string;
  customerIdLabel: string;
  statusLabel: string;
  thPartyInitiator: string;
  thJobContract: string;
  thPaymentRail: string;
  thTerms: string;
  thValueDate: string;
  thSettlementType: string;
  thStatus: string;
  yekisSettlementEngine: string;
  internalPlatformEscrow: string;
  termsEscrowDeposit: string;
  termsDisbursal: string;
  instantSettlement: string;
  thQty: string;
  thItemNum: string;
  thDescription: string;
  thCategory: string;
  thUnitPrice: string;
  thDiscount: string;
  thLineTotal: string;
  totalDiscountLabel: string;
  subtotalLabel: string;
  salesTaxLabel: string;
  totalLabel: string;
  thankYouBusiness: string;
  idPrefix: string;
  railRefPrefix: string;
  naLabel: string;
  viewFiscalReceiptBtn: string;
  closeBtn: string;
  checkoutTitle: (providerName: string) => string;
  closeCheckoutAria: string;
  topUpAmountLabel: string;
  statusCredited: string;
  statusDeclined: string;
  statusPendingReview: string;
  statusAwaiting: string;
  sessionRefLabel: string;
  confirmedLead: string;
  confirmedBody: (amountStr: string) => string;
  declinedBody: string;
  pendingBody: string;
  redirectLead: string;
  redirectStep1Before: string;
  openPaygate: (providerName: string) => string;
  redirectStep1After: string;
  redirectStep2: string;
  redirectStep3: string;
  devIntro: string;
  devStep1Before: string;
  simulateBtn: string;
  devStep1After: string;
  devStep2Before: string;
  attachTransferReceiptBtn: string;
  devStep2After: string;
  manualCheckoutIntro: string;
  manualCheckoutStep1: (amountStr: string) => string;
  manualCheckoutStep2Before: string;
  manualCheckoutStep2After: string;
  doneBtn: string;
  useManualTransferBtn: string;
  checking: string;
  checkStatusBtn: string;
  statusLabels: Record<string, string>;
  categoryLabels: Record<string, string>;
};

export const BROWSER_WALLET_COPY: Record<Language, BrowserWalletCopy> = {
  en: {
    providers: { TELEBIRR: "Telebirr", CBE_BIRR: "CBE Birr", M_PESA: "Safaricom M-Pesa" },
    creditedToWallet: (amt) => `ETB ${amt} credited to your wallet.`,
    paymentDeclined: "This payment was declined or expired. Check Recent top-ups or try again.",
    couldNotRefreshStatus: "Could not refresh payment status.",
    checkoutAwaiting: "Checkout session is awaiting completion. Open instructions below or attach your receipt in Recent top-ups.",
    sandboxSimFailed: "Sandbox simulation failed.",
    enterValidAmount: "Please enter a valid amount.",
    checkoutInitFailed: "Checkout initiation failed.",
    enterTxRef: "Please enter the transaction or reference number.",
    uploadReceiptPrompt: "Please upload your transfer receipt image or PDF.",
    topUpSubmitted: "Top-up submitted. Once staff verify the transfer, funds will appear in your balance.",
    submissionFailed: "Submission failed.",
    enterTxCode: "Enter the transaction or reference code.",
    selectReceiptFile: "Please select a receipt file.",
    receiptAttached: "Receipt submitted for staff verification. Status updated to Pending.",
    attachReceiptFailed: "Failed to attach receipt.",
    otpSent: "We sent a 6-digit approval code to the phone number on your account.",
    otpSendFailed: "Could not send the approval code. Try again in a moment.",
    enterWithdrawAmountAndDest: "Enter a withdrawal amount and your payout phone or account number.",
    withdrawExceedsBalance: "Withdrawal amount exceeds your available balance.",
    enterOtpCode: "Enter the 6-digit approval code we sent you.",
    withdrawHeldReview: "Withdrawal held for compliance review. Your balance was not debited.",
    withdrawActiveContract: "You cannot withdraw while you have active contracts or open disputes. Wait for them to complete first.",
    withdrawSuccess: (amt) => `Withdrawal request recorded for ETB ${amt}. Funds will be sent to your account upon staff settlement.`,
    withdrawalFailed: "Withdrawal failed.",
    availableBalance: "Available balance",
    heroDescFreelancer: "Updated from released milestones and approved top-ups.",
    heroDescBoth: "Funds escrow when you hire, and receives released milestones when you work.",
    heroDescClient: "Updated from approved top-ups. Deducted when contracts are funded.",
    payoutTaxVoucherBtn: "Payout & Tax Voucher",
    invoiceEscrowReceiptBtn: "Invoice & Escrow Receipt",
    verifiedPayoutEyebrow: "Verified payout",
    withdrawEarningsHeading: "Withdraw earnings",
    choosePayoutDest: "Choose where to receive your payout:",
    telebirrSub: "Send to phone number",
    cbeBankName: "CBE Bank",
    cbeBankSub: "Send to account number",
    mpesaSub: "Send to Safaricom phone",
    amountEtbLabel: "Amount (ETB)",
    amountPlaceholder: "ETB",
    telebirrPhoneLabel: "Telebirr phone number",
    mpesaPhoneLabel: "M-Pesa phone number",
    cbeAccountLabel: "CBE account number",
    approvalCodeLabel: "Approval code",
    approvalCodePlaceholder: "6-digit code",
    sending: "Sending...",
    resendCode: "Resend code",
    sendCode: "Send code",
    devCodePrefix: "Dev code:",
    processing: "Processing...",
    requestWithdrawalBtn: "Request withdrawal",
    addFundsEyebrow: "Add funds",
    topUpWalletHeading: "Top up your wallet",
    hideTopUpAria: "Hide top-up options",
    showTopUpAria: "Show top-up options",
    topUpMethodAria: "Top-up method",
    instantCheckoutTab: "Instant Checkout",
    manualTransferTab: "Manual Transfer",
    instantIntro: "Select a payment gateway. Telebirr checks out automatically; CBE Birr and M-Pesa are handled manually and open the transfer instructions.",
    instantC2b: "Instant C2B",
    manualTransferSub: "Manual transfer",
    cbeTitle: "CBE Birr has no automated checkout yet, so it is handled manually: transfer to the account below and upload your receipt.",
    mpesaTitle: "M-Pesa has no automated checkout yet, so it is handled manually: transfer to the account below and upload your receipt.",
    amountToAddLabel: "Amount to add (ETB)",
    amountToAddPlaceholder: "e.g. 1000",
    fallbackTitle: "Automated Gateway Issue — Manual Verification Available",
    fallbackDesc: (provider) =>
      `Automatic ${provider} checkout could not be completed. Check Recent top-ups before retrying so you don’t accidentally pay twice. You can also use manual verification and submit your receipt.`,
    switchToManualBtn: "Switch to Manual Verification",
    dismissBtn: "Dismiss",
    startingCheckout: "Starting checkout...",
    payWith: (provider) => `Pay with ${provider}`,
    manualIntro: "Send money to the platform account below, then upload the receipt for staff verification:",
    yekisTopUpAccount: "Yekis top-up account",
    cbeBankFull: "Commercial Bank of Ethiopia",
    mpesaTill: "Till 882199 / Phone",
    selectedPrefix: "Selected:",
    selectedLabels: {
      TELEBIRR: "Telebirr (0910 011 818)",
      CBE_BIRR: "CBE Bank (1000300802428)",
      M_PESA: "M-Pesa (0716 356 515 - Till 882199)",
    },
    copiedBtn: "Copied!",
    copyAccountBtn: "Copy account",
    amountSentLabel: "Amount sent (ETB)",
    amountSentPlaceholder: "e.g. 5000",
    txRefLabel: "Transaction/reference number",
    refPlaceholderTelebirr: "e.g. TB-12345 or receipt number",
    refPlaceholderMpesa: "e.g. SD98A7B6C or M-Pesa SMS code",
    refPlaceholderCbe: "e.g. FT26081... or CBE receipt ref",
    receiptUploadLabel: "Receipt image or document (PDF/Photo)",
    receiptAcceptedLabel: "JPG, PNG, WebP or PDF · up to 10 MB",
    receiptDropSub: "Upload a clear photo or PDF of your transfer receipt",
    submitting: "Submitting...",
    submitForApprovalBtn: "Submit for staff approval",
    viewInstructionsBtn: "View instructions",
    topUpAuditEyebrow: "Top-up audit log",
    recentTopUpsHeading: "Recent top-ups",
    noTopUpsYet: "No top-ups submitted yet.",
    awaitingConfirmation: "Awaiting confirmation",
    completeCheckoutBtn: "Complete checkout",
    cancelBtn: "Cancel",
    attachReceiptBtn: "Attach receipt",
    receiptBtn: "Receipt",
    submitProviderReceiptTitle: "Submit Provider Receipt for Staff Verification",
    submitProviderReceiptDesc: "If your automated checkout didn’t complete automatically, submit your provider transaction reference code and receipt photo below for manual verification:",
    txCodeLabel: "Transaction / Reference Code",
    txCodePlaceholder: "e.g. TB-12345 or CBE-REF",
    providerReceiptDropSub: "Upload a clear photo or PDF of your provider receipt",
    submitForStaffVerificationBtn: "Submit for Staff Verification",
    ledgerEyebrow: "Ledger Statement & Activity",
    txMovementsHeading: "Transaction Movement Details",
    refreshing: "Refreshing...",
    refreshStatementBtn: "Refresh Statement",
    totalInflowLabel: "Total Inflow (Credits)",
    totalOutflowLabel: "Total Outflow (Debits)",
    pendingSettlementsLabel: "Pending Settlements",
    transactionSingular: "transaction",
    transactionPlural: "transactions",
    totalMovementCountLabel: "Total Movement Count",
    searchPlaceholder: "Search movements by title, reference, or counterparty...",
    filterStatusAria: "Filter transactions by status",
    allStatuses: "All Statuses",
    statusCompleted: "Completed",
    statusPending: "Pending Verification",
    statusProcessing: "Processing",
    statusRejected: "Rejected / Failed",
    filterCategoryAria: "Filter transactions by category",
    tabAll: (n) => `All Movements (${n})`,
    tabMoneyIn: (n) => `Money In (+${n})`,
    tabMoneyOut: (n) => `Money Out (-${n})`,
    tabPayouts: (n) => `Payouts (${n})`,
    tabTopUps: (n) => `Top-Ups (${n})`,
    tabEscrow: (n) => `Escrow (${n})`,
    loadingMovements: "Loading transaction movements & ledger entries...",
    noMovementsRecorded: "No transaction movements recorded yet. Activity will appear as you fund milestones, top up, or receive payouts.",
    noMatchingMovements: "No movements match the active filters.",
    clientPrefix: "Client: ",
    freelancerPrefix: "Freelancer: ",
    partyPrefix: "Party: ",
    contractPrefix: "Contract: ",
    accPrefix: "Acc: ",
    feePrefix: (amt) => `Fee: ETB ${amt}`,
    escrowDeposit: "Escrow deposit",
    netCredited: "Net credited",
    disbursed: "Disbursed",
    detailsTitle: "View complete transaction breakdown",
    detailsBtn: "Details",
    receiptTitle: "View official Ethiopian tax invoice / receipt voucher",
    attachProviderReceiptTitle: "Attach Provider Receipt",
    attachProviderReceiptDesc: "Payment didn't clear automatically? Attach your receipt and reference code below for manual staff approval.",
    txCodeAltPlaceholder: "e.g. TB-12345 or transaction reference",
    movementBreakdownBadge: "Movement Breakdown",
    copyMovementIdTitle: "Copy Movement ID",
    copiedId: "Copied ID",
    copyId: "Copy ID",
    printTitle: "Print or Save PDF",
    printBtn: "Print / Save PDF",
    closeDetailsAria: "Close details",
    invoiceDocTitle: "INVOICE",
    invoiceDocSubtitle: "Transaction Movement Detail & Breakdown",
    companyName: "Yekis Technologies PLC",
    companyTagline: "Custodial Escrow & Digital Work Marketplace · Addis Ababa, Ethiopia",
    ercaTin: "ERCA Platform TIN:",
    vatReg: "VAT Reg:",
    addisEthiopia: "Addis Ababa, Ethiopia",
    toLabel: "To:",
    platformUser: "Platform User",
    partyRoleSuffix: (r) => `${r} Party`,
    clientParty: "Client Party",
    freelancerParty: "Freelancer Party",
    destinationAccountLabel: "Destination / Account:",
    platformWalletVault: "Platform Wallet Vault",
    directionLabel: "Direction:",
    creditMoneyIn: "Credit (Money In)",
    debitMoneyOut: "Debit (Money Out)",
    dateLabel: "Date:",
    invoiceNumLabel: "Invoice #:",
    customerIdLabel: "Customer ID:",
    statusLabel: "Status:",
    thPartyInitiator: "Party / Initiator",
    thJobContract: "Job / Contract",
    thPaymentRail: "Payment Rail",
    thTerms: "Terms",
    thValueDate: "Value Date",
    thSettlementType: "Settlement Type",
    thStatus: "Status",
    yekisSettlementEngine: "Yekis Settlement Engine",
    internalPlatformEscrow: "Internal Platform Escrow",
    termsEscrowDeposit: "Escrow Deposit (Credit)",
    termsDisbursal: "Disbursal (Debit)",
    instantSettlement: "Instant Settlement",
    thQty: "Qty",
    thItemNum: "Item #",
    thDescription: "Description",
    thCategory: "Category",
    thUnitPrice: "Unit price",
    thDiscount: "Discount",
    thLineTotal: "Line total",
    totalDiscountLabel: "Total Discount:",
    subtotalLabel: "Subtotal:",
    salesTaxLabel: "Sales tax:",
    totalLabel: "Total:",
    thankYouBusiness: "Thank you for your business!",
    idPrefix: "ID:",
    railRefPrefix: "Rail Ref:",
    naLabel: "N/A",
    viewFiscalReceiptBtn: "View Official Fiscal Receipt / Voucher",
    closeBtn: "Close",
    checkoutTitle: (provider) => `${provider} Checkout`,
    closeCheckoutAria: "Close checkout instructions",
    topUpAmountLabel: "Top-up amount",
    statusCredited: "Credited to wallet",
    statusDeclined: "Declined",
    statusPendingReview: "Pending staff review",
    statusAwaiting: "Awaiting confirmation",
    sessionRefLabel: "Session reference",
    confirmedLead: "Payment confirmed.",
    confirmedBody: (amt) => `ETB ${amt} has been added to your available wallet balance and is ready to fund escrow milestones.`,
    declinedBody: "This payment session did not complete and no funds were added to your wallet. You can start a new checkout or transfer manually and submit your receipt.",
    pendingBody: "Your transfer receipt was received and is waiting in the staff verification queue.",
    redirectLead: "Complete your payment using the instructions below:",
    redirectStep1Before: "Use ",
    openPaygate: (p) => `Open ${p} Paygate`,
    redirectStep1After: " below if the gateway window did not open automatically.",
    redirectStep2: "Authorize the transfer on the paygate screen. This window checks for confirmation automatically.",
    redirectStep3: "If the gateway times out or you already transferred directly, attach your transfer receipt below.",
    devIntro: "Telebirr live gateway credentials are not configured in this local environment, so a sandbox checkout session was created without a redirect URL.",
    devStep1Before: "Click ",
    simulateBtn: "Simulate Instant Payment (Sandbox)",
    devStep1After: " below to settle this test top-up and credit your wallet immediately.",
    devStep2Before: "Or click ",
    attachTransferReceiptBtn: "Attach Transfer Receipt",
    devStep2After: " to upload a receipt and test the manual staff review queue.",
    manualCheckoutIntro: "The payment gateway did not return a hosted checkout link for this session. Complete your top-up manually:",
    manualCheckoutStep1: (amt) => `Transfer ETB ${amt} to Yekis Telebirr account 0910 011 818 (or switch to Manual Transfer for CBE Bank / M-Pesa).`,
    manualCheckoutStep2Before: "Click ",
    manualCheckoutStep2After: " below to submit your transaction reference and receipt photo for staff approval.",
    doneBtn: "Done",
    useManualTransferBtn: "Use Manual Transfer",
    checking: "Checking...",
    checkStatusBtn: "Check Status",
    statusLabels: {
      CHECKOUT_PENDING: "Checkout pending",
      PENDING: "Pending",
      PENDING_REVIEW: "Pending review",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      FLAGGED: "Flagged",
      COMPLETED: "Completed",
      PROCESSING: "Processing",
      FAILED: "Failed",
    },
    categoryLabels: {
      TOP_UP: "Top-Up",
      PAYOUT: "Payout",
      ESCROW_LOCK: "Escrow Lock",
      MILESTONE_RELEASE: "Milestone Release",
    },
  },
  am: {
    providers: { TELEBIRR: "ቴሌብር", CBE_BIRR: "CBE ብር", M_PESA: "ሳፋሪኮም M-Pesa" },
    creditedToWallet: (amt) => `${amt} ብር ወደ ቦርሳዎ ገብቷል።`,
    paymentDeclined: "ይህ ክፍያ ውድቅ ተደርጓል ወይም ጊዜው አልፏል። የቅርብ ጊዜ መሙላቶችን ይመልከቱ ወይም እንደገና ይሞክሩ።",
    couldNotRefreshStatus: "የክፍያ ሁኔታን ማደስ አልተቻለም።",
    checkoutAwaiting: "የክፍያ ክፍለ ጊዜ ማጠናቀቅን እየጠበቀ ነው። ከታች መመሪያዎችን ይክፈቱ ወይም ደረሰኝዎን ያያይዙ።",
    sandboxSimFailed: "የሳንድቦክስ ማስመሰል አልተሳካም።",
    enterValidAmount: "እባክዎ ትክክለኛ መጠን ያስገቡ።",
    checkoutInitFailed: "ክፍያ መጀመር አልተቻለም።",
    enterTxRef: "እባክዎ የግብይት ወይም የማጣቀሻ ቁጥር ያስገቡ።",
    uploadReceiptPrompt: "እባክዎ የማስተላለፊያ ደረሰኝዎን ምስል ወይም PDF ይጫኑ።",
    topUpSubmitted: "መሙላት ቀርቧል። ሰራተኞች ማስተላለፉን ሲያረጋግጡ ገንዘቡ በሂሳብዎ ውስጥ ይታያል።",
    submissionFailed: "ማቅረብ አልተሳካም።",
    enterTxCode: "የግብይት ወይም የማጣቀሻ ኮድ ያስገቡ።",
    selectReceiptFile: "እባክዎ የደረሰኝ ፋይል ይምረጡ።",
    receiptAttached: "ደረሰኙ ለሰራተኛ ማረጋገጫ ቀርቧል። ሁኔታው ወደ በመጠባበቅ ላይ ተቀይሯል።",
    attachReceiptFailed: "ደረሰኝ ማያያዝ አልተቻለም።",
    otpSent: "በመለያዎ ስልክ ቁጥር ባለ 6-አሃዝ የማጽደቂያ ኮድ ልከናል።",
    otpSendFailed: "የማጽደቂያ ኮዱን መላክ አልተቻለም። እባክዎ ቆይተው እንደገና ይሞክሩ።",
    enterWithdrawAmountAndDest: "የሚወጣውን መጠን እና የክፍያ ስልክ ወይም የባንክ ሂሳብ ቁጥርዎን ያስገቡ።",
    withdrawExceedsBalance: "የሚወጣው መጠን ካለዎት ቀሪ ሂሳብ ይበልጣል።",
    enterOtpCode: "የላክንልዎትን ባለ 6-አሃዝ የማጽደቂያ ኮድ ያስገቡ።",
    withdrawHeldReview: "ወጪው ለተገዢነት ግምገማ ታግዷል። ከሂሳብዎ ገንዘብ አልተቀነሰም።",
    withdrawActiveContract: "ንቁ ውሎች ወይም ክፍት ክርክሮች እያሉ ገንዘብ ማውጣት አይችሉም። መጀመሪያ እስኪጠናቀቁ ይጠብቁ።",
    withdrawSuccess: (amt) => `የ${amt} ብር የማውጣት ጥያቄ ተመዝግቧል። ሰራተኞች ክፍያውን ሲያጸድቁ ገንዘቡ ወደ ሂሳብዎ ይላካል።`,
    withdrawalFailed: "ገንዘብ ማውጣት አልተቻለም።",
    availableBalance: "ያለ ቀሪ ሂሳብ",
    heroDescFreelancer: "ከተለቀቁ ምዕራፎች እና ከጸደቁ መሙላቶች የዘመነ።",
    heroDescBoth: "ሲቀጥሩ ኤስክሮን ይሞላል፣ ሲሠሩም የተለቀቁ ምዕራፎችን ይቀበላል።",
    heroDescClient: "ከጸደቁ መሙላቶች የዘመነ። ውሎች ሲሞሉ ይቀነሳል።",
    payoutTaxVoucherBtn: "የክፍያ እና የታክስ ቫውቸር",
    invoiceEscrowReceiptBtn: "ደረሰኝ እና የኤስክሮ ደረሰኝ",
    verifiedPayoutEyebrow: "የተረጋገጠ ክፍያ",
    withdrawEarningsHeading: "ገቢዎን ያውጡ",
    choosePayoutDest: "ክፍያዎን የት መቀበል እንደሚፈልጉ ይምረጡ፡",
    telebirrSub: "ወደ ስልክ ቁጥር ላክ",
    cbeBankName: "CBE ባንክ",
    cbeBankSub: "ወደ ሂሳብ ቁጥር ላክ",
    mpesaSub: "ወደ ሳፋሪኮም ስልክ ላክ",
    amountEtbLabel: "መጠን (ብር)",
    amountPlaceholder: "ብር",
    telebirrPhoneLabel: "የቴሌብር ስልክ ቁጥር",
    mpesaPhoneLabel: "የM-Pesa ስልክ ቁጥር",
    cbeAccountLabel: "የCBE ሂሳብ ቁጥር",
    approvalCodeLabel: "የማጽደቂያ ኮድ",
    approvalCodePlaceholder: "ባለ 6-አሃዝ ኮድ",
    sending: "በመላክ ላይ...",
    resendCode: "ኮድ እንደገና ላክ",
    sendCode: "ኮድ ላክ",
    devCodePrefix: "የልማት ኮድ፡",
    processing: "በማስኬድ ላይ...",
    requestWithdrawalBtn: "ወጪ ይጠይቁ",
    addFundsEyebrow: "ገንዘብ ያክሉ",
    topUpWalletHeading: "ቦርሳዎን ይሙሉ",
    hideTopUpAria: "የመሙያ አማራጮችን ደብቅ",
    showTopUpAria: "የመሙያ አማራጮችን አሳይ",
    topUpMethodAria: "የመሙያ ዘዴ",
    instantCheckoutTab: "ፈጣን ክፍያ",
    manualTransferTab: "በእጅ ማስተላለፍ",
    instantIntro: "የክፍያ መስመር ይምረጡ። ቴሌብር በራስ-ሰር ይከፍላል፤ CBE ብር እና M-Pesa በእጅ ስለሚሠሩ የማስተላለፊያ መመሪያዎችን ይከፍታሉ።",
    instantC2b: "ፈጣን C2B",
    manualTransferSub: "በእጅ ማስተላለፍ",
    cbeTitle: "CBE ብር ገና አውቶማቲክ ክፍያ ስለሌለው በእጅ ይከናወናል፡ ከታች ወዳለው ሂሳብ ያስተላልፉና ደረሰኙን ይጫኑ።",
    mpesaTitle: "M-Pesa ገና አውቶማቲክ ክፍያ ስለሌለው በእጅ ይከናወናል፡ ከታች ወዳለው ሂሳብ ያስተላልፉና ደረሰኙን ይጫኑ።",
    amountToAddLabel: "የሚጨመር መጠን (ብር)",
    amountToAddPlaceholder: "ለምሳሌ 1000",
    fallbackTitle: "የአውቶማቲክ ክፍያ ችግር — በእጅ ማረጋገጫ ይገኛል",
    fallbackDesc: (provider) =>
      `አውቶማቲክ የ${provider} ክፍያ ሊጠናቀቅ አልቻለም። በድጋሚ ከመክፈልዎ በፊት የቅርብ ጊዜ መሙላቶችን ይመልከቱ። በእጅ ማረጋገጫ ደረሰኝዎን ማቅረብም ይችላሉ።`,
    switchToManualBtn: "ወደ በእጅ ማረጋገጫ ቀይር",
    dismissBtn: "ዝጋ",
    startingCheckout: "ክፍያ በመጀመር ላይ...",
    payWith: (provider) => `በ${provider} ይክፈሉ`,
    manualIntro: "ከታች ወዳለው የመድረኩ ሂሳብ ገንዘብ ይላኩና ለሰራተኛ ማረጋገጫ ደረሰኙን ይጫኑ፡",
    yekisTopUpAccount: "የYeKis መሙያ ሂሳብ",
    cbeBankFull: "የኢትዮጵያ ንግድ ባንክ",
    mpesaTill: "ቲል 882199 / ስልክ",
    selectedPrefix: "የተመረጠው፡",
    selectedLabels: {
      TELEBIRR: "ቴሌብር (0910 011 818)",
      CBE_BIRR: "CBE ባንክ (1000300802428)",
      M_PESA: "M-Pesa (0716 356 515 - ቲል 882199)",
    },
    copiedBtn: "ተቀድቷል!",
    copyAccountBtn: "ሂሳቡን ቅዳ",
    amountSentLabel: "የተላከ መጠን (ብር)",
    amountSentPlaceholder: "ለምሳሌ 5000",
    txRefLabel: "የግብይት/ማጣቀሻ ቁጥር",
    refPlaceholderTelebirr: "ለምሳሌ TB-12345 ወይም የደረሰኝ ቁጥር",
    refPlaceholderMpesa: "ለምሳሌ SD98A7B6C ወይም የM-Pesa SMS ኮድ",
    refPlaceholderCbe: "ለምሳሌ FT26081... ወይም የCBE ማጣቀሻ",
    receiptUploadLabel: "የደረሰኝ ምስል ወይም ሰነድ (PDF/ፎቶ)",
    receiptAcceptedLabel: "JPG፣ PNG፣ WebP ወይም PDF · እስከ 10 MB",
    receiptDropSub: "የማስተላለፊያ ደረሰኝዎን ግልጽ ፎቶ ወይም PDF ይጫኑ",
    submitting: "በማቅረብ ላይ...",
    submitForApprovalBtn: "ለሰራተኛ ማጽደቂያ ላክ",
    viewInstructionsBtn: "መመሪያዎችን ይመልከቱ",
    topUpAuditEyebrow: "የመሙላት ኦዲት መዝገብ",
    recentTopUpsHeading: "የቅርብ ጊዜ መሙላቶች",
    noTopUpsYet: "እስካሁን ምንም መሙላቶች አልቀረቡም።",
    awaitingConfirmation: "ማረጋገጫ በመጠበቅ ላይ",
    completeCheckoutBtn: "ክፍያውን አጠናቅቅ",
    cancelBtn: "ሰርዝ",
    attachReceiptBtn: "ደረሰኝ አያይዝ",
    receiptBtn: "ደረሰኝ",
    submitProviderReceiptTitle: "ለሰራተኛ ማረጋገጫ የአቅራቢ ደረሰኝ ያቅርቡ",
    submitProviderReceiptDesc: "አውቶማቲክ ክፍያዎ በራሱ ካልተጠናቀቀ፣ ለእጅ ማረጋገጫ የአቅራቢ ግብይት ማጣቀሻ ኮድዎን እና የደረሰኝ ፎቶውን ከታች ያቅርቡ፡",
    txCodeLabel: "የግብይት / ማጣቀሻ ኮድ",
    txCodePlaceholder: "ለምሳሌ TB-12345 ወይም CBE-REF",
    providerReceiptDropSub: "የአቅራቢ ደረሰኝዎን ግልጽ ፎቶ ወይም PDF ይጫኑ",
    submitForStaffVerificationBtn: "ለሰራተኛ ማረጋገጫ ላክ",
    ledgerEyebrow: "የሂሳብ መግለጫ እና እንቅስቃሴ",
    txMovementsHeading: "የግብይት እንቅስቃሴ ዝርዝሮች",
    refreshing: "በማደስ ላይ...",
    refreshStatementBtn: "መግለጫውን አድስ",
    totalInflowLabel: "ጠቅላላ ገቢ",
    totalOutflowLabel: "ጠቅላላ ወጪ",
    pendingSettlementsLabel: "በመጠባበቅ ላይ ያሉ ክፍያዎች",
    transactionSingular: "ግብይት",
    transactionPlural: "ግብይቶች",
    totalMovementCountLabel: "ጠቅላላ የእንቅስቃሴ ብዛት",
    searchPlaceholder: "እንቅስቃሴዎችን በርዕስ፣ በማጣቀሻ ወይም በተቃራኒ ወገን ይፈልጉ...",
    filterStatusAria: "ግብይቶችን በሁኔታ ያጣሩ",
    allStatuses: "ሁሉም ሁኔታዎች",
    statusCompleted: "ተጠናቋል",
    statusPending: "ማረጋገጫ በመጠበቅ ላይ",
    statusProcessing: "በሂደት ላይ",
    statusRejected: "ውድቅ ተደርጓል / አልተሳካም",
    filterCategoryAria: "ግብይቶችን በምድብ ያጣሩ",
    tabAll: (n) => `ሁሉም (${n})`,
    tabMoneyIn: (n) => `ገቢ (+${n})`,
    tabMoneyOut: (n) => `ወጪ (-${n})`,
    tabPayouts: (n) => `ክፍያዎች (${n})`,
    tabTopUps: (n) => `መሙላቶች (${n})`,
    tabEscrow: (n) => `ኤስክሮ (${n})`,
    loadingMovements: "የግብይት እንቅስቃሴዎችን በመጫን ላይ...",
    noMovementsRecorded: "እስካሁን ምንም የግብይት እንቅስቃሴ አልተመዘገበም። ምዕራፎችን ሲሞሉ፣ ሲያስገቡ ወይም ክፍያ ሲቀበሉ እንቅስቃሴው እዚህ ይታያል።",
    noMatchingMovements: "ከተመረጡት ማጣሪያዎች ጋር የሚዛመድ እንቅስቃሴ የለም።",
    clientPrefix: "ደንበኛ፡ ",
    freelancerPrefix: "ባለሙያ፡ ",
    partyPrefix: "ወገን፡ ",
    contractPrefix: "ውል፡ ",
    accPrefix: "ሂሳብ፡ ",
    feePrefix: (amt) => `ክፍያ፡ ${amt} ብር`,
    escrowDeposit: "የኤስክሮ ተቀማጭ",
    netCredited: "የተጣራ ገቢ",
    disbursed: "ተከፍሏል",
    detailsTitle: "ሙሉ የግብይት ዝርዝር ይመልከቱ",
    detailsBtn: "ዝርዝሮች",
    receiptTitle: "ይፋዊ የኢትዮጵያ የታክስ ደረሰኝ / ቫውቸር ይመልከቱ",
    attachProviderReceiptTitle: "የአቅራቢ ደረሰኝ ያያይዙ",
    attachProviderReceiptDesc: "ክፍያው በራሱ አልጸደቀም? ለእጅ ማጽደቂያ ደረሰኝዎን እና ማጣቀሻ ኮድዎን ከታች ያያይዙ።",
    txCodeAltPlaceholder: "ለምሳሌ TB-12345 ወይም የግብይት ማጣቀሻ",
    movementBreakdownBadge: "የእንቅስቃሴ ዝርዝር",
    copyMovementIdTitle: "የእንቅስቃሴ መለያን ቅዳ",
    copiedId: "መለያ ተቀድቷል",
    copyId: "መለያ ቅዳ",
    printTitle: "አትም ወይም PDF አስቀምጥ",
    printBtn: "አትም / PDF አስቀምጥ",
    closeDetailsAria: "ዝርዝሮችን ዝጋ",
    invoiceDocTitle: "ደረሰኝ / INVOICE",
    invoiceDocSubtitle: "የግብይት እንቅስቃሴ ዝርዝር መረጃ",
    companyName: "ዬኪስ ቴክኖሎጂስ ኃ/የተ/የግ/ማ",
    companyTagline: "የኤስክሮ ጥበቃ እና ዲጂታል ሥራ ገበያ ቦታ · አዲስ አበባ፣ ኢትዮጵያ",
    ercaTin: "የERCA ድርጅት TIN፡",
    vatReg: "የVAT ምዝገባ፡",
    addisEthiopia: "አዲስ አበባ፣ ኢትዮጵያ",
    toLabel: "ለ፡",
    platformUser: "የመድረኩ ተጠቃሚ",
    partyRoleSuffix: (r) => `${r}`,
    clientParty: "ደንበኛ ወገን",
    freelancerParty: "ባለሙያ ወገን",
    destinationAccountLabel: "መድረሻ / ሂሳብ፡",
    platformWalletVault: "የመድረኩ ቦርሳ ካዝና",
    directionLabel: "አቅጣጫ፡",
    creditMoneyIn: "ክሬዲት (ገቢ)",
    debitMoneyOut: "ዴቢት (ወጪ)",
    dateLabel: "ቀን፡",
    invoiceNumLabel: "ደረሰኝ #፡",
    customerIdLabel: "የደንበኛ መለያ፡",
    statusLabel: "ሁኔታ፡",
    thPartyInitiator: "ወገን / አነሳሽ",
    thJobContract: "ሥራ / ውል",
    thPaymentRail: "የክፍያ መስመር",
    thTerms: "ውሎች",
    thValueDate: "የግብይት ቀን",
    thSettlementType: "የክፍያ ዓይነት",
    thStatus: "ሁኔታ",
    yekisSettlementEngine: "የYeKis የክፍያ ሥርዓት",
    internalPlatformEscrow: "የውስጥ የመድረክ ኤስክሮ",
    termsEscrowDeposit: "የኤስክሮ ተቀማጭ (ገቢ)",
    termsDisbursal: "ክፍያ (ወጪ)",
    instantSettlement: "ፈጣን ማስተላለፍ",
    thQty: "ብዛት",
    thItemNum: "ንጥል #",
    thDescription: "መግለጫ",
    thCategory: "ዘርፍ",
    thUnitPrice: "የአንዱ ዋጋ",
    thDiscount: "ቅናሽ",
    thLineTotal: "ጠቅላላ",
    totalDiscountLabel: "ጠቅላላ ቅናሽ፡",
    subtotalLabel: "ንዑስ ድምር፡",
    salesTaxLabel: "የሽያጭ ታክስ፡",
    totalLabel: "ጠቅላላ ድምር፡",
    thankYouBusiness: "ስለመረጡን እናመሰግናለን!",
    idPrefix: "መለያ፡",
    railRefPrefix: "የመስመር ማጣቀሻ፡",
    naLabel: "የለም",
    viewFiscalReceiptBtn: "ይፋዊ የፋይስካል ደረሰኝ / ቫውቸር ይመልከቱ",
    closeBtn: "ዝጋ",
    checkoutTitle: (provider) => `የ${provider} ክፍያ`,
    closeCheckoutAria: "የክፍያ መመሪያዎችን ዝጋ",
    topUpAmountLabel: "የመሙያ መጠን",
    statusCredited: "ወደ ቦርሳ ገብቷል",
    statusDeclined: "ውድቅ ተደርጓል",
    statusPendingReview: "የሰራተኛ ግምገማ በመጠበቅ ላይ",
    statusAwaiting: "ማረጋገጫ በመጠበቅ ላይ",
    sessionRefLabel: "የክፍለ ጊዜ ማጣቀሻ",
    confirmedLead: "ክፍያው ተረጋግጧል።",
    confirmedBody: (amt) => `${amt} ብር ወደ ቦርሳዎ ቀሪ ሂሳብ ታክሏል፤ የኤስክሮ ምዕራፎችን ለመሙላት ዝግጁ ነው።`,
    declinedBody: "ይህ የክፍያ ሂደት አልተጠናቀቀም፤ ወደ ቦርሳዎም ገንዘብ አልተጨመረም። አዲስ ክፍያ መጀመር ወይም በእጅ አስተላልፈው ደረሰኝ ማስገባት ይችላሉ።",
    pendingBody: "የማስተላለፊያ ደረሰኝዎ ደርሷል እና በሰራተኛ የማረጋገጫ ወረፋ ውስጥ በመጠበቅ ላይ ነው።",
    redirectLead: "ከታች ያሉትን መመሪያዎች በመጠቀም ክፍያዎን ያጠናቅቁ፡",
    redirectStep1Before: "የክፍያ መስኮቱ በራሱ ካልተከፈተ ከታች ",
    openPaygate: (p) => `የ${p} ክፍያ ገጽ ክፈት`,
    redirectStep1After: "ን ይጠቀሙ።",
    redirectStep2: "በክፍያ ማያ ገጹ ላይ ዝውውሩን ይፍቀዱ። ይህ መስኮት ማረጋገጫውን በራስ-ሰር ይፈትሻል።",
    redirectStep3: "ክፍያው ጊዜው ካለፈ ወይም በቀጥታ አስተላልፈው ከሆነ፣ ከታች የማስተላለፊያ ደረሰኝዎን ያያይዙ።",
    devIntro: "በዚህ የአካባቢ ሁኔታ ውስጥ የቴሌብር ቀጥታ መስመር ምስክርነቶች ስላልተዋቀሩ የሳንድቦክስ ክፍያ ክፍለ ጊዜ ተፈጥሯል።",
    devStep1Before: "ይህን የሙከራ መሙላት ወዲያውኑ ለማጽደቅ ከታች ",
    simulateBtn: "ፈጣን ክፍያ አስመስል (ሳንድቦክስ)",
    devStep1After: "ን ይጫኑ።",
    devStep2Before: "ወይም ደረሰኝ ለመጫን ከታች ",
    attachTransferReceiptBtn: "የዝውውር ደረሰኝ አያይዝ",
    devStep2After: "ን ይጫኑ።",
    manualCheckoutIntro: "የክፍያ መስመሩ ለዚህ ክፍለ ጊዜ አገናኝ አልመለሰም። መሙላትዎን በእጅ ያጠናቅቁ፡",
    manualCheckoutStep1: (amt) => `${amt} ብር ወደ YeKis ቴሌብር ሂሳብ 0910 011 818 ያስተላልፉ (ወይም ለCBE ባንክ / M-Pesa ወደ በእጅ ማስተላለፍ ይቀይሩ)።`,
    manualCheckoutStep2Before: "የግብይት ማጣቀሻዎን እና የደረሰኝ ፎቶውን ለማቅረብ ከታች ",
    manualCheckoutStep2After: "ን ይጫኑ።",
    doneBtn: "ተከናውኗል",
    useManualTransferBtn: "በእጅ ማስተላለፍን ተጠቀም",
    checking: "በመፈተሽ ላይ...",
    checkStatusBtn: "ሁኔታውን ፈትሽ",
    statusLabels: {
      CHECKOUT_PENDING: "ክፍያ በመጠባበቅ ላይ",
      PENDING: "በመጠባበቅ ላይ",
      PENDING_REVIEW: "ግምገማ በመጠበቅ ላይ",
      APPROVED: "ጸድቋል",
      REJECTED: "ውድቅ ተደርጓል",
      FLAGGED: "ምልክት የተደረገበት",
      COMPLETED: "ተጠናቋል",
      PROCESSING: "በሂደት ላይ",
      FAILED: "አልተሳካም",
    },
    categoryLabels: {
      TOP_UP: "መሙላት",
      PAYOUT: "ክፍያ",
      ESCROW_LOCK: "የኤስክሮ መቆለፍ",
      MILESTONE_RELEASE: "የምዕራፍ መልቀቅ",
    },
  },
  om: {
    providers: { TELEBIRR: "Telebirr", CBE_BIRR: "CBE Birr", M_PESA: "Safaricom M-Pesa" },
    creditedToWallet: (amt) => `ETB ${amt} gara waletii keessaniitti galeera.`,
    paymentDeclined: "Kaffaltiin kun kufaa ta'eera ykn yeroon isaa darbeera. Guutinsa dhiyoo ilaalaa ykn irra deebi'aa yaalaa.",
    couldNotRefreshStatus: "Haala kaffaltii haaromsuun hin danda'amne.",
    checkoutAwaiting: "Yeroon kaffaltii xumuramuu eegaa jira. Qajeelfama gadii banaa ykn nagahee keessan maxxansaa.",
    sandboxSimFailed: "Yaaliin saandbooxii hin milkoofne.",
    enterValidAmount: "Maaloo maallaqa sirrii galchaa.",
    checkoutInitFailed: "Kaffaltii jalqabuun hin danda'amne.",
    enterTxRef: "Maaloo lakkoofsa daddabarsaa ykn wabii galchaa.",
    uploadReceiptPrompt: "Maaloo suuraa ykn PDF nagahee keessan fe'aa.",
    topUpSubmitted: "Guutinsi ergameera. Hojjettoonni erga mirkaneessanii booda maallaqichi herrega keessan irratti mul'ata.",
    submissionFailed: "Erguun hin milkoofne.",
    enterTxCode: "Koodii daddabarsaa ykn wabii galchaa.",
    selectReceiptFile: "Maaloo faayilii nagahee filadhaa.",
    receiptAttached: "Nagaheen mirkaneessa hojjettootaaf ergameera. Haalli gara Eegaa jirutti jijjiirameera.",
    attachReceiptFailed: "Nagahee maxxansuun hin danda'amne.",
    otpSent: "Koodii mirkaneessaa dijitii 6 gara lakkoofsa bilbilaa herrega keessanii irra jiruutti ergineerra.",
    otpSendFailed: "Koodii mirkaneessaa erguun hin danda'amne. Yeroo booda irra deebi'aa yaalaa.",
    enterWithdrawAmountAndDest: "Hamma baasii fi lakkoofsa bilbilaa ykn baankii keessan galchaa.",
    withdrawExceedsBalance: "Hammi baasuu barbaaddan maallaqa qabdan irra caala.",
    enterOtpCode: "Koodii mirkaneessaa dijitii 6 isiniif ergame galchaa.",
    withdrawHeldReview: "Baasiin kun gamaaggamaaf qabameera. Herrega keessan irraa hin hir'anne.",
    withdrawActiveContract: "Yeroo waliigalteen hojiirra jiru ykn waldiddaan jiru maallaqa baasuu hin dandeessan. Jalqaba xumuramuu isaanii eegaa.",
    withdrawSuccess: (amt) => `Gaaffiin baasii ETB ${amt} galmaa'eera. Yeroo hojjettoonni xumuran gara herrega keessaniitti ergama.`,
    withdrawalFailed: "Maallaqa baasuun hin danda'amne.",
    availableBalance: "Maallaqa qophii",
    heroDescFreelancer: "Boqonnaa gadhiifamee fi guutinsa mirkanaa'e irraa kan haaromfame.",
    heroDescBoth: "Yeroo qaxartan iskuuroo guuta, yeroo hojjettan boqonnaa gadhiifame simata.",
    heroDescClient: "Guutinsa mirkanaa'e irraa haaromfama. Yeroo waliigalteen guutamu hir'ifama.",
    payoutTaxVoucherBtn: "Waraqaa Kaffaltii fi Gibiraa",
    invoiceEscrowReceiptBtn: "Nagahee fi Waraqaa Iskuuroo",
    verifiedPayoutEyebrow: "Kaffaltii mirkanaa'e",
    withdrawEarningsHeading: "Galii keessan baafadhaa",
    choosePayoutDest: "Bakka kaffaltii itti fudhattan filadhaa:",
    telebirrSub: "Gara lakkoofsa bilbilaatti ergi",
    cbeBankName: "Baankii CBE",
    cbeBankSub: "Gara lakkoofsa herregaatti ergi",
    mpesaSub: "Gara bilbila Safaricom ergi",
    amountEtbLabel: "Hamma (ETB)",
    amountPlaceholder: "ETB",
    telebirrPhoneLabel: "Lakkoofsa bilbilaa Telebirr",
    mpesaPhoneLabel: "Lakkoofsa bilbilaa M-Pesa",
    cbeAccountLabel: "Lakkoofsa herrega CBE",
    approvalCodeLabel: "Koodii mirkaneessaa",
    approvalCodePlaceholder: "Koodii dijitii 6",
    sending: "Ergaa jira...",
    resendCode: "Koodii irra deebi'i ergi",
    sendCode: "Koodii ergi",
    devCodePrefix: "Koodii Dev:",
    processing: "Qindeessaa jira...",
    requestWithdrawalBtn: "Baasii gaafadhu",
    addFundsEyebrow: "Maallaqa dabali",
    topUpWalletHeading: "Waletii keessan guutaa",
    hideTopUpAria: "Filannoowwan guutinsaa dhoksi",
    showTopUpAria: "Filannoowwan guutinsaa mul'isi",
    topUpMethodAria: "Mala guutinsaa",
    instantCheckoutTab: "Kaffaltii Battalaa",
    manualTransferTab: "Daddabarsa Harkaatiin",
    instantIntro: "Karaa kaffaltii filadhaa. Telebirr ofumaan kaffala; CBE Birr fi M-Pesa harkaadhaan raawwatamanii qajeelfama daddabarsaa banu.",
    instantC2b: "C2B Battalaa",
    manualTransferSub: "Daddabarsa harkaa",
    cbeTitle: "CBE Birr ammaaf kaffaltii ofumaan hin qabu, kanaaf harkaadhaan raawwatama: gara herrega gadiitti ergaa nagahee fe'aa.",
    mpesaTitle: "M-Pesa ammaaf kaffaltii ofumaan hin qabu, kanaaf harkaadhaan raawwatama: gara herrega gadiitti ergaa nagahee fe'aa.",
    amountToAddLabel: "Hamma dabalamu (ETB)",
    amountToAddPlaceholder: "fkn. 1000",
    fallbackTitle: "Rakkoo Karaa Kaffaltii Ofumaan — Mirkaneessi Harkaa Ni Jira",
    fallbackDesc: (provider) =>
      `Kaffaltiin ofumaan ${provider} hin xumuramne. Dachaa akka hin kaffalle yaaluun dura Guutinsa dhiyoo ilaalaa. Mirkaneessa harkaa fayyadamuun nagahee erguus dandeessu.`,
    switchToManualBtn: "Gara Mirkaneessa Harkaatti Jijjiiri",
    dismissBtn: "Cufi",
    startingCheckout: "Kaffaltii jalqabaa jira...",
    payWith: (provider) => `${provider}'n Kaffali`,
    manualIntro: "Gara herrega waltajjii armaan gadiitti maallaqa ergaatii mirkaneessa hojjettootaaf nagahee fe'aa:",
    yekisTopUpAccount: "Herrega guutinsaa YeKis",
    cbeBankFull: "Baankii Daldalaa Itoophiyaa",
    mpesaTill: "Till 882199 / Bilbila",
    selectedPrefix: "Kan filatame:",
    selectedLabels: {
      TELEBIRR: "Telebirr (0910 011 818)",
      CBE_BIRR: "Baankii CBE (1000300802428)",
      M_PESA: "M-Pesa (0716 356 515 - Till 882199)",
    },
    copiedBtn: "Garagalfameera!",
    copyAccountBtn: "Herrega garagalchi",
    amountSentLabel: "Hamma ergame (ETB)",
    amountSentPlaceholder: "fkn. 5000",
    txRefLabel: "Lakkoofsa daddabarsaa/wabii",
    refPlaceholderTelebirr: "fkn. TB-12345 ykn lakkoofsa nagahee",
    refPlaceholderMpesa: "fkn. SD98A7B6C ykn koodii SMS M-Pesa",
    refPlaceholderCbe: "fkn. FT26081... ykn wabii CBE",
    receiptUploadLabel: "Suuraa ykn sanada nagahee (PDF/Suuraa)",
    receiptAcceptedLabel: "JPG, PNG, WebP ykn PDF · hanga MB 10",
    receiptDropSub: "Suuraa ifaa ykn PDF nagahee daddabarsaa keessan fe'aa",
    submitting: "Ergaa jira...",
    submitForApprovalBtn: "Mirkaneessa hojjettootaaf ergi",
    viewInstructionsBtn: "Qajeelfama ilaali",
    topUpAuditEyebrow: "Galmee guutinsaa",
    recentTopUpsHeading: "Guutinsawwan dhiyoo",
    noTopUpsYet: "Guutinsi ammaaf hin ergamne.",
    awaitingConfirmation: "Mirkaneessa eegaa jira",
    completeCheckoutBtn: "Kaffaltii xumuri",
    cancelBtn: "Haqi",
    attachReceiptBtn: "Nagahee maxxansi",
    receiptBtn: "Nagahee",
    submitProviderReceiptTitle: "Mirkaneessa Hojjettootaaf Nagahee Dhiyeessaa Ergaa",
    submitProviderReceiptDesc: "Kaffaltiin ofumaan yoo hin xumuramne, mirkaneessa harkaatiif koodii wabii daddabarsaa fi suuraa nagahee gadiitti galchaa:",
    txCodeLabel: "Koodii Daddabarsaa / Wabii",
    txCodePlaceholder: "fkn. TB-12345 ykn CBE-REF",
    providerReceiptDropSub: "Suuraa ifaa ykn PDF nagahee dhiyeessaa keessan fe'aa",
    submitForStaffVerificationBtn: "Mirkaneessa Hojjettootaaf Ergi",
    ledgerEyebrow: "Ibsa Lejaraa fi Sochii",
    txMovementsHeading: "Bal'ina Sochii Daddabarsaa",
    refreshing: "Haaromsaa jira...",
    refreshStatementBtn: "Ibsicha Haaromsi",
    totalInflowLabel: "Walitti Qabama Galii",
    totalOutflowLabel: "Walitti Qabama Baasii",
    pendingSettlementsLabel: "Kaffaltiiwwan Eegaa Jiran",
    transactionSingular: "daddabarsa",
    transactionPlural: "daddabarsawwan",
    totalMovementCountLabel: "Baay'ina Sochii Waliigalaa",
    searchPlaceholder: "Mataduree, wabii ykn qaama biraan sochii barbaadi...",
    filterStatusAria: "Daddabarsawwan haalaan calali",
    allStatuses: "Haalawwan Hunda",
    statusCompleted: "Xumurameera",
    statusPending: "Mirkaneessa Eegaa Jira",
    statusProcessing: "Adeemsa Irra",
    statusRejected: "Kufaa Ta'e / Hin Milkoofne",
    filterCategoryAria: "Daddabarsawwan ramaddiin calali",
    tabAll: (n) => `Sochii Hunda (${n})`,
    tabMoneyIn: (n) => `Maallaqa Seene (+${n})`,
    tabMoneyOut: (n) => `Maallaqa Bahe (-${n})`,
    tabPayouts: (n) => `Kaffaltiiwwan (${n})`,
    tabTopUps: (n) => `Guutinsawwan (${n})`,
    tabEscrow: (n) => `Iskuuroo (${n})`,
    loadingMovements: "Sochiiwwan daddabarsaa fi galmee lejaraa fe'aa jira...",
    noMovementsRecorded: "Sochiin daddabarsaa ammaaf hin galmoofne. Yeroo boqonnaa guuttan, maallaqa dabaltan ykn kaffaltii fudhattan asitti mul'ata.",
    noMatchingMovements: "Sochiin calaltuu kana wajjin walsimu hin jiru.",
    clientPrefix: "Maamila: ",
    freelancerPrefix: "Ogeessa: ",
    partyPrefix: "Qaama: ",
    contractPrefix: "Waliigaltee: ",
    accPrefix: "Herrega: ",
    feePrefix: (amt) => `Kaffaltii tajaajilaa: ETB ${amt}`,
    escrowDeposit: "Kuusaa iskuuroo",
    netCredited: "Qulqulluu gale",
    disbursed: "Kaffalameera",
    detailsTitle: "Bal'ina daddabarsaa guutuu ilaali",
    detailsBtn: "Bal'ina",
    receiptTitle: "Nagahee gibiraa / waraqaa mirkaneessaa Itoophiyaa ilaali",
    attachProviderReceiptTitle: "Nagahee Dhiyeessaa Maxxansi",
    attachProviderReceiptDesc: "Kaffaltiin ofumaan hin mirkanoofnee? Mirkaneessa hojjettootaaf nagahee fi koodii wabii gadiitti maxxansaa.",
    txCodeAltPlaceholder: "fkn. TB-12345 ykn wabii daddabarsaa",
    movementBreakdownBadge: "Bal'ina Sochii",
    copyMovementIdTitle: "ID Sochii Garagalchi",
    copiedId: "ID Garagalfame",
    copyId: "ID Garagalchi",
    printTitle: "Maxxansi ykn PDF Olkaa'i",
    printBtn: "Maxxansi / PDF Olkaa'i",
    closeDetailsAria: "Bal'ina cufi",
    invoiceDocTitle: "NAGAHEE / INVOICE",
    invoiceDocSubtitle: "Bal'ina fi Ibsa Sochii Daddabarsaa",
    companyName: "Yekis Technologies PLC",
    companyTagline: "Iskuuroo Eegamaa fi Gabaa Hojii Dijitaalaa · Finfinnee, Itoophiyaa",
    ercaTin: "TIN Waltajjii ERCA:",
    vatReg: "Galmee VAT:",
    addisEthiopia: "Finfinnee, Itoophiyaa",
    toLabel: "Gara:",
    platformUser: "Fayyadamaa Waltajjii",
    partyRoleSuffix: (r) => `Qaama ${r}`,
    clientParty: "Qaama Maamilaa",
    freelancerParty: "Qaama Ogeessaa",
    destinationAccountLabel: "Bakka Ga'umsaa / Herrega:",
    platformWalletVault: "Kaazinaa Waletii Waltajjii",
    directionLabel: "Kallattii:",
    creditMoneyIn: "Galii (Maallaqa Seene)",
    debitMoneyOut: "Baasii (Maallaqa Bahe)",
    dateLabel: "Guyyaa:",
    invoiceNumLabel: "Lakk. Nagahee:",
    customerIdLabel: "ID Maamilaa:",
    statusLabel: "Haala:",
    thPartyInitiator: "Qaama / Jalqabsiisaa",
    thJobContract: "Hojii / Waliigaltee",
    thPaymentRail: "Karaa Kaffaltii",
    thTerms: "Haalawwan",
    thValueDate: "Guyyaa Gatii",
    thSettlementType: "Gosa Xumuraa",
    thStatus: "Haala",
    yekisSettlementEngine: "Sirna Kaffaltii YeKis",
    internalPlatformEscrow: "Iskuuroo Keessoo Waltajjii",
    termsEscrowDeposit: "Kuusaa Iskuuroo (Galii)",
    termsDisbursal: "Kaffaltii (Baasii)",
    instantSettlement: "Xumura Battalaa",
    thQty: "Baay'ina",
    thItemNum: "Gosa #",
    thDescription: "Ibsa",
    thCategory: "Ramaddii",
    thUnitPrice: "Gatii tokkichaa",
    thDiscount: "Hir'ina",
    thLineTotal: "Ida'ama",
    totalDiscountLabel: "Hir'ina Waliigalaa:",
    subtotalLabel: "Ida'ama xiqqaa:",
    salesTaxLabel: "Gibira gurgurtaa:",
    totalLabel: "Waliigala:",
    thankYouBusiness: "Nu waliin hojjechuu keessaniif galatoomaa!",
    idPrefix: "ID:",
    railRefPrefix: "Wabii Karaa:",
    naLabel: "Hin jiru",
    viewFiscalReceiptBtn: "Nagahee Gibiraa Ofiseelaa Ilaali",
    closeBtn: "Cufi",
    checkoutTitle: (provider) => `Kaffaltii ${provider}`,
    closeCheckoutAria: "Qajeelfama kaffaltii cufi",
    topUpAmountLabel: "Hamma guutinsaa",
    statusCredited: "Gara waletii galeera",
    statusDeclined: "Kufaa ta'eera",
    statusPendingReview: "Gamaaggama hojjettootaa eegaa jira",
    statusAwaiting: "Mirkaneessa eegaa jira",
    sessionRefLabel: "Wabii yeroo",
    confirmedLead: "Kaffaltiin mirkanaa'eera.",
    confirmedBody: (amt) => `ETB ${amt} gara waletii keessanii dabalameera; boqonnaa iskuuroo guutuuf qophii dha.`,
    declinedBody: "Yeroon kaffaltii kun hin xumuramne, maallaqnis gara waletii keessanii hin dabalamne. Kaffaltii haaraa jalqabuu ykn harkaadhaan ergitanii nagahee galchuu dandeessu.",
    pendingBody: "Nagaheen daddabarsa keessanii fudhatameera, tarree mirkaneessaa hojjettootaa keessa jira.",
    redirectLead: "Qajeelfama gadii fayyadamuun kaffaltii keessan xumuraa:",
    redirectStep1Before: "Yoo foddaan kaffaltii ofumaan hin banamin gadiitti ",
    openPaygate: (p) => `Fuula Kaffaltii ${p} Bani`,
    redirectStep1After: " tuqaa.",
    redirectStep2: "Foddaa kaffaltii irratti daddabarsicha hayyamaa. Foddaan kun mirkaneessa ofumaan hordofa.",
    redirectStep3: "Yoo yeroon darbe ykn kallattiin ergitan ta'e, gadiitti nagahee daddabarsaa maxxansaa.",
    devIntro: "Naannoo kana keessatti ragaan kallattii Telebirr waan hin qindaa'iniif, yeroon yaalii saandbooxii uumameera.",
    devStep1Before: "Yaalii kana battalumatti mirkaneessuuf gadiitti ",
    simulateBtn: "Kaffaltii Battalaa Fakkeessi (Saandbooxii)",
    devStep1After: " tuqaa.",
    devStep2Before: "Ykn nagahee fe'uuf ",
    attachTransferReceiptBtn: "Nagahee Daddabarsaa Maxxansi",
    devStep2After: " tuqaa.",
    manualCheckoutIntro: "Karaan kaffaltii liinkii hin deebisne. Guutinsa keessan harkaadhaan xumuraa:",
    manualCheckoutStep1: (amt) => `Gara herrega YeKis Telebirr 0910 011 818 tti ETB ${amt} ergaa (ykn Baankii CBE / M-Pesa f gara Daddabarsa Harkaatti jijjiiraa).`,
    manualCheckoutStep2Before: "Wabii fi suuraa nagahee erguuf gadiitti ",
    manualCheckoutStep2After: " tuqaa.",
    doneBtn: "Xumurame",
    useManualTransferBtn: "Daddabarsa Harkaa Fayyadami",
    checking: "Sakatta'aa jira...",
    checkStatusBtn: "Haala Sakatta'i",
    statusLabels: {
      CHECKOUT_PENDING: "Kaffaltii eegaa jira",
      PENDING: "Eegaa jira",
      PENDING_REVIEW: "Gamaaggama eegaa jira",
      APPROVED: "Mirkanaa'eera",
      REJECTED: "Kufaa ta'e",
      FLAGGED: "Mallatteeffameera",
      COMPLETED: "Xumurameera",
      PROCESSING: "Adeemsa irra",
      FAILED: "Hin milkoofne",
    },
    categoryLabels: {
      TOP_UP: "Guutinsa",
      PAYOUT: "Kaffaltii",
      ESCROW_LOCK: "Hidhaa Iskuuroo",
      MILESTONE_RELEASE: "Gadhiisii Boqonnaa",
    },
  },
  ti: {
    providers: { TELEBIRR: "ቴሌብር", CBE_BIRR: "CBE ብር", M_PESA: "ሳፋሪኮም M-Pesa" },
    creditedToWallet: (amt) => `${amt} ብር ናብ ዋሌትኩም ኣትዩ ኣሎ።`,
    paymentDeclined: "እዚ ክፍሊት ተነጺጉ ወይ ግዜኡ ሓሊፉ። ናይ ቀረባ እዋን ምምላእ ርኣዩ ወይ እንደገና ፈትኑ።",
    couldNotRefreshStatus: "ኩነታት ክፍሊት ምሕዳስ ኣይተኻእለን።",
    checkoutAwaiting: "መስርሕ ክፍሊት ምዝዛም ይጽበ ኣሎ። ታሕቲ መምርሒ ክፈቱ ወይ ደረሰኝኩም ኣተሓሕዙ።",
    sandboxSimFailed: "ናይ ሳንድቦክስ ፈተነ ኣይተሳኸዐን።",
    enterValidAmount: "በጃኹም ቅኑዕ መጠን ገንዘብ የእትዉ።",
    checkoutInitFailed: "ክፍሊት ምጅማር ኣይተኻእለን።",
    enterTxRef: "በጃኹም ቁጽሪ ግብይት ወይ መወከሲ የእትዉ።",
    uploadReceiptPrompt: "በጃኹም ስእሊ ወይ PDF ደረሰኝ ምትሕልላፍኩም ጽዓኑ።",
    topUpSubmitted: "ምምላእ ቀሪቡ። ሰራሕተኛታት ምትሕልላፍ ምስ ኣረጋገጹ ገንዘብ ኣብ ሚዛንኩም ክረአ እዩ።",
    submissionFailed: "ምቕራብ ኣይተሳኸዐን።",
    enterTxCode: "ኮድ ግብይት ወይ መወከሲ የእትዉ።",
    selectReceiptFile: "በጃኹም ፋይል ደረሰኝ ምረጹ።",
    receiptAttached: "ደረሰኝ ንምርግጋጽ ሰራሕተኛ ቀሪቡ። ኩነታት ናብ ይጽበ ኣሎ ተቐይሩ።",
    attachReceiptFailed: "ደረሰኝ ምትሕሓዝ ኣይተኻእለን።",
    otpSent: "6-ኣሃዝ ኮድ መረጋገጺ ናብቲ ኣብ ኣካውንትኩም ዘሎ ቁጽሪ ስልኪ ልኢኽና ኣለና።",
    otpSendFailed: "ኮድ መረጋገጺ ምልኣኽ ኣይተኻእለን። ጸኒሕኩም እንደገና ፈትኑ።",
    enterWithdrawAmountAndDest: "ዝወጽእ መጠንን ቁጽሪ ስልኪ ወይ ሕሳብ ባንክኹምን የእትዉ።",
    withdrawExceedsBalance: "ዝወጽእ መጠን ካብ ዘለኩም ሚዛን ይበልጽ።",
    enterOtpCode: "ዝለኣኽናልኩም 6-ኣሃዝ ኮድ መረጋገጺ የእትዉ።",
    withdrawHeldReview: "ምውጻእ ገንዘብ ንግምገማ ተታሒዙ ኣሎ። ካብ ሚዛንኩም ገንዘብ ኣይተቐነሰን።",
    withdrawActiveContract: "ንጡፋት ውዕላት ወይ ክፉታት ክርክራት ከለዉኹም ገንዘብ ክተውጽኡ ኣይትኽእሉን። መጀመርታ ክሳብ ዝዛዘሙ ተጸበዩ።",
    withdrawSuccess: (amt) => `ናይ ${amt} ብር ሕቶ ምውጻእ ተመዝጊቡ። ሰራሕተኛታት ምስ ኣጽደቕዎ ገንዘብ ናብ ሕሳብኩም ክለኣኽ እዩ።`,
    withdrawalFailed: "ምውጻእ ገንዘብ ኣይተሳኸዐን።",
    availableBalance: "ዘሎ ቀሪ ሚዛን",
    heroDescFreelancer: "ካብ ዝተለቀቁ ምዕራፋትን ዝጸደቑ ምምላኣትን ዝተሓደሰ።",
    heroDescBoth: "ክትቆጽሩ ከለኹም ኤስክሮ ይምልእ፣ ክትሰርሑ ከለኹም ዝተለቀቁ ምዕራፋት ይቕበል።",
    heroDescClient: "ካብ ዝጸደቑ ምምላኣት ዝተሓደሰ። ውዕላት ክምልኡ ከለዉ ይቅነስ።",
    payoutTaxVoucherBtn: "ቫውቸር ክፍሊትን ግብርን",
    invoiceEscrowReceiptBtn: "ደረሰኝን ቅብሊት ኤስክሮን",
    verifiedPayoutEyebrow: "ዝተረጋገጸ ክፍሊት",
    withdrawEarningsHeading: "ኣታዊኹም ኣውጽኡ",
    choosePayoutDest: "ክፍሊትኩም ኣበይ ክትቅበሉ ከም እትደልዩ ምረጹ፡",
    telebirrSub: "ናብ ቁጽሪ ስልኪ ስደድ",
    cbeBankName: "ባንክ CBE",
    cbeBankSub: "ናብ ቁጽሪ ሕሳብ ስደድ",
    mpesaSub: "ናብ ስልኪ ሳፋሪኮም ስደድ",
    amountEtbLabel: "መጠን (ብር)",
    amountPlaceholder: "ብር",
    telebirrPhoneLabel: "ቁጽሪ ስልኪ ቴሌብር",
    mpesaPhoneLabel: "ቁጽሪ ስልኪ M-Pesa",
    cbeAccountLabel: "ቁጽሪ ሕሳብ CBE",
    approvalCodeLabel: "ኮድ መጽደቒ",
    approvalCodePlaceholder: "6-ኣሃዝ ኮድ",
    sending: "ይልእኽ ኣሎ...",
    resendCode: "ኮድ እንደገና ስደድ",
    sendCode: "ኮድ ስደድ",
    devCodePrefix: "ኮድ Dev፡",
    processing: "የሰላስል ኣሎ...",
    requestWithdrawalBtn: "ምውጻእ ሕተት",
    addFundsEyebrow: "ገንዘብ ወስኽ",
    topUpWalletHeading: "ዋሌትኩም ምልኡ",
    hideTopUpAria: "ኣማራጺታት ምምላእ ሕባእ",
    showTopUpAria: "ኣማራጺታት ምምላእ ኣርኢ",
    topUpMethodAria: "ኣገባብ ምምላእ",
    instantCheckoutTab: "ቅልጡፍ ክፍሊት",
    manualTransferTab: "ብኢድ ምትሕልላፍ",
    instantIntro: "መስመር ክፍሊት ምረጹ። ቴሌብር ብርእሰ-ምሕደራ ይኸፍል፤ CBE ብርን M-Pesaን ብኢድ ስለ ዝስርሑ መምርሒ ምትሕልላፍ ይኸፍቱ።",
    instantC2b: "ቅልጡፍ C2B",
    manualTransferSub: "ምትሕልላፍ ብኢድ",
    cbeTitle: "CBE ብር ገና ኣውቶማቲክ ክፍሊት ስለ ዘይብሉ ብኢድ ይስራሕ፡ ናብ ታሕቲ ዘሎ ሕሳብ ኣመሓላሊፍኩም ደረሰኝ ጽዓኑ።",
    mpesaTitle: "M-Pesa ገና ኣውቶማቲክ ክፍሊት ስለ ዘይብሉ ብኢድ ይስራሕ፡ ናብ ታሕቲ ዘሎ ሕሳብ ኣመሓላሊፍኩም ደረሰኝ ጽዓኑ።",
    amountToAddLabel: "ዝውሰኽ መጠን (ብር)",
    amountToAddPlaceholder: "ንኣብነት 1000",
    fallbackTitle: "ጸገም ኣውቶማቲክ መስመር — ብኢድ ምርግጋጽ ይከኣል",
    fallbackDesc: (provider) =>
      `ኣውቶማቲክ ክፍሊት ${provider} ክዛዘም ኣይከኣለን። ብጌጋ ክልተ ግዜ ከይትኸፍሉ ቅድሚ ምፍታንኩም ናይ ቀረባ እዋን ምምላእ ርኣዩ። ብኢድ ምርግጋጽ'ውን ደረሰኝኩም ከተቕርቡ ትኽእሉ ኢኹም።`,
    switchToManualBtn: "ናብ ምርግጋጽ ብኢድ ቀይር",
    dismissBtn: "ዕጾ",
    startingCheckout: "ክፍሊት ይጅምር ኣሎ...",
    payWith: (provider) => `ብ${provider} ክፈል`,
    manualIntro: "ናብ ታሕቲ ዘሎ ሕሳብ መድረኽ ገንዘብ ልኢኽኩም ንምርግጋጽ ሰራሕተኛ ደረሰኝ ጽዓኑ፡",
    yekisTopUpAccount: "ሕሳብ ምምላእ YeKis",
    cbeBankFull: "ንግዲ ባንክ ኢትዮጵያ",
    mpesaTill: "ቲል 882199 / ስልኪ",
    selectedPrefix: "ዝተመርጸ፡",
    selectedLabels: {
      TELEBIRR: "ቴሌብር (0910 011 818)",
      CBE_BIRR: "ባንክ CBE (1000300802428)",
      M_PESA: "M-Pesa (0716 356 515 - ቲል 882199)",
    },
    copiedBtn: "ተቐዲሑ!",
    copyAccountBtn: "ሕሳብ ቅዳሕ",
    amountSentLabel: "ዝተላእከ መጠን (ብር)",
    amountSentPlaceholder: "ንኣብነት 5000",
    txRefLabel: "ቁጽሪ ግብይት/መወከሲ",
    refPlaceholderTelebirr: "ንኣብነት TB-12345 ወይ ቁጽሪ ደረሰኝ",
    refPlaceholderMpesa: "ንኣብነት SD98A7B6C ወይ ኮድ SMS M-Pesa",
    refPlaceholderCbe: "ንኣብነት FT26081... ወይ መወከሲ CBE",
    receiptUploadLabel: "ስእሊ ወይ ሰነድ ደረሰኝ (PDF/ስእሊ)",
    receiptAcceptedLabel: "JPG፣ PNG፣ WebP ወይ PDF · ክሳብ 10 MB",
    receiptDropSub: "ንጹር ስእሊ ወይ PDF ደረሰኝ ምትሕልላፍኩም ጽዓኑ",
    submitting: "የቕርብ ኣሎ...",
    submitForApprovalBtn: "ንፍቓድ ሰራሕተኛ ኣቕርብ",
    viewInstructionsBtn: "መምርሒ ርአ",
    topUpAuditEyebrow: "መዝገብ ኦዲት ምምላእ",
    recentTopUpsHeading: "ናይ ቀረባ እዋን ምምላኣት",
    noTopUpsYet: "ክሳብ ሕጂ ዝተላእከ ምምላእ የለን።",
    awaitingConfirmation: "ምርግጋጽ ይጽበ ኣሎ",
    completeCheckoutBtn: "ክፍሊት ዛዝም",
    cancelBtn: "ሰርዝ",
    attachReceiptBtn: "ደረሰኝ ኣተሓሕዝ",
    receiptBtn: "ደረሰኝ",
    submitProviderReceiptTitle: "ንምርግጋጽ ሰራሕተኛ ደረሰኝ ወሃቢ ኣገልግሎት ኣቕርቡ",
    submitProviderReceiptDesc: "ኣውቶማቲክ ክፍሊትኩም ብርእሱ እንተዘይተዛዚሙ፣ ብኢድ ንምርግጋጽ ኮድ መወከሲ ግብይትን ስእሊ ደረሰኝን ታሕቲ ኣቕርቡ፡",
    txCodeLabel: "ኮድ ግብይት / መወከሲ",
    txCodePlaceholder: "ንኣብነት TB-12345 ወይ CBE-REF",
    providerReceiptDropSub: "ንጹር ስእሊ ወይ PDF ደረሰኝ ወሃቢ ኣገልግሎት ጽዓኑ",
    submitForStaffVerificationBtn: "ንምርግጋጽ ሰራሕተኛ ኣቕርብ",
    ledgerEyebrow: "መግለጺ ሌጀርን ንጥፈታትን",
    txMovementsHeading: "ዝርዝራት ምንቅስቓስ ግብይት",
    refreshing: "የሐድስ ኣሎ...",
    refreshStatementBtn: "መግለጺ ኣሐድስ",
    totalInflowLabel: "ጠቕላላ ኣታዊ",
    totalOutflowLabel: "ጠቕላላ ወጻኢ",
    pendingSettlementsLabel: "ዝጽበዩ ክፍሊታት",
    transactionSingular: "ግብይት",
    transactionPlural: "ግብይታት",
    totalMovementCountLabel: "ጠቕላላ በዝሒ ምንቅስቓስ",
    searchPlaceholder: "ብኣርእስቲ፣ መወከሲ ወይ ተቓራኒ ወገን ድለ...",
    filterStatusAria: "ግብይታት ብኩነታት ኣጻሪ",
    allStatuses: "ኩሎም ኩነታት",
    statusCompleted: "ተዛዚሙ",
    statusPending: "ምርግጋጽ ይጽበ ኣሎ",
    statusProcessing: "ኣብ መስርሕ",
    statusRejected: "ተነጺጉ / ፈሺሉ",
    filterCategoryAria: "ግብይታት ብምድብ ኣጻሪ",
    tabAll: (n) => `ኩሎም (${n})`,
    tabMoneyIn: (n) => `ዝኣተወ (+${n})`,
    tabMoneyOut: (n) => `ዝወጸ (-${n})`,
    tabPayouts: (n) => `ክፍሊታት (${n})`,
    tabTopUps: (n) => `ምምላኣት (${n})`,
    tabEscrow: (n) => `ኤስክሮ (${n})`,
    loadingMovements: "ምንቅስቓሳት ግብይትን መዝገብ ሌጀርን ይጽዓን ኣሎ...",
    noMovementsRecorded: "ክሳብ ሕጂ ዝተመዝገበ ምንቅስቓስ ግብይት የለን። ምዕራፋት ክትምልኡ፣ ክትውስኹ ወይ ክፍሊት ክትቅበሉ ከለኹም ኣብዚ ክረአ እዩ።",
    noMatchingMovements: "ምስዞም መጻረዪታት ዝሰማማዕ ምንቅስቓስ የለን።",
    clientPrefix: "ዓሚል፡ ",
    freelancerPrefix: "ክኢላ፡ ",
    partyPrefix: "ወገን፡ ",
    contractPrefix: "ውዕል፡ ",
    accPrefix: "ሕሳብ፡ ",
    feePrefix: (amt) => `ክፍሊት፡ ${amt} ብር`,
    escrowDeposit: "ተቀማጭ ኤስክሮ",
    netCredited: "ዝጸረየ ኣታዊ",
    disbursed: "ተኸፊሉ",
    detailsTitle: "ሙሉእ ዝርዝር ግብይት ርአ",
    detailsBtn: "ዝርዝር",
    receiptTitle: "ወግዓዊ ናይ ኢትዮጵያ ደረሰኝ ግብሪ / ቫውቸር ርአ",
    attachProviderReceiptTitle: "ደረሰኝ ወሃቢ ኣገልግሎት ኣተሓሕዝ",
    attachProviderReceiptDesc: "ክፍሊት ብርእሱ ኣይተረጋገጸን? ንፍቓድ ሰራሕተኛ ደረሰኝን ኮድ መወከሲን ታሕቲ ኣተሓሕዙ።",
    txCodeAltPlaceholder: "ንኣብነት TB-12345 ወይ መወከሲ ግብይት",
    movementBreakdownBadge: "ዝርዝር ምንቅስቓስ",
    copyMovementIdTitle: "መለለዪ ምንቅስቓስ ቅዳሕ",
    copiedId: "መለለዪ ተቐዲሑ",
    copyId: "መለለዪ ቅዳሕ",
    printTitle: "ሕተም ወይ PDF ዓቅብ",
    printBtn: "ሕተም / PDF ዓቅብ",
    closeDetailsAria: "ዝርዝር ዕጾ",
    invoiceDocTitle: "ደረሰኝ / INVOICE",
    invoiceDocSubtitle: "ዝርዝርን ትንተናን ምንቅስቓስ ግብይት",
    companyName: "ዬኪስ ቴክኖሎጂስ ኃ/ዝ/ው/ማ",
    companyTagline: "ሓለዋ ኤስክሮን ዲጂታል ዕዳጋ ስራሕን · ኣዲስ ኣበባ፣ ኢትዮጵያ",
    ercaTin: "TIN መድረኽ ERCA፡",
    vatReg: "ምዝገባ VAT፡",
    addisEthiopia: "ኣዲስ ኣበባ፣ ኢትዮጵያ",
    toLabel: "ን፡",
    platformUser: "ተጠቃሚ መድረኽ",
    partyRoleSuffix: (r) => `ወገን ${r}`,
    clientParty: "ወገን ዓሚል",
    freelancerParty: "ወገን ክኢላ",
    destinationAccountLabel: "መብጽሒ / ሕሳብ፡",
    platformWalletVault: "ካዝና ዋሌት መድረኽ",
    directionLabel: "ኣንፈት፡",
    creditMoneyIn: "ክሬዲት (ኣታዊ)",
    debitMoneyOut: "ዴቢት (ወጻኢ)",
    dateLabel: "ዕለት፡",
    invoiceNumLabel: "ደረሰኝ #፡",
    customerIdLabel: "መለለዪ ዓሚል፡",
    statusLabel: "ኩነታት፡",
    thPartyInitiator: "ወገን / መበገሲ",
    thJobContract: "ስራሕ / ውዕል",
    thPaymentRail: "መስመር ክፍሊት",
    thTerms: "ውዕላት",
    thValueDate: "ዕለት ዋጋ",
    thSettlementType: "ዓይነት ክፍሊት",
    thStatus: "ኩነታት",
    yekisSettlementEngine: "ስርዓት ክፍሊት YeKis",
    internalPlatformEscrow: "ውሽጣዊ ኤስክሮ መድረኽ",
    termsEscrowDeposit: "ተቀማጭ ኤስክሮ (ኣታዊ)",
    termsDisbursal: "ክፍሊት (ወጻኢ)",
    instantSettlement: "ቅልጡፍ ክፍሊት",
    thQty: "በዝሒ",
    thItemNum: "ንብረት #",
    thDescription: "መግለጺ",
    thCategory: "ዓውዲ",
    thUnitPrice: "ዋጋ ሓደ",
    thDiscount: "ቅናሽ",
    thLineTotal: "ድምር",
    totalDiscountLabel: "ጠቕላላ ቅናሽ፡",
    subtotalLabel: "ንኡስ ድምር፡",
    salesTaxLabel: "ግብሪ መሸጣ፡",
    totalLabel: "ጠቕላላ ድምር፡",
    thankYouBusiness: "ስለ ዝመረጽኩምና የቐንየልና!",
    idPrefix: "መለለዪ፡",
    railRefPrefix: "መወከሲ መስመር፡",
    naLabel: "የለን",
    viewFiscalReceiptBtn: "ወግዓዊ ደረሰኝ ግብሪ / ቫውቸር ርአ",
    closeBtn: "ዕጾ",
    checkoutTitle: (provider) => `ክፍሊት ${provider}`,
    closeCheckoutAria: "መምርሒ ክፍሊት ዕጾ",
    topUpAmountLabel: "መጠን ምምላእ",
    statusCredited: "ናብ ዋሌት ኣትዩ",
    statusDeclined: "ተነጺጉ",
    statusPendingReview: "ግምገማ ሰራሕተኛ ይጽበ ኣሎ",
    statusAwaiting: "ምርግጋጽ ይጽበ ኣሎ",
    sessionRefLabel: "መወከሲ ክፍለ ግዜ",
    confirmedLead: "ክፍሊት ተረጋጊጹ።",
    confirmedBody: (amt) => `${amt} ብር ናብ ዋሌትኩም ተወሲኹ ኣሎ፤ ምዕራፋት ኤስክሮ ንምምላእ ድሉው እዩ።`,
    declinedBody: "እዚ መስርሕ ክፍሊት ኣይተዛዘመን፤ ናብ ዋሌትኩም'ውን ገንዘብ ኣይተወሰኸን። ሓድሽ ክፍሊት ክትጅምሩ ወይ ብኢድ ኣመሓላሊፍኩም ደረሰኝ ክትልእኹ ትኽእሉ።",
    pendingBody: "ደረሰኝ ምትሕልላፍኩም በጺሑ ኣብ ተራ ምርግጋጽ ሰራሕተኛ ይጽበ ኣሎ።",
    redirectLead: "ታሕቲ ዘሎ መምርሒ ተጠቒምኩም ክፍሊትኩም ዛዝሙ፡",
    redirectStep1Before: "መስኮት ክፍሊት ብርእሱ እንተዘይተኸፊቱ ታሕቲ ",
    openPaygate: (p) => `ገጽ ክፍሊት ${p} ክፈት`,
    redirectStep1After: " ተጠቐሙ።",
    redirectStep2: "ኣብ መስኮት ክፍሊት ምትሕልላፍ ኣጽድቑ። እዚ መስኮት ምርግጋጽ ብርእሱ ይፈትሽ እዩ።",
    redirectStep3: "ግዜ እንተሓሊፉ ወይ ብቀጥታ እንተሰዲድኩም፣ ታሕቲ ደረሰኝ ምትሕልላፍኩም ኣተሓሕዙ።",
    devIntro: "ኣብዚ ከባቢ ናይ ቴሌብር ቀጥታ መስመር ስለ ዘይተዋደደ ናይ ሳንድቦክስ ፈተነ ተፈጢሩ ኣሎ።",
    devStep1Before: "ነዚ ናይ ፈተነ ምምላእ ብኡንብኡ ንምጽዳቕ ታሕቲ ",
    simulateBtn: "ቅልጡፍ ክፍሊት ኣምስል (ሳንድቦክስ)",
    devStep1After: " ጠውቑ።",
    devStep2Before: "ወይ ደረሰኝ ንምጽዓን ",
    attachTransferReceiptBtn: "ደረሰኝ ምትሕልላፍ ኣተሓሕዝ",
    devStep2After: " ጠውቑ።",
    manualCheckoutIntro: "መስመር ክፍሊት ሊንክ ኣይመለሰን። ምምላእኩም ብኢድ ዛዝሙ፡",
    manualCheckoutStep1: (amt) => `ናብ ሕሳብ YeKis ቴሌብር 0910 011 818 መጠን ${amt} ብር ስደዱ (ወይ ንCBE ባንክ / M-Pesa ናብ ምትሕልላፍ ብኢድ ቀይሩ)።`,
    manualCheckoutStep2Before: "መወከሲ ግብይትን ስእሊ ደረሰኝን ንምቕራብ ታሕቲ ",
    manualCheckoutStep2After: " ጠውቑ።",
    doneBtn: "ተዛዚሙ",
    useManualTransferBtn: "ምትሕልላፍ ብኢድ ተጠቐም",
    checking: "ይፍትሽ ኣሎ...",
    checkStatusBtn: "ኩነታት ፈትሽ",
    statusLabels: {
      CHECKOUT_PENDING: "ክፍሊት ይጽበ ኣሎ",
      PENDING: "ይጽበ ኣሎ",
      PENDING_REVIEW: "ግምገማ ይጽበ ኣሎ",
      APPROVED: "ጸዲቑ",
      REJECTED: "ተነጺጉ",
      FLAGGED: "ምልክት ዝተገብረሉ",
      COMPLETED: "ተዛዚሙ",
      PROCESSING: "ኣብ መስርሕ",
      FAILED: "ፈሺሉ",
    },
    categoryLabels: {
      TOP_UP: "ምምላእ",
      PAYOUT: "ክፍሊት",
      ESCROW_LOCK: "ዕጽዋ ኤስክሮ",
      MILESTONE_RELEASE: "ምልቃቕ ምዕራፍ",
    },
  },
};
