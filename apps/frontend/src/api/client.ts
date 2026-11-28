import type { Language } from "../i18n";
import type {
  GuideProgressMutation,
  GuideProgressState,
} from "../components/guide/guideTypes";
import { mockStore } from "./mockData";

// === INTERFACES & TYPES ===
export interface TelegramAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    ucid: string;
    role: string;
    email: string;
    phone: string;
    languagePreference: string;
    kyc?: { tier: string; status: string } | null;
    wallet?: { balanceMinor: number } | null;
  };
  telegram: {
    id: number;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    photoUrl: string | null;
  };
}

/** Content of an admin Telegram broadcast, as the API accepts it. */
export interface TelegramBroadcastInput {
  name: string;
  heading?: string | null;
  body: string;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  audience: "ALL" | "CLIENTS" | "FREELANCERS" | "STAFF" | "KYC_VERIFIED";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MeResponse {
  id: string;
  ucid: string;
  email: string;
  phone: string;
  role: string;
  staffRole: string | null;
  languagePreference: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  profileCompleteness?: number | null;
  kyc: { tier: string; status: string } | null;
  wallet: { balanceMinor: number } | null;
}

/** A profile skill as returned by GET /skills and embedded in profiles. */
export interface SkillSummary {
  id: string;
  name: string;
  category?: string | null;
}

/** Profile payload accepted by PATCH /users/me/profile (see profile.validation.ts). */
export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  bio?: string;
  primarySkillId?: string;
  skillIds?: string[];
  isAvailableForWork?: boolean;
  profileVisibility?: "PUBLIC" | "PROPOSERS" | "PRIVATE";
  languagePreference?: "en" | "am" | "om" | "ti";
  timezone?: string;
  avatarUrl?: string | null;
}

/** The signed-in user's own profile (GET /users/:id/profile with viewer === self). */
export interface SelfProfile {
  id: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  profileCompleteness?: number | null;
  isAvailableForWork?: boolean | null;
  profileVisibility?: "PUBLIC" | "PROPOSERS" | "PRIVATE" | null;
  primarySkillId?: string | null;
  skills?: SkillSummary[];
  isOwnProfile?: boolean;
}

export interface TopUpRequest {
  id: string;
  userId?: string;
  amountMinor: number;
  provider?: "TELEBIRR" | "CBE_BIRR" | "M_PESA";
  paymentMethod?: string;
  senderName?: string;
  referenceNumber: string;
  receiptPath?: string;
  receiptImagePath?: string | null;
  providerTransactionId?: string | null;
  status: "PENDING" | "CHECKOUT_PENDING" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "FLAGGED";
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy?: string | null;
  rejectionReason: string | null;
}

export interface TopUpQueueItem {
  id: string;
  userId: string;
  provider: "TELEBIRR" | "CBE_BIRR" | "M_PESA";
  amountMinor: number;
  referenceNumber: string;
  providerTransactionId?: string | null;
  receiptImagePath?: string | null;
  status: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    phone: string;
    ucid: string;
  };
  userHistory?: {
    approvedCount: number;
    approvedTotalMinor: number;
    rejectedCount: number;
  };
}

export interface KycStatusResponse {
  tier: string;
  status: string;
  nextReviewDueAt: string | null;
  rejectionReason: string | null;
  documentsSubmitted: string[];
}

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  /** Event payload persisted alongside the record (entity ids, amounts, …).
   *  Drives deep-linking: see lib/notificationTargets.ts. */
  metadata?: Record<string, unknown> | null;
}

export interface Job {
  id: string;
  clientId?: string;
  title: string;
  category: string;
  description: string;
  budgetMinMinor: number;
  budgetMaxMinor: number;
  deadline: string;
  status: string;
  createdAt?: string;
  proposalsCount?: number;
  proposedMilestones?: { title: string; amountMinor: number; dueDate: string }[];
  contract?: { id: string } | null;
}

export interface ProposalInput {
  jobId: string;
  coverLetter: string;
  quotedAmountMinor: number;
  estimatedDays: number;
  milestoneBreakdown: { title: string; amountMinor: number; dueDate: string }[];
  attachmentPaths?: string[];
}

export interface Proposal {
  id: string;
  jobId: string;
  freelancerId: string;
  attachmentPaths?: string[];
  coverLetter: string;
  quotedAmountMinor: number;
  estimatedDays: number;
  milestoneBreakdown: { title: string; amount: { amountMinor: number; currency: "ETB" }; dueDate: string }[];
  status: string;
  createdAt: string;
  freelancer?: { id: string; ucid: string; email: string };
  job?: { id: string; title: string; status: string; clientId: string; contract?: { id: string } | null };
}

export interface EscrowFeeConfig {
  clientPlatformFeeRate: number;
  freelancerPlatformFeeRate: number;
  paymentProviderFeeRate: number;
}

export interface WorkspaceReminderItem {
  id: string;
  userId: string;
  title: string;
  dueAt: string;
  note: string | null;
  contractId: string | null;
  milestoneId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  contractId: string;
  sequenceNumber?: number;
  title: string;
  description?: string;
  amountMinor: number;
  platformFeeMinor?: number;
  providerFeeMinor?: number;
  clientFeeMinor?: number;
  clientTotalChargeMinor?: number;
  netPayoutMinor?: number;
  dueDate: string;
  escrowState: string;
  deliverablePath?: string | null;
  deliverableUrl?: string | null;
  submittedAt: string | null;
  autoReleaseAt: string | null;
  releasedAt: string | null;
  /** The contract this milestone belongs to, as the API reports it. */
  contract?: {
    id: string;
    jobId?: string;
    status?: string;
    title?: string;
    category?: string;
    clientName?: string;
    freelancerName?: string;
    clientAcceptedAt?: string | null;
    freelancerAcceptedAt?: string | null;
    fullyExecuted?: boolean;
  } | null;
  /** The other party on the contract — the counterparty, not the caller. */
  counterparty?: {
    id: string;
    role: "CLIENT" | "FREELANCER";
    name: string;
    email: string;
  } | null;
  /** The rail the money moved on; null when it came from the wallet balance. */
  paymentRail?: "TELEBIRR" | "CBE_BIRR" | "M_PESA" | "CHAPA" | null;
  /** When the escrow was funded; null while the milestone is unfunded. */
  fundedAt?: string | null;
}

export interface TransactionMovement {
  id: string;
  journalId?: string;
  date: string;
  title: string;
  description: string;
  category: "TOP_UP" | "PAYOUT" | "ESCROW_LOCK" | "MILESTONE_RELEASE" | "REFUND" | "OTHER";
  direction: "IN" | "OUT";
  amountMinor: number;
  feeMinor: number;
  netAmountMinor: number;
  currency: string;
  status: "COMPLETED" | "PENDING" | "PROCESSING" | "FAILED" | "REJECTED";
  paymentRail?: "TELEBIRR" | "CBE_BIRR" | "M_PESA" | "INTERNAL_WALLET" | null;
  reference?: string;
  accountIdentifier?: string;
  contractId?: string;
  contractTitle?: string;
  counterpartyName?: string;
  counterpartyRole?: "CLIENT" | "FREELANCER" | "SYSTEM";
  milestoneId?: string;
  milestoneTitle?: string;
  receiptUrl?: string;
}

export interface Contract {
  id: string;
  jobId: string;
  clientId: string;
  freelancerId: string;
  templateVersion: string;
  clientAcceptedAt: string | null;
  freelancerAcceptedAt: string | null;
  fullyExecuted: boolean;
  status: string;
  cancellableUntil?: string | null;
  createdAt: string;
  job: { id: string; title: string; status: string };
  milestones: Milestone[];
  client?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
  freelancer?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
}

export interface Dispute {
  id: string;
  contractId: string;
  milestoneId: string;
  category: string;
  stage: string;
  description: string;
  negotiationDeadlineAt: string | null;
  mediationDeadlineAt: string | null;
  mediatorRecommendation: string | null;
  resolutionOutcome: string | null;
  createdAt: string;
  contract?: { id: string; clientId: string; freelancerId: string; job: { title: string } };
  milestone?: { id: string; title: string; amountMinor: number; escrowState: string };
  evidence?: { id: string; submittedByUserId: string; statement: string; createdAt: string }[];
}

export interface TransactionFlag {
  id: string;
  type: string;
  status: string;
  details: Record<string, unknown>;
  createdAt: string;
  strReferenceNumber?: string | null;
  reviewNotes?: string | null;
  reviewedByStaffId?: string | null;
  user: {
    id: string;
    email: string;
    phone: string;
    ucid: string;
    kyc?: { tier: string; status: string } | null;
    wallet?: { balanceMinor: number } | null;
    transactionFlags: {
      id: string;
      type: string;
      status: string;
      createdAt: string;
      strFiledAt: string | null;
    }[];
  };
}

export interface WalletResponse {
  balanceMinor: number;
  pendingMinor?: number;
  availableMinor?: number;
}

export interface ChatConversation {
  id: string;
  subject: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  latestMessage: { body: string; createdAt: string; senderId: string } | null;
  otherParticipant?: {
    id: string;
    email: string;
    role: string;
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
  } | null;
  isSupport?: boolean;
  unread: boolean;
  assignedStaff?: { id: string; name: string } | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  attachmentUrl?: string | null;
  createdAt: string;
  sender: {
    id: string;
    email?: string;
    role: string;
    staffRole: string | null;
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
  };
}

export type MiniMeTone = "PROFESSIONAL" | "FRIENDLY" | "NEGOTIATION" | "CONCISE";

export interface SmartReplyItem {
  id: string;
  label: string;
  text: string;
  rationale?: string;
  category?: "APPROVAL" | "NEGOTIATION" | "DELIVERY" | "CLARIFICATION" | "FOLLOW_UP";
}

export interface MiniMeActionChip {
  id: string;
  label: string;
  actionType: "EXTRACT_DEAL" | "SUMMARIZE" | "OPEN_CONTRACTS" | "INSERT_MILESTONE_UPDATE";
  payload?: string;
}

export interface MiniMeContextBadge {
  stage: string;
  contractId?: string | null;
  contractTitle?: string | null;
  milestoneId?: string | null;
  milestoneTitle?: string | null;
  milestoneAmountETB?: string | null;
  escrowState?: string | null;
  gigTitle?: string | null;
}

export interface SmartReplyOptions {
  tone?: MiniMeTone;
  customPrompt?: string;
  currentDraft?: string;
  activeRole?: string;
  subject?: string;
  messages?: Array<{
    senderId: string;
    senderName?: string;
    senderRole?: string;
    body: string;
    createdAt?: string;
  }>;
  contracts?: Array<{
    id: string;
    title: string;
    status: string;
    milestones: Array<{
      id: string;
      title: string;
      amountMinor: number;
      escrowState: string;
      dueDate: string;
    }>;
  }>;
  gigs?: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
  }>;
}

export interface SmartRepliesResponse {
  suggestions: string[];
  items?: SmartReplyItem[];
  context?: MiniMeContextBadge;
  actionChips?: MiniMeActionChip[];
  agentNote?: string;
  toneUsed?: MiniMeTone;
}

export interface ConversationSummaryResponse {
  topic: string;
  keyPoints: string[];
  agreedBudgetETB: string | null;
  detectedTimeline: string;
  nextStep: string;
  messageCount: number;
  lastActivity?: string;
}

export interface DealTermsResponse {
  suggestedTitle: string;
  suggestedBudgetETB: number;
  estimatedDays: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  readyForEscrow: boolean;
}

export interface StaffConversation {
  id: string;
  subject: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  creator: { id: string; email: string; role: string };
  assignedStaff: { id: string; name: string } | null;
  messages: { body: string; createdAt: string }[];
}

export interface AuthUser {
  id: string;
  ucid: string;
  role: string;
  email: string;
  phone: string;
  languagePreference: string;
}

export interface GigPackage {
  id: string;
  tier: "BASIC" | "STANDARD" | "PREMIUM";
  title: string;
  description: string;
  deliveryDays: number;
  revisionsIncluded: number;
  priceMinor: number;
  addOns?: { label: string; priceMinor: number }[] | null;
}

export interface Gig {
  id: string;
  freelancerId: string;
  title: string;
  category: string;
  description: string;
  tags: string[];
  requirements: { label: string; type: string; required: boolean; options?: string[] }[];
  faqJson?: { question: string; answer: string }[] | null;
  thumbnailUrl?: string | null;
  mediaUrls: string[];
  status: string;
  autoAcceptOrders: boolean;
  maxRevisions: number;
  viewCount: number;
  ratingAverage: number;
  ratingCount: number;
  createdAt: string;
  packages?: GigPackage[];
  freelancer?: { id: string; displayName: string | null; avatarUrl: string | null; bio: string | null; profileCompleteness: number };
}

export interface GigOrder {
  id: string;
  gigId: string;
  packageId: string;
  clientId: string;
  status: string;
  escrowState: string;
  submittedAt?: string | null;
  deliverableUrl?: string | null;
  autoReleaseAt?: string | null;
  revisionStatus: string;
  revisionRequestNote?: string | null;
  revisionsUsed: number;
  totalChargeMinor: number;
  createdAt: string;
  gig?: { id: string; title: string; freelancerId: string };
  package?: GigPackage;
}

export interface CreateGigPayload {
  title: string;
  category: string;
  description: string;
  tags: string[];
  requirements: { label: string; type: string; required: boolean; options?: string[] }[];
  faqJson?: { question: string; answer: string }[];
  thumbnailUrl?: string;
  mediaUrls?: string[];
  autoAcceptOrders: boolean;
  maxRevisions: number;
  packages: { tier: "BASIC" | "STANDARD" | "PREMIUM"; title: string; description: string; deliveryDays: number; revisionsIncluded: number; priceMinor: number; addOns?: { label: string; priceMinor: number }[] }[];
}

// --- Admin / RBAC (Phase 1) ---
export interface AuditLogRow {
  id: string;
  userId: string | null;
  eventType: string;
  entityType: string;
  entityId: string;
  action: string | null;
  actorRole: string | null;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  amountMinor: number | null;
  requestId: string | null;
  ipAddress: string | null;
  createdAt: string;
  user?: { id: string; email: string; staffRole: string | null };
}

export interface AuditLogList {
  items: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
}

export interface StaffUser {
  id: string;
  ucid: string;
  email: string;
  phone: string;
  displayName: string | null;
  role: string;
  staffRole: string | null;
  isSuspended: boolean;
  createdAt: string;
}

export interface PermissionMatrix {
  permissions: string[];
  roles: Record<string, readonly string[]>;
}

export interface KycReviewEvent {
  id: string;
  staffUserId: string;
  decision: string;
  tierAtDecision: string;
  reason: string | null;
  createdAt: string;
}

export interface StaffProfileReport {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  staffNotes: string | null;
  createdAt: string;
  reportedUser: { id: string; ucid: string; displayName: string | null };
}

export interface StaffProfileReportPage {
  data: StaffProfileReport[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// === MAIN FUNCTIONS ===
export class ApiClient {
  private accessToken: string | null = typeof window !== "undefined" ? window.localStorage.getItem("yekis-api-token") : null;
  private refreshToken: string | null = typeof window !== "undefined" ? window.localStorage.getItem("yekis-refresh-token") : null;
  private refreshPromise: Promise<void> | null = null;
  private reauthHandler: (() => Promise<boolean>) | null = null;
  private reauthPromise: Promise<boolean> | null = null;
  private unauthorizedListeners = new Set<() => void>();

  onUnauthorized(listener: () => void): () => void {
    this.unauthorizedListeners.add(listener);
    return () => {
      this.unauthorizedListeners.delete(listener);
    };
  }

  /**
   * Registers an interactive step-up password prompt invoked when an endpoint
   * responds `401 REAUTH_REQUIRED`, keeping session tokens and in-progress form
   * inputs intact instead of signing the user out.
   */
  setReauthHandler(handler: (() => Promise<boolean>) | null): () => void {
    this.reauthHandler = handler;
    return () => {
      if (this.reauthHandler === handler) {
        this.reauthHandler = null;
      }
    };
  }

  private async isReauthRequiredResponse(res: Response): Promise<boolean> {
    if (res.status !== 401) return false;
    try {
      const body = (await res.clone().json()) as { error?: string; code?: string };
      return body?.error === "REAUTH_REQUIRED" || body?.code === "REAUTH_REQUIRED";
    } catch {
      return false;
    }
  }

  private promptReauth(): Promise<boolean> {
    if (!this.reauthHandler) return Promise.resolve(false);
    if (!this.reauthPromise) {
      this.reauthPromise = this.reauthHandler().finally(() => {
        this.reauthPromise = null;
      });
    }
    return this.reauthPromise;
  }

  private canRefreshAuthForPath(path: string): boolean {
    if (!path.includes("/auth/")) return true;
    return (
      path.startsWith("/api/v1/auth/me") ||
      path.startsWith("/api/v1/auth/identities") ||
      path.startsWith("/api/v1/auth/telegram/link") ||
      path.startsWith("/api/v1/auth/oauth/google/link") ||
      path.startsWith("/api/v1/auth/email/verification") ||
      path.startsWith("/api/v1/auth/role")
    );
  }

  private handleUnauthorized(path: string) {
    if (!this.canRefreshAuthForPath(path)) return;
    this.clearToken();
    for (const listener of this.unauthorizedListeners) {
      try {
        listener();
      } catch {
        // Ignore listener errors during forced sign-out
      }
    }
  }

  setToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== "undefined") {
      if (token) {
        window.localStorage.setItem("yekis-api-token", token);
      } else {
        window.localStorage.removeItem("yekis-api-token");
      }
    }
  }

  /**
   * Persist the full session (access + refresh tokens). Every successful
   * auth call site should use this â€” previously only the access token was
   * stored, so the short-lived access token was the only thing keeping a
   * session alive, causing hard logouts every JWT_ACCESS_TTL (15 min).
   */
  setSession(tokens: { accessToken: string; refreshToken?: string | null }) {
    this.setToken(tokens.accessToken);
    this.refreshToken = tokens.refreshToken ?? null;
    if (typeof window !== "undefined") {
      if (tokens.refreshToken) {
        window.localStorage.setItem("yekis-refresh-token", tokens.refreshToken);
      } else {
        window.localStorage.removeItem("yekis-refresh-token");
      }
    }
  }

  clearToken() {
    this.setToken(null);
    this.refreshToken = null;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("yekis-refresh-token");
    }
  }

  getToken(): string | null {
    return this.accessToken;
  }

  /**
   * True when the active session holds an explicit offline/mock token
   * (`"mock-jwt-access-token"` or `"demo-..."`) minted by `mockStore`.
   */
  private isMockSessionToken(): boolean {
    return (
      this.accessToken === "mock-jwt-access-token" ||
      Boolean(this.accessToken?.startsWith("demo-"))
    );
  }

  /**
   * Staff / ops endpoints must never silently synthesize offline mock records
   * when an authenticated real session encounters HTTP 404/502/503/504 or a
   * transient network error — doing so shows fake marketplace balances to ops staff.
   */
  private isStaffApiPath(path: string): boolean {
    const clean = path.split("?")[0];
    return (
      clean.startsWith("/api/v1/admin/") ||
      clean.startsWith("/api/v1/staff/") ||
      clean.startsWith("/api/v1/tms/") ||
      clean.startsWith("/api/v1/finance/") ||
      clean.startsWith("/api/v1/wallet/topups/queue") ||
      clean.startsWith("/api/v1/kyc/review-queue") ||
      /^\/api\/v1\/kyc\/documents\/[^/]+\/url$/.test(clean) ||
      /^\/api\/v1\/kyc\/[^/]+\/(history|review)$/.test(clean) ||
      clean.startsWith("/api/v1/disputes/staff/") ||
      clean.startsWith("/api/v1/chat/admin/") ||
      clean.startsWith("/api/v1/bot/") ||
      clean.startsWith("/api/v1/broadcasts") ||
      clean.startsWith("/api/v1/featured/staff/")
    );
  }

  /**
   * Silent session refresh. Called once (deduped across concurrent requests).
   * The backend /auth/refresh route both validates the refresh token and
   * re-issues the pair, rotating the stored token so a stolen old copy can't
   * be replayed.
   */
  private async tryRefresh(): Promise<void> {
    if (this.refreshPromise) return this.refreshPromise;
    const doing: Promise<void> = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
        if (!res.ok) throw new Error("refresh failed");
        const data = (await res.json()) as {
          accessToken: string;
          refreshToken: string;
        };
        this.setSession(data);
      } catch (err) {
        this.clearToken();
        throw err;
      } finally {
        this.refreshPromise = null;
      }
    })();
    this.refreshPromise = doing;
    return doing;
  }

  /**
   * Performs a request against the API.
   *
   * `behaviour.strictHttpErrors` stops the offline mock from standing in for a
   * real HTTP failure. The default is to fall back to the mock on 404/502/503/504
   * so the frontend still runs with no backend at all, but that fallback is
   * wrong for the verification endpoints: a server that cannot deliver a code
   * answers 503, the mock answers with a fabricated `devCode`, and the person
   * in front of the form is shown a code the server never issued. The code
   * then fails to verify and the flow dead-ends with a message that points at
   * the wrong thing. Those endpoints therefore surface the real status.
   */
  private async request<T>(
    path: string,
    options: RequestInit = {},
    behaviour: { strictHttpErrors?: boolean } = {},
  ): Promise<T> {
    if (this.isMockSessionToken() && !behaviour.strictHttpErrors) {
      return mockStore.handleApiFallback(
        path,
        options.method || "GET",
        options.body,
      ) as T;
    }

    const performRequest = async (token: string | null) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      return fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
      });
    };

    const strictErrors = Boolean(behaviour.strictHttpErrors || this.isStaffApiPath(path));

    let response: Response;
    try {
      response = await performRequest(this.accessToken);
    } catch (err) {
      if (strictErrors) {
        throw err instanceof Error ? err : new Error("Network request failed");
      }
      return mockStore.handleApiFallback(
        path,
        options.method || "GET",
        options.body,
      ) as T;
    }

    // Step-up freshness failure (`401 REAUTH_REQUIRED`): prompt for password
    // re-authentication and retry without clearing the session or form state.
    if (
      response.status === 401 &&
      path !== "/api/v1/auth/reauth" &&
      (await this.isReauthRequiredResponse(response))
    ) {
      const reauthenticated = await this.promptReauth();
      if (reauthenticated) {
        response = await performRequest(this.accessToken);
      }
    } else if (
      // Access token expired -> attempt a silent refresh, then retry the request
      // once. Refresh itself never goes through this branch to avoid a loop.
      response.status === 401 &&
      this.refreshToken &&
      this.canRefreshAuthForPath(path)
    ) {
      try {
        await this.tryRefresh();
        response = await performRequest(this.accessToken);
      } catch {
        // tryRefresh already cleared the session on failure - let the original
        // 401 surface below (app will re-render the login screen).
      }
    }

    if (response.status === 401) {
      const isReauth = await this.isReauthRequiredResponse(response);
      if (!isReauth && path !== "/api/v1/auth/reauth") {
        this.handleUnauthorized(path);
      }
    }

    if (response.headers.get("x-yekis-offline") === "1") {
      return mockStore.handleApiFallback(
        path,
        options.method || "GET",
        options.body,
      ) as T;
    }

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      if (
        !strictErrors &&
        (response.status === 503 ||
          response.status === 502 ||
          response.status === 504 ||
          response.status === 404 ||
          !contentType.includes("application/json"))
      ) {
        return mockStore.handleApiFallback(
          path,
          options.method || "GET",
          options.body,
        ) as T;
      }
      if (response.status === 429) {
        // The generic rate-limit wording is kept for every caller, but the
        // server's own error code is attached when the body carries one. The
        // onboarding step needs to tell "too many codes requested for this
        // address" apart from "too many incorrect guesses" — the first says
        // wait an hour, the second says request a new code — and they are both
        // a 429.
        let rateLimitCode: string | undefined;
        try {
          const body = (await response.json()) as { error?: string };
          rateLimitCode = body?.error;
        } catch {
          /* a rate-limit response with no JSON body */
        }
        const thrown = new Error(
          "Too many requests. Please wait a moment before trying again.",
        ) as Error & { code?: string };
        thrown.code = rateLimitCode;
        throw thrown;
      }
      let error: {
        message?: string;
        error?: string;
        nextAction?: { type: string; path: string };
      };
      try {
        error = await response.json();
      } catch {
        if (strictErrors) {
          throw new Error(`HTTP ${response.status}`);
        }
        return mockStore.handleApiFallback(
          path,
          options.method || "GET",
          options.body,
        ) as T;
      }
      const friendlyStepUp =
        response.status === 403 &&
        (error.error === "STEP_UP_REQUIRED" || (error as { code?: string }).code === "STEP_UP_REQUIRED")
          ? error.message ||
            "Password verification is required for this sensitive action. Sign in with password authentication to continue."
          : response.status === 401 &&
              (error.error === "REAUTH_REQUIRED" || (error as { code?: string }).code === "REAUTH_REQUIRED")
            ? error.message ||
              "Password confirmation cancelled or expired. Your session and entered details remain intact."
            : undefined;
      const fallbackForbidden =
        response.status === 403 && !error.message && error.error === "FORBIDDEN"
          ? "You do not have permission to perform this action on this record."
          : undefined;
      const thrown = new Error(
        friendlyStepUp ||
          error.message ||
          fallbackForbidden ||
          error.error ||
          `HTTP ${response.status}`,
      ) as Error & {
        code?: string;
        status?: number;
        nextAction?: { type: string; path: string };
        blockers?: { code: string; message: string }[];
      };
      thrown.code = error.error;
      thrown.status = response.status;
      if (error.nextAction) thrown.nextAction = error.nextAction;
      if ((error as any).blockers) thrown.blockers = (error as any).blockers;
      if ((error as any).details) (thrown as any).details = (error as any).details;
      throw thrown;
    }

    if (response.status === 204) {
      return {} as T;
    }

    if (!contentType.includes("application/json")) {
      if (strictErrors) {
        throw new Error(`HTTP ${response.status}: unexpected response format`);
      }
      return mockStore.handleApiFallback(
        path,
        options.method || "GET",
        options.body,
      ) as T;
    }

    try {
      const data = await response.json();
      if (data && typeof data === "object" && "__backendOffline" in data) {
        if (strictErrors) {
          throw new Error("API service offline");
        }
        return mockStore.handleApiFallback(
          path,
          options.method || "GET",
          options.body,
        ) as T;
      }
      return data as T;
    } catch (err) {
      if (strictErrors) {
        throw err instanceof Error ? err : new Error(`HTTP ${response.status}: unreadable response`);
      }
      return mockStore.handleApiFallback(
        path,
        options.method || "GET",
        options.body,
      ) as T;
    }
  }

  /**
   * Request using an explicit bearer token instead of the session token.
   */
  private async requestWithToken<T>(
    path: string,
    token: string,
    options: RequestInit = {},
    behaviour: { strictHttpErrors?: boolean } = {},
  ): Promise<T> {
    const strictErrors = Boolean(behaviour.strictHttpErrors || this.isStaffApiPath(path));
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
      Authorization: `Bearer ${token}`,
    };

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    } catch (err) {
      if (strictErrors) {
        throw err instanceof Error ? err : new Error("Network request failed");
      }
      return mockStore.handleApiFallback(
        path,
        options.method || "GET",
        options.body,
      ) as T;
    }

    if (response.headers.get("x-yekis-offline") === "1") {
      if (strictErrors) {
        throw new Error("Backend offline");
      }
      return mockStore.handleApiFallback(
        path,
        options.method || "GET",
        options.body,
      ) as T;
    }

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      if (
        !strictErrors &&
        (response.status === 503 ||
          response.status === 502 ||
          response.status === 504 ||
          response.status === 404 ||
          !contentType.includes("application/json"))
      ) {
        return mockStore.handleApiFallback(
          path,
          options.method || "GET",
          options.body,
        ) as T;
      }
      if (response.status === 429) {
        // Same as `request`: keep the generic wording, attach the server's
        // error code when there is one.
        let rateLimitCode: string | undefined;
        try {
          const body = (await response.json()) as { error?: string };
          rateLimitCode = body?.error;
        } catch {
          /* a rate-limit response with no JSON body */
        }
        const thrown = new Error(
          "Too many requests. Please wait a moment before trying again.",
        ) as Error & { code?: string };
        thrown.code = rateLimitCode;
        throw thrown;
      }
      let error: { message?: string; error?: string };
      try {
        error = await response.json();
      } catch {
        return mockStore.handleApiFallback(
          path,
          options.method || "GET",
          options.body,
        ) as T;
      }
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) return {} as T;

    if (!contentType.includes("application/json")) {
      return mockStore.handleApiFallback(
        path,
        options.method || "GET",
        options.body,
      ) as T;
    }

    try {
      const data = await response.json();
      if (data && typeof data === "object" && "__backendOffline" in data) {
        return mockStore.handleApiFallback(
          path,
          options.method || "GET",
          options.body,
        ) as T;
      }
      return data as T;
    } catch {
      return mockStore.handleApiFallback(
        path,
        options.method || "GET",
        options.body,
      ) as T;
    }
  }

  /**
   * Sends an authenticated multipart FormData POST request, falling back to
   * mockStore only when the backend server is offline or unreachable.
   */
  private async requestFormData<T>(
    path: string,
    formData: FormData,
    fallbackBody: Record<string, unknown>,
  ): Promise<T> {
    if (this.isMockSessionToken()) {
      return mockStore.handleApiFallback(path, "POST", fallbackBody) as T;
    }

    const performUpload = async (token: string | null) => {
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      return fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers,
        body: formData,
      });
    };

    let response: Response;
    try {
      response = await performUpload(this.accessToken);
    } catch {
      return mockStore.handleApiFallback(path, "POST", fallbackBody) as T;
    }

    if (response.status === 401 && await this.isReauthRequiredResponse(response)) {
      const reauthenticated = await this.promptReauth();
      if (reauthenticated) {
        response = await performUpload(this.accessToken);
      } else {
        throw new Error('Re-authentication required. Your session and form input were preserved.');
      }
    }

    if (response.status === 401 && this.refreshToken && this.canRefreshAuthForPath(path)) {
      try {
        await this.tryRefresh();
        response = await performUpload(this.accessToken);
      } catch {
        // Let the original 401 surface below.
      }
    }

    if (response.status === 401) {
      this.handleUnauthorized(path);
    }

    if (response.headers.get("x-yekis-offline") === "1") {
      return mockStore.handleApiFallback(path, "POST", fallbackBody) as T;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok) {
      if (
        response.status === 503 ||
        response.status === 502 ||
        response.status === 504 ||
        response.status === 404 ||
        !contentType.includes("application/json")
      ) {
        return mockStore.handleApiFallback(path, "POST", fallbackBody) as T;
      }
      let error: { message?: string; error?: string };
      try {
        error = await response.json();
      } catch {
        return mockStore.handleApiFallback(path, "POST", fallbackBody) as T;
      }
      const friendlyStepUp =
        response.status === 403 &&
        (error.error === "STEP_UP_REQUIRED" || (error as { code?: string }).code === "STEP_UP_REQUIRED")
          ? error.message ||
            "Password verification is required for this sensitive action. Sign in with password authentication to continue."
          : response.status === 401 &&
              (error.error === "REAUTH_REQUIRED" || (error as { code?: string }).code === "REAUTH_REQUIRED")
            ? error.message ||
              "Password confirmation cancelled or expired. Your session and entered details remain intact."
            : undefined;
      const fallbackForbidden =
        response.status === 403 && !error.message && error.error === "FORBIDDEN"
          ? "You do not have permission to perform this action on this record."
          : undefined;
      const thrown = new Error(
        friendlyStepUp ||
          error.message ||
          fallbackForbidden ||
          error.error ||
          `HTTP ${response.status}`,
      ) as Error & { code?: string; status?: number };
      thrown.code = error.error;
      thrown.status = response.status;
      throw thrown;
    }

    if (!contentType.includes("application/json")) {
      return mockStore.handleApiFallback(path, "POST", fallbackBody) as T;
    }

    try {
      const data = await response.json();
      if (data && typeof data === "object" && "__backendOffline" in data) {
        return mockStore.handleApiFallback(path, "POST", fallbackBody) as T;
      }
      return data as T;
    } catch {
      return mockStore.handleApiFallback(path, "POST", fallbackBody) as T;
    }
  }

  /**
   * Fetches a chat attachment as a Blob using an explicit bearer token.
   *
   * Attachment routes are authorized, and browsers do NOT send an Authorization
   * header for `<img src>` or plain link navigations — so attachments must be
   * fetched explicitly and turned into an object URL.
   */
  async fetchAttachmentBlob(url: string, token: string): Promise<Blob> {
    const absolute = url.startsWith("http")
      ? url
      : `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;

    const response = await fetch(absolute, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Attachment unavailable.");
      }
      throw new Error(`Could not load attachment (HTTP ${response.status}).`);
    }
    return response.blob();
  }

  /** Uploads a chat attachment using an explicit bearer token (guest sessions). */
  async uploadGuestChatAttachment(file: File, token: string): Promise<{ url: string }> {
    const absolute = `${API_BASE_URL}/api/v1/chat/upload`;
    const form = new FormData();
    form.append("file", file);

    const response = await fetch(absolute, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (!response.ok) {
      throw new Error(`Upload failed (HTTP ${response.status}).`);
    }
    return response.json();
  }

  // Auth
  //
  // Every authentication call below opts out of the offline mock. The mock
  // stands in for the ABSENCE of a server — no backend at all, or the dev
  // proxy's explicit `X-Yekis-Offline: 1` — and for nothing else. A server
  // that answered with an error has answered, and its answer must reach the
  // caller.
  //
  // The distinction matters most here. A host with no bot token answers
  // `503 TELEGRAM_NOT_CONFIGURED`, and the mock would otherwise stand in for
  // it and hand back `accessToken: "mock-jwt-access-token"` — a token the
  // server has never heard of. The Mini App looked like it had signed in,
  // every request that followed was refused with a 401, and the real reason
  // never reached the person in front of the screen.
  async loginWithTelegram(authData: string | Record<string, unknown>, role?: string): Promise<TelegramAuthResponse> {
    const body =
      typeof authData === "string"
        ? { initData: authData, role }
        : { ...authData, role };
    return this.request(
      "/api/v1/auth/telegram",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      { strictHttpErrors: true },
    );
  }

  // ---------- Social sign-in (server verifies provider credentials) ----------

  async getOAuthProviders(): Promise<{
    google: boolean;
    apple: boolean;
    facebook: boolean;
    telegram: boolean;
    telegramBotUsername: string | null;
  }> {
    return this.request("/api/v1/auth/oauth/providers", { method: "GET" });
  }

  async linkTelegram(initData: string): Promise<{ telegramUserId: string; telegramChatId: string }> {
    return this.request(
      "/api/v1/auth/telegram/link",
      {
        method: "POST",
        body: JSON.stringify({ initData }),
      },
      { strictHttpErrors: true },
    );
  }

  async unlinkTelegram(): Promise<{ unlinked: boolean }> {
    return this.request(
      "/api/v1/auth/telegram/link",
      { method: "DELETE" },
      { strictHttpErrors: true },
    );
  }

  /**
   * Redeems the one-time code the Telegram bot mints via /login. This is the
   * sign-in path that works when the Login Widget cannot render (domain not
   * registered with @BotFather, or telegram.org blocked).
   */
  async loginWithTelegramCode(code: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    return this.request(
      "/api/v1/auth/telegram/code",
      {
        method: "POST",
        body: JSON.stringify({ code }),
      },
      { strictHttpErrors: true },
    );
  }

  async loginWithGoogleOAuth(idToken: string, role?: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    return this.request(
      "/api/v1/auth/oauth/google",
      {
        method: "POST",
        body: JSON.stringify({ idToken, role }),
      },
      { strictHttpErrors: true },
    );
  }

  async loginWithAppleOAuth(idToken: string, firstName?: string, lastName?: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    return this.request(
      "/api/v1/auth/oauth/apple",
      {
        method: "POST",
        body: JSON.stringify({ idToken, firstName, lastName }),
      },
      { strictHttpErrors: true },
    );
  }

  async loginWithFacebookOAuth(accessToken: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    return this.request(
      "/api/v1/auth/oauth/facebook",
      {
        method: "POST",
        body: JSON.stringify({ accessToken }),
      },
      { strictHttpErrors: true },
    );
  }

  // ---------- Linked credentials (the signed-in account) ----------

  /**
   * What this account can sign in with. Booleans only — the provider ids
   * themselves are never sent to the browser.
   */
  async getAuthIdentities(): Promise<{
    email: string;
    emailVerified: boolean;
    passwordSet: boolean;
    google: boolean;
    apple: boolean;
    facebook: boolean;
    telegram: boolean;
    phoneVerified: boolean;
  }> {
    return this.request("/api/v1/auth/identities", { method: "GET" });
  }

  /**
   * Binds a Google credential to the account that is already signed in.
   *
   * This is the answer to `409 ACCOUNT_LINK_REQUIRED`: the member signs in
   * with their password first, then attaches Google here. The server verifies
   * the credential against Google's JWKS, refuses an address that is not the
   * account's own, and refuses a credential that already belongs to another
   * account.
   */
  async linkGoogle(idToken: string): Promise<{ linked: boolean; alreadyLinked: boolean }> {
    return this.request(
      "/api/v1/auth/oauth/google/link",
      {
        method: "POST",
        body: JSON.stringify({ idToken }),
      },
      { strictHttpErrors: true },
    );
  }

  async unlinkGoogle(): Promise<{ unlinked: boolean }> {
    return this.request(
      "/api/v1/auth/oauth/google/link",
      { method: "DELETE" },
      { strictHttpErrors: true },
    );
  }

  /**
   * Starts the Telegram deep-link handshake for the signed-in account.
   *
   * The member is already signed in on the web; this mints a one-time session
   * id and returns the bot URL that carries it. Opening that URL lands the
   * member in the bot's `/start` handler, which binds the Telegram chat to
   * this account. The web side then polls `getTelegramLinkStatus` until the
   * status flips to "linked".
   *
   * The Telegram id itself never crosses this boundary: the browser only ever
   * holds `true`/`false`, exactly like the other providers.
   */
  async startTelegramLink(): Promise<{ sid: string; botUrl: string }> {
    return this.request(
      "/api/v1/auth/telegram/link/start",
      { method: "POST", body: JSON.stringify({}) },
      { strictHttpErrors: true },
    );
  }

  /** Polls the handshake started by `startTelegramLink`. */
  async getTelegramLinkStatus(
    sid: string,
  ): Promise<{ status: "pending" | "linked" | "expired" }> {
    return this.request(
      `/api/v1/auth/telegram/link/${encodeURIComponent(sid)}/status`,
      { method: "GET" },
      { strictHttpErrors: true },
    );
  }

  /**
   * Asks the server to send a verification code to the address already on the
   * account. The address is read server-side from the signed-in account, so
   * the browser cannot ask for a code to somebody else's inbox.
   */
  async startAccountEmailVerification(): Promise<{
    sent: boolean;
    email: string;
    expiresAt: string;
    retryAfterSec: number;
    devCode?: string;
  }> {
    return this.request(
      "/api/v1/auth/email/verification/start",
      { method: "POST", body: JSON.stringify({}) },
      { strictHttpErrors: true },
    );
  }

  /** Redeems the six-digit code sent by `startAccountEmailVerification`. */
  async checkAccountEmailVerification(
    code: string,
  ): Promise<{ verified: boolean; email: string }> {
    return this.request(
      "/api/v1/auth/email/verification/check",
      { method: "POST", body: JSON.stringify({ code }) },
      { strictHttpErrors: true },
    );
  }

  /**
   * Changes the account type (CLIENT / FREELANCER / BOTH) for the signed-in
   * member.
   *
   * The server answers with a new access/refresh pair stamped with the new
   * role, because the role travels in the token — the caller must adopt the
   * new tokens or the next request would still carry the old role.
   */
  async switchAccountRole(role: "CLIENT" | "FREELANCER" | "BOTH"): Promise<{
    role: "CLIENT" | "FREELANCER" | "BOTH";
    from: "CLIENT" | "FREELANCER" | "BOTH";
    accessToken: string;
    refreshToken: string;
  }> {
    return this.request(
      "/api/v1/auth/role",
      { method: "POST", body: JSON.stringify({ role }) },
      { strictHttpErrors: true },
    );
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean }> {
    return this.request("/api/v1/auth/reset-password-request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    return this.request("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async changePassword(input: {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions?: boolean;
  }): Promise<{ ok: boolean; message: string; accessToken?: string; refreshToken?: string }> {
    const res = await this.request<{ ok: boolean; message: string; accessToken?: string; refreshToken?: string }>(
      "/api/v1/auth/change-password",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
    if (res.accessToken) {
      this.setSession({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    }
    return res;
  }

  async revokeAllSessions(): Promise<{ ok: boolean; message: string; accessToken?: string; refreshToken?: string }> {
    const res = await this.request<{ ok: boolean; message: string; accessToken?: string; refreshToken?: string }>(
      "/api/v1/auth/revoke-sessions",
      {
        method: "POST",
      },
    );
    if (res.accessToken) {
      this.setSession({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    }
    return res;
  }

  async exportUserData(): Promise<Record<string, unknown>> {
    return this.request("/api/v1/users/me/export");
  }

  /**
   * Signs in with a phone number (or an email address, or either identifier)
   * and a password. The Mini App's fallback path when Telegram sign-in is
   * unavailable.
   *
   * Like every other authentication call, the real HTTP status is surfaced:
   * the mock must not hand back a session the server never issued.
   */
  async loginWithMobile(input: { phone?: string; email?: string; identifier?: string; password: string }): Promise<{ accessToken: string; refreshToken?: string; user?: AuthUser }> {
    return this.request(
      "/api/v1/auth/login",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      { strictHttpErrors: true },
    );
  }

  async getMe(): Promise<MeResponse> {
    return this.request("/api/v1/auth/me");
  }

  async getChatConversations(): Promise<ChatConversation[]> {
    return this.request("/api/v1/chat/conversations");
  }

  async createChatConversation(subject: string): Promise<{ id: string; subject: string; status: string }> {
    return this.request("/api/v1/chat/conversations", { method: "POST", body: JSON.stringify({ subject }) });
  }

  /**
   * Opens a support ticket and notifies the support desk immediately, so an
   * agent sees it before the user's first message is even sent.
   */
  async createSupportConversation(subject: string): Promise<ChatConversation> {
    return this.request("/api/v1/chat/support", {
      method: "POST",
      body: JSON.stringify({ subject }),
    });
  }

  async createGuestSupport(email: string | undefined, body: string): Promise<{
    id: string;
    subject: string;
    status: string;
    assignedStaff?: { id: string; name: string } | null;
    /** Scoped to this conversation only â€” see guestSupportToken.ts. */
    accessToken: string;
  }> {
    return this.request("/api/v1/chat/guest", { method: "POST", body: JSON.stringify({ ...(email ? { email } : {}), body }) });
  }

  /** Reads a guest thread with the scoped token from createGuestSupport. */
  async getGuestChatMessages(conversationId: string, token: string): Promise<ChatMessage[]> {
    return this.requestWithToken(`/api/v1/chat/conversations/${conversationId}/messages`, token);
  }

  /** Sends a guest follow-up with the scoped token from createGuestSupport. */
  async sendGuestChatMessage(
    conversationId: string,
    token: string,
    body: string,
    attachmentUrl?: string,
  ): Promise<ChatMessage> {
    return this.requestWithToken(
      `/api/v1/chat/conversations/${conversationId}/messages`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ body, ...(attachmentUrl ? { attachmentUrl } : {}) }),
      },
    );
  }

  async createDirectConversation(recipientId: string, subject: string): Promise<ChatConversation> {
    try {
      return await this.request("/api/v1/chat/direct", {
        method: "POST",
        body: JSON.stringify({ recipientId, subject }),
      });
    } catch (err) {
      if (recipientId.startsWith("demo-")) {
        const demoNames: Record<string, string> = {
          "demo-selam": "Selam Tadesse",
          "demo-dawit": "Dawit Tesfaye",
          "demo-hanna": "Hanna Bekele",
          "demo-yonas": "Yonas Alemu",
          "demo-meron": "Meron Haile",
          "demo-abel": "Abel Girma",
        };
        const recipientName = demoNames[recipientId] || "Verified Freelancer";
        return {
          id: `conv-direct-${recipientId}`,
          subject,
          status: "OPEN",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          latestMessage: {
            body: "Selam! Thanks for reaching out. I'm available to collaborate on your project deliverables and milestones.",
            createdAt: new Date().toISOString(),
            senderId: recipientId,
          },
          otherParticipant: {
            id: recipientId,
            email: `${recipientId}@yekis.et`,
            role: "FREELANCER",
            displayName: recipientName,
          },
          isSupport: false,
          unread: false,
        };
      }
      throw err;
    }
  }

  async getChatMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      return await this.request(`/api/v1/chat/conversations/${conversationId}/messages`);
    } catch (err) {
      if (conversationId.startsWith("conv-direct-demo-")) {
        const talentId = conversationId.replace("conv-direct-", "");
        return [
          {
            id: `msg-${Date.now()}`,
            conversationId,
            senderId: talentId,
            body: "Selam! Thanks for reaching out. I'm available to collaborate on your project deliverables and milestones.",
            createdAt: new Date().toISOString(),
            sender: {
              id: talentId,
              email: `${talentId}@yekis.et`,
              role: "FREELANCER",
              staffRole: null,
              displayName: "Verified Freelancer",
            },
          },
        ];
      }
      throw err;
    }
  }

  async sendChatMessage(conversationId: string, body: string, attachmentUrl?: string, internal = false): Promise<ChatMessage> {
    return this.request(`/api/v1/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body, attachmentUrl, internal }),
    });
  }

  async uploadChatAttachment(file: File): Promise<{ url: string; fileName: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/chat/upload`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.url) return data;
      }
    } catch {
      // Fallback to Data URL if upload endpoint is unavailable
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          url: reader.result as string,
          fileName: file.name,
        });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async getSmartReplies(conversationId: string, options?: SmartReplyOptions): Promise<SmartRepliesResponse> {
    return this.request(`/api/v1/chat/conversations/${conversationId}/assistant/suggest-replies`, {
      method: "POST",
      body: JSON.stringify(options ?? {}),
    });
  }

  async summarizeChat(conversationId: string, options?: SmartReplyOptions): Promise<ConversationSummaryResponse> {
    return this.request(`/api/v1/chat/conversations/${conversationId}/assistant/summarize`, {
      method: "POST",
      body: JSON.stringify(options ?? {}),
    });
  }

  async extractDealTerms(conversationId: string, options?: SmartReplyOptions): Promise<DealTermsResponse> {
    return this.request(`/api/v1/chat/conversations/${conversationId}/assistant/extract-deal`, {
      method: "POST",
      body: JSON.stringify(options ?? {}),
    });
  }

  async markChatRead(conversationId: string): Promise<{ ok: boolean }> {
    return this.request(`/api/v1/chat/conversations/${conversationId}/read`, { method: "POST" });
  }

  async getStaffConversations(params?: { page?: number; pageSize?: number; search?: string; status?: string; assignment?: string; sort?: string }): Promise<PaginatedResponse<StaffConversation>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.assignment) searchParams.set("assignment", params.assignment);
    if (params?.sort) searchParams.set("sort", params.sort);
    return this.request(`/api/v1/chat/admin/conversations?${searchParams.toString()}`);
  }

  async setConversationStatus(conversationId: string, status: "OPEN" | "CLOSED"): Promise<StaffConversation> {
    return this.request(`/api/v1/chat/admin/conversations/${conversationId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  async claimConversation(conversationId: string): Promise<StaffConversation> {
    return this.request(`/api/v1/chat/admin/conversations/${conversationId}/claim`, {
      method: "POST",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getKycReviewQueue(params?: { page?: number; pageSize?: number; search?: string; status?: string }): Promise<PaginatedResponse<any>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    return this.request(`/api/v1/kyc/review-queue?${searchParams.toString()}`);
  }

  async reviewKyc(userId: string, decision: "VERIFIED" | "REJECTED", rejectionReason?: string): Promise<unknown> {
    return this.request(`/api/v1/kyc/${userId}/review`, { method: "POST", body: JSON.stringify({ decision, rejectionReason }) });
  }
  async getKycReviewHistory(userId: string): Promise<KycReviewEvent[]> {
    return this.request(`/api/v1/kyc/${userId}/history`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTopUpReviewQueue(params?: { page?: number; pageSize?: number; search?: string; status?: string; minAmount?: number; maxAmount?: number }): Promise<PaginatedResponse<any>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.minAmount) searchParams.set("minAmount", String(params.minAmount));
    if (params?.maxAmount) searchParams.set("maxAmount", String(params.maxAmount));
    return this.request(`/api/v1/wallet/topups/queue?${searchParams.toString()}`);
  }

  async reviewTopUp(topUpId: string, decision: "APPROVED" | "REJECTED", rejectionReason?: string): Promise<unknown> {
    const action = decision === "APPROVED" ? "approve" : "reject";
    return this.request(`/api/v1/wallet/topups/${topUpId}/${action}`, { method: "POST", body: JSON.stringify({ rejectionReason }) });
  }

  async flagTopUpSuspicious(topUpId: string, reason: string): Promise<unknown> {
    return this.request(`/api/v1/wallet/topups/${topUpId}/flag`, { method: "POST", body: JSON.stringify({ reason }) });
  }

  async getDisputeQueue(params?: { page?: number; pageSize?: number; search?: string; status?: string }): Promise<PaginatedResponse<Dispute>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    return this.request(`/api/v1/disputes/staff/queue?${searchParams.toString()}`);
  }

  async previewDisputeSplit(
    disputeId: string,
    input: {
      outcome: "RELEASE_TO_FREELANCER" | "REFUND_TO_CLIENT" | "PARTIAL_SPLIT";
      freelancerShareMinor?: number;
      freelancerSharePct?: number;
    },
  ): Promise<{
    disputedAmountMinor: number;
    outcome: "RELEASE_TO_FREELANCER" | "REFUND_TO_CLIENT" | "PARTIAL_SPLIT";
    freelancerSharePct: number | null;
    freelancerGrossMinor: number;
    clientRefundMinor: number;
    platformFeeMinor: number;
    providerFeeMinor: number;
    totalFeeMinor: number;
    withholdingTaxMinor: number;
    freelancerNetMinor: number;
    freelancerFeeRate: number;
    providerFeeRate: number;
  }> {
    return this.request(`/api/v1/admin/disputes/${disputeId}/split-preview`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async resolveDispute(
    disputeId: string,
    input: {
      outcome: "RELEASE_TO_FREELANCER" | "REFUND_TO_CLIENT" | "PARTIAL_SPLIT";
      recommendation: string;
      freelancerShareMinor?: number;
      freelancerSharePct?: number;
    },
  ): Promise<Dispute> {
    return this.request(`/api/v1/disputes/${disputeId}/resolve`, { method: "POST", body: JSON.stringify(input) });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getTmsQueue(params?: { page?: number; pageSize?: number; search?: string; status?: string; flagType?: string }): Promise<PaginatedResponse<any>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.flagType) searchParams.set("flagType", params.flagType);
    return this.request(`/api/v1/tms/queue?${searchParams.toString()}`);
  }
  async fileStr(flagId: string, reviewNotes: string, strReferenceNumber: string, suspendAccount = false): Promise<TransactionFlag> {
    return this.request(`/api/v1/tms/${flagId}/file-str`, { method: "POST", body: JSON.stringify({ reviewNotes, strReferenceNumber, suspendAccount }) });
  }
  async dismissFlag(flagId: string, reviewNotes: string): Promise<TransactionFlag> {
    return this.request(`/api/v1/tms/${flagId}/dismiss`, { method: "POST", body: JSON.stringify({ reviewNotes }) });
  }
  /** Lifts a compliance hold placed on a user account. */
  async liftTmsHold(userId: string, reason?: string): Promise<unknown> {
    return this.request(`/api/v1/tms/users/${userId}/lift-hold`, { method: "POST", body: JSON.stringify({ reason }) });
  }
  async getTmsActivity(): Promise<Array<AuditLogRow & { user: { id: string; email: string; staffRole: string | null } }>> {
    return this.request("/api/v1/tms/activity");
  }

  async reauthenticate(password: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    const res = await this.request<{ accessToken: string; refreshToken: string; user: AuthUser }>(
      "/api/v1/auth/reauth",
      {
        method: "POST",
        body: JSON.stringify({ password }),
      },
      { strictHttpErrors: true },
    );
    this.setSession({
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
    });
    return res;
  }

  /**
   * Signs in with an email address or a phone number, and a password.
   *
   * The identifier is sent as `identifier`, which is what the route reads:
   * an address is looked up as an address and a number is normalised to
   * `+251…` first, so `0911223344`, `251911223344` and `+251911223344` all
   * reach the same account.
   *
   * The real HTTP status is always surfaced. A fabricated session is worse
   * than a failed one: the offline mock answers `mock-jwt-access-token`,
   * which no server has issued, so every request that followed it would be
   * refused and the person would be told they had signed in.
   */
  async login(identifier: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    return this.request(
      "/api/v1/auth/login",
      { method: "POST", body: JSON.stringify({ identifier, password }) },
      { strictHttpErrors: true },
    );
  }

  async register(input: {
    email: string;
    /** The payout destination. Omitted for an account created from an address alone. */
    phone?: string;
    password: string;
    languagePreference: Language;
    /** BOTH is a real UserRole (see the Prisma enum and RegisterInput). */
    role: "CLIENT" | "FREELANCER" | "BOTH";
    dateOfBirth: string;
    consents: { kycDataProcessing: true; financialDataProcessing: true; platformNotifications: boolean; marketingCommunications: boolean; analytics: boolean };
  }): Promise<{ ok: boolean; message: string }> {
    return this.request(
      "/api/v1/auth/register",
      { method: "POST", body: JSON.stringify(input) },
      { strictHttpErrors: true },
    );
  }

  /**
   * Requests an SMS code for a phone number.
   *
   * Both verification endpoints are unauthenticated on purpose: the primary flow
   * is registration, where the code is sent and checked before the account
   * exists. Neither reveals whether a number is already registered.
   *
   * `devCode` is only ever present on a developer machine or in the test
   * suite, and is shown by the UI in that case so a developer can complete the
   * flow without a handset. It is never present on a reachable host.
   */
  async requestPhoneCode(phone: string): Promise<{
    sent: boolean;
    expiresAt: string;
    retryAfterSec: number;
    devCode?: string;
  }> {
    return this.request(
      "/api/v1/auth/phone/code",
      {
        method: "POST",
        body: JSON.stringify({ phone }),
      },
      { strictHttpErrors: true },
    );
  }

  async verifyPhoneCode(
    phone: string,
    code: string,
  ): Promise<{ verified: true }> {
    return this.request(
      "/api/v1/auth/phone/verify",
      {
        method: "POST",
        body: JSON.stringify({ phone, code }),
      },
      { strictHttpErrors: true },
    );
  }

  /**
   * Which verification channels can actually deliver right now.
   *
   * The onboarding step asks the server before it offers a channel: on a host
   * with no SMTP key the email code would 503, and with no SMS key the phone
   * code would 503. Offering either anyway is how a signup ends in a dead
   * end with no explanation.
   */
  async getVerificationChannels(): Promise<{
    email: { available: boolean; label: string };
    phone: { available: boolean; label: string };
  }> {
    return this.request(
      "/api/v1/auth/verification/channels",
      { method: "GET" },
      { strictHttpErrors: true },
    );
  }

  /**
   * Requests an email OTP for an address.
   *
   * This is the onboarding channel while the SMS provider is unconfigured. It
   * is unauthenticated on purpose: the code is sent and checked before the
   * account exists, and the response never says whether the address is already
   * registered.
   *
   * `devCode` is only ever present on a developer machine or in the test
   * suite, and is shown by the UI in that case so a developer can complete the
   * flow without a mailbox. It is never present on a reachable host.
   */
  async requestEmailCode(email: string): Promise<{
    sent: boolean;
    expiresAt: string;
    retryAfterSec: number;
    devCode?: string;
  }> {
    return this.request(
      "/api/v1/auth/email/code",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
      { strictHttpErrors: true },
    );
  }

  async verifyEmailCode(
    email: string,
    code: string,
  ): Promise<{ verified: true }> {
    return this.request(
      "/api/v1/auth/email/verify",
      {
        method: "POST",
        body: JSON.stringify({ email, code }),
      },
      { strictHttpErrors: true },
    );
  }

  /**
   * Starts the Fayda eSignet biometric check and returns the provider URL to
   * send the user to.
   *
   * This is the only implemented identity path: esignet.client.ts does a real
   * OIDC Pushed Authorization Request, exchanges the code, and decrypts the
   * nested JWE/JWS. Until now nothing in the frontend called it, so the working
   * integration was unreachable and the UI called a route that did not exist.
   */
  async initiateFaydaVerification(): Promise<{
    /** Named authorizeUrl by the API, on both the real and the mock branch. */
    authorizeUrl: string;
    requestUri: string;
    state: string;
    /** Public OIDC client id. Needed to build the PAR redirect. */
    clientId?: string;
  }> {
    return this.request("/api/v1/kyc/fayda/initiate", { method: "POST" });
  }

  /**
   * Builds the browser redirect for a Pushed Authorization Request.
   *
   * A PAR is two steps by design: the request_uri is obtained server-side so the
   * authorization parameters never travel in a URL the user could be tricked
   * into sharing, and the browser then goes to the authorize endpoint carrying
   * that reference. Returns null when the pieces needed to do so are missing,
   * rather than a URL that would fail.
   */
  buildFaydaRedirectUrl(res: {
    authorizeUrl: string;
    requestUri: string;
    clientId?: string;
  }): string | null {
    if (!res.requestUri || !res.clientId) return null;
    const url = new URL(res.authorizeUrl);
    url.searchParams.set("request_uri", res.requestUri);
    url.searchParams.set("client_id", res.clientId);
    return url.toString();
  }

  /** Completes the eSignet redirect. Call with the code and state Fayda returns. */
  async completeFaydaVerification(
    code: string,
    state: string,
  ): Promise<{ tier: string; status: string }> {
    return this.request("/api/v1/kyc/fayda/callback", {
      method: "POST",
      body: JSON.stringify({ code, state }),
    });
  }

  // Wallet / Top-ups
  async getWallet(): Promise<WalletResponse> {
    return this.request("/api/v1/escrow/wallet");
  }

  async getTransactionMovements(): Promise<{ movements: TransactionMovement[]; total: number }> {
    return this.request("/api/v1/escrow/wallet/transactions");
  }

  async getPayouts(params?: { page?: number; limit?: number }): Promise<{
    items: Array<{
      id: string;
      amountMinor: number;
      feeMinor: number;
      netAmountMinor: number;
      provider: string;
      status: string;
      payoutAccountIdentifier: string;
      errorMessage: string | null;
      createdAt: string;
      settledAt: string | null;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return this.request("/api/v1/escrow/payouts" + (query ? "?" + query : ""));
  }

  async getTopUpRequests(): Promise<TopUpRequest[]> {
    return this.request("/api/v1/wallet/topups");
  }

  async getTopUpMethods(): Promise<{
    telebirrInstantLive: boolean;
    defaultMethod: "INSTANT" | "MANUAL";
    instantProviders: Array<{
      provider: "TELEBIRR" | "CBE_BIRR" | "M_PESA";
      enabled: boolean;
      live: boolean;
    }>;
    manualProviders: Array<{
      provider: "TELEBIRR" | "CBE_BIRR" | "M_PESA" | "CHAPA";
      enabled: boolean;
    }>;
  }> {
    return this.request("/api/v1/wallet/topups/methods");
  }

  async getTopUpReceiptUrl(topUpId: string): Promise<{ url: string }> {
    return this.request(`/api/v1/wallet/topups/${topUpId}/receipt-url`);
  }

  async initiateCheckoutTopUp(
    amountMinor: number,
    provider: string,
  ): Promise<{ redirectUrl: string | null; topUpId: string; providerTransactionId?: string }> {
    return this.request("/api/v1/wallet/topups/checkout", {
      method: "POST",
      body: JSON.stringify({ amountMinor, provider }),
    });
  }

  async simulateTopUpSuccess(topUpId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/v1/wallet/topups/checkout/${topUpId}/simulate-success`, {
      method: "POST",
    });
  }

  /**
   * Status of one of this user's own top-ups.
   *
   * `credited` is the only field that should decide whether the UI tells a user
   * their money arrived. Everything else is detail for the copy.
   */
  async getTopUpStatus(topUpId: string): Promise<{
    id: string;
    amountMinor: number;
    provider: string;
    status: "PENDING" | "CHECKOUT_PENDING" | "APPROVED" | "REJECTED" | "FLAGGED";
    providerTransactionId: string | null;
    createdAt: string;
    credited: boolean;
  }> {
    return this.request(`/api/v1/wallet/topups/${topUpId}`);
  }

  async createTopUpRequest(data: FormData): Promise<TopUpRequest> {
    return this.requestFormData<TopUpRequest>("/api/v1/wallet/topups", data, {
      amountMinor: Number(data.get("amountMinor") || 5000000),
      provider: String(data.get("provider") || "TELEBIRR"),
      referenceNumber: String(data.get("referenceNumber") || `REF-${Date.now().toString().slice(-6)}`),
    });
  }

  async attachTopUpReceipt(topUpId: string, data: FormData): Promise<TopUpRequest> {
    return this.requestFormData<TopUpRequest>(`/api/v1/wallet/topups/${topUpId}/attach-receipt`, data, {
      referenceNumber: String(data.get("referenceNumber") || `REF-${Date.now().toString().slice(-6)}`),
    });
  }

  // KYC
  async getKycStatus(): Promise<KycStatusResponse> {
    return this.request("/api/v1/kyc/status");
  }

  async getKycDocumentUrl(documentId: string): Promise<{ url: string }> {
    return this.request(`/api/v1/kyc/documents/${documentId}/url`);
  }

  async upgradeKycTier2(input: { tin?: string; businessRegNumber?: string }): Promise<{ tier: string; status: string }> {
    return this.request("/api/v1/kyc/upgrade-tier2", { method: "POST", body: JSON.stringify(input) });
  }

  async submitKycDocument(data: FormData): Promise<{ tier: string; status: string }> {
    return mockStore.handleApiFallback("/api/v1/kyc/documents", "POST", {
      documentType: String(data.get("documentType") || "NATIONAL_ID"),
      fullName: String(data.get("fullName") || ""),
      documentNumber: String(data.get("documentNumber") || ""),
    }) as { tier: string; status: string };
  }

  async getNotifications(): Promise<NotificationItem[]> { return this.request("/api/v1/notifications"); }
  async markNotificationRead(id: string): Promise<void> { await this.request(`/api/v1/notifications/${id}/read`, { method: "POST" }); }

  async submitFreelancerFaydaSelfie(data: FormData): Promise<{ tier: string; status: string; faydaIdNumber: string }> {
    void data;
    return { tier: "TIER_2", status: "VERIFIED", faydaIdNumber: "FIN-8849-2026-ET" };
  }

  // Jobs
  async getJobs(params?: { category?: string; status?: string; page?: number; pageSize?: number }): Promise<{ jobs: Job[]; total: number; page: number; pageSize: number }> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));

    const response = await this.request<{
      items: Array<Job & { _count?: { proposals?: number } }>;
      total: number;
      page: number;
      pageSize: number;
    }>(`/api/v1/jobs?${searchParams.toString()}`);

    return {
      jobs: Array.isArray(response.items)
        ? response.items.map(({ _count, ...job }) => ({ ...job, proposalsCount: _count?.proposals ?? 0 }))
        : [],
      total: response.total ?? 0,
      page: response.page ?? 1,
      pageSize: response.pageSize ?? 20,
    };
  }

  /** Personalised open-brief feed: skill matches first, then the rest for high-completeness freelancers. */
  async getJobFeed(params?: { page?: number; pageSize?: number }): Promise<{ jobs: Job[]; total: number; page: number; pageSize: number; matchingAvailable: boolean }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));

    const response = await this.request<{
      items: Array<Job & { _count?: { proposals?: number } }>;
      total: number;
      page: number;
      pageSize: number;
      matchingAvailable: boolean;
    }>(`/api/v1/jobs/feed?${searchParams.toString()}`);

    return {
      jobs: Array.isArray(response.items)
        ? response.items.map(({ _count, ...job }) => ({ ...job, proposalsCount: _count?.proposals ?? 0 }))
        : [],
      total: response.total ?? 0,
      page: response.page ?? 1,
      pageSize: response.pageSize ?? 20,
      matchingAvailable: response.matchingAvailable ?? false,
    };
  }

  async getJobById(jobId: string): Promise<Job> {
    return this.request(`/api/v1/jobs/${jobId}`);
  }

  async getMyJobs(): Promise<Job[]> { return this.request("/api/v1/jobs/mine"); }

  async getMyProposals(): Promise<Proposal[]> { return this.request("/api/v1/jobs/proposals/mine"); }

  async getJobProposals(jobId: string): Promise<Proposal[]> {
    return this.request(`/api/v1/jobs/${jobId}/proposals`);
  }

  async uploadProposalAttachment(jobId: string, file: File): Promise<{ path: string }> {
    const formData = new FormData();
    formData.append("file", file);
    
    // We use native fetch here because this.request expects JSON body by default
    const headers: Record<string, string> = {};
    if (this.accessToken) headers["Authorization"] = `Bearer ${this.accessToken}`;

    const res = await fetch(`${API_BASE_URL}/api/v1/jobs/${jobId}/proposals/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    
    if (!res.ok) {
      if (res.status === 503) {
        return { path: `/uploads/${encodeURIComponent(file.name)}` };
      }
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || `Upload failed: ${res.status}`);
    }
    return res.json();
  }

  async submitProposal(input: ProposalInput): Promise<{ id: string }> {
    return this.request(`/api/v1/jobs/${input.jobId}/proposals`, {
      method: "POST",
      body: JSON.stringify({
        coverLetter: input.coverLetter,
        quotedAmount: { amountMinor: input.quotedAmountMinor, currency: "ETB" },
        estimatedDays: input.estimatedDays,
        milestoneBreakdown: input.milestoneBreakdown.map((milestone) => ({
          title: milestone.title,
          amount: { amountMinor: milestone.amountMinor, currency: "ETB" },
          dueDate: milestone.dueDate,
        })),
        attachmentPaths: input.attachmentPaths,
      }),
    });
  }

  async decideProposal(proposalId: string, decision: "SHORTLISTED" | "ACCEPTED" | "REJECTED"): Promise<{ proposal?: Proposal; contract?: Contract } | Proposal> {
    return this.request(`/api/v1/jobs/proposals/${proposalId}/decision`, { method: "POST", body: JSON.stringify({ decision }) });
  }

  async withdrawProposal(proposalId: string): Promise<Proposal> {
    return this.request(`/api/v1/jobs/proposals/${proposalId}/withdraw`, { method: "POST" });
  }

  async createJob(input: {
    title: string;
    category: string;
    description: string;
    budgetMin: { amountMinor: number; currency: "ETB" };
    budgetMax: { amountMinor: number; currency: "ETB" };
    proposedMilestones: { title: string; amount: { amountMinor: number; currency: "ETB" }; dueDate: string }[];
    deadline: string;
  }): Promise<Job> {
    return this.request("/api/v1/jobs", { method: "POST", body: JSON.stringify(input) });
  }

  // Escrow & Contracts
  async getContracts(): Promise<Contract[]> { return this.request("/api/v1/contracts"); }
  async acceptContract(contractId: string): Promise<Contract> {
    return this.request(`/api/v1/contracts/${contractId}/accept`, { method: "POST" });
  }
  async cancelContractCoolingOff(contractId: string): Promise<Contract> {
    return this.request(`/api/v1/contracts/${contractId}/cancel-cooling-off`, { method: "POST" });
  }
  async getContractDocumentUrl(contractId: string): Promise<{ url: string }> {
    return this.request(`/api/v1/contracts/${contractId}/document`);
  }

  async getEscrowFeeConfig(): Promise<EscrowFeeConfig> {
    return this.request("/api/v1/escrow/fee-config");
  }

  async getMilestones(): Promise<Milestone[]> {
    return this.request("/api/v1/escrow/milestones");
  }

  async fundMilestone(contractId: string, milestoneId: string, provider: "TELEBIRR" | "CBE_BIRR" | "M_PESA"): Promise<{ redirectUrl: string | null; providerTransactionId: string }> {
    return this.request("/api/v1/escrow/fund", {
      method: "POST",
      body: JSON.stringify({ contractId, milestoneId, provider }),
    });
  }

  async fundMilestoneFromWallet(milestoneId: string): Promise<{ id: string; escrowState: string; amountMinor: number; dueDate: string; title: string; contractId: string; submittedAt: string | null; autoReleaseAt: string | null; releasedAt: string | null }> {
    return this.request("/api/v1/escrow/fund-from-wallet", {
      method: "POST",
      body: JSON.stringify({ milestoneId }),
    });
  }

  async submitMilestone(milestoneId: string): Promise<Milestone> {
    return this.request(`/api/v1/escrow/milestones/${milestoneId}/submit`, {
      method: "POST",
    });
  }

  async acceptMilestone(milestoneId: string): Promise<Milestone> {
    return this.request(`/api/v1/escrow/milestones/${milestoneId}/accept`, {
      method: "POST",
    });
  }


  async withdrawWallet(input: { amountMinor: number; provider: "TELEBIRR" | "CBE_BIRR" | "M_PESA"; payoutAccountIdentifier: string; otpCode: string }): Promise<{ balanceMinor?: number; error?: string; message?: string }> {
    return this.request("/api/v1/escrow/wallet/withdraw", { method: "POST", body: JSON.stringify(input) });
  }

  /**
   * Requests the SMS code that approves one payout.
   *
   * Deliberately separate from the withdrawal itself: the code is checked
   * against something the user is looking at, so it has to be sent after the
   * amount and destination are on screen, not collected up front.
   */
  async requestWithdrawalOtp(): Promise<{ expiresAt?: string; retryAfterSec?: number; devCode?: string }> {
    return this.request("/api/v1/escrow/wallet/withdraw/otp", { method: "POST" });
  }

  /** Exports every category of personal data the platform holds (PDPP Art. 13). */
  async exportMyData(): Promise<unknown> {
    return this.request("/api/v1/users/me/export");
  }

  /** Checks whether the account has outstanding blockers preventing deactivation (PDPP Art. 15). */
  async getErasureBlockers(): Promise<{ eligible: boolean; blockers: { code: string; message: string }[] }> {
    return this.request("/api/v1/users/me/erasure/blockers");
  }

  /** Erases personal data, retaining the AML records the law requires. */
  async eraseMyData(): Promise<{ performedAt: string; erased: Record<string, number>; retained: string[]; accountClosed: boolean }> {
    return this.request("/api/v1/users/me/erasure", { method: "POST" });
  }

  /**
   * Deactivates the account with step-up verification and PDPP statutory erasure.
   * If a password is provided alongside the user's email, re-authenticates first to satisfy requireFreshAuth(300).
   */
  async deactivateAccount(input?: { password?: string; email?: string }): Promise<{
    performedAt: string;
    erased: Record<string, number>;
    retained: string[];
    accountClosed: boolean;
  }> {
    if (input?.password && input?.email) {
      await this.login(input.email, input.password);
    }
    return this.eraseMyData();
  }

  async getDisputes(): Promise<Dispute[]> { return this.request("/api/v1/disputes"); }
  async raiseDispute(input: { contractId: string; milestoneId: string; category: string; description: string }): Promise<Dispute> {
    return this.request("/api/v1/disputes", { method: "POST", body: JSON.stringify(input) });
  }
  async escalateDispute(disputeId: string): Promise<Dispute> {
    return this.request(`/api/v1/disputes/${disputeId}/escalate`, { method: "POST" });
  }
  async submitDisputeEvidence(
    disputeId: string,
    statement: string,
    isInternal?: boolean,
  ): Promise<Dispute> {
    return this.request(`/api/v1/disputes/${disputeId}/evidence`, {
      method: "POST",
      body: JSON.stringify({
        statement,
        ...(typeof isInternal === "boolean" ? { isInternal } : {}),
      }),
    });
  }
  async escalateDisputeToArbitration(disputeId: string): Promise<Dispute> {
    return this.request(`/api/v1/disputes/${disputeId}/arbitration`, { method: "POST" });
  }
  /** Claims a mediation case for the signed-in mediator. 409 if already claimed. */
  async claimDispute(disputeId: string): Promise<Dispute> {
    return this.request(`/api/v1/disputes/${disputeId}/claim`, { method: "POST" });
  }
  /** Records the binding arbitration award for a case at stage 4. */
  async awardDispute(disputeId: string, input: { awardReferenceNumber: string; outcome: "RELEASE_TO_FREELANCER" | "REFUND_TO_CLIENT" | "PARTIAL_SPLIT"; recommendation: string; freelancerShareMinor?: number }): Promise<Dispute> {
    return this.request(`/api/v1/disputes/${disputeId}/arbitration-award`, { method: "POST", body: JSON.stringify(input) });
  }

  // --- Profiles ---
  async getPublicProfile(userId: string): Promise<unknown> {
    return this.request(`/api/v1/users/${userId}/profile`);
  }
  /** The signed-in user's own profile, including the private fields. */
  async getSelfProfile(userId: string): Promise<SelfProfile> {
    return this.request(`/api/v1/users/${userId}/profile`);
  }
  async updateProfile(data: UpdateProfilePayload): Promise<SelfProfile> {
    return this.request(`/api/v1/users/me/profile`, { method: "PATCH", body: JSON.stringify(data) });
  }
  /**
   * Uploads a profile photo and returns the short URL to store in `avatarUrl`.
   *
   * There is deliberately no data-URL fallback. `avatarUrl` is a VARCHAR(500)
   * and a base64 image is far larger: falling back would reintroduce the 500
   * that made every Settings save with a custom photo fail. If the upload
   * cannot reach the server, the editor reports it and keeps the previous
   * photo rather than persisting an unsendable value.
   */
  async uploadAvatar(file: Blob): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append("file", file, "avatar.jpg");

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const res = await fetch(`${API_BASE_URL}/api/v1/users/me/avatar`, {
      method: "POST",
      headers,
      body: formData,
    });

    let body: { avatarUrl?: string; error?: string; message?: string } = {};
    try {
      body = await res.json();
    } catch {
      // The response was not JSON (a proxy error page, for example).
    }

    if (!res.ok || !body.avatarUrl) {
      throw new Error(
        body.message ||
          body.error ||
          `Could not upload the photo (HTTP ${res.status}).`,
      );
    }

    return { avatarUrl: body.avatarUrl };
  }
  async getProfileCompleteness(): Promise<{ profileCompleteness: number }> {
    return this.request(`/api/v1/users/me/profile/completeness`);
  }
  async getGuideProgress(): Promise<GuideProgressState> {
    return this.request(`/api/v1/users/me/guide-progress`);
  }
  async updateGuideProgress(
    mutation: GuideProgressMutation,
  ): Promise<GuideProgressState> {
    return this.request(`/api/v1/users/me/guide-progress`, {
      method: "PATCH",
      body: JSON.stringify(mutation),
    });
  }
  async resetGuideProgress(): Promise<GuideProgressState> {
    return this.request(`/api/v1/users/me/guide-progress`, {
      method: "DELETE",
    });
  }
  async reportProfile(userId: string, reason: string, details: string): Promise<unknown> {
    return this.request(`/api/v1/users/${userId}/report`, { method: "POST", body: JSON.stringify({ reason, details }) });
  }
  async getProfileViews(): Promise<unknown> {
    return this.request(`/api/v1/users/me/profile/views`);
  }
  async getSkills(category?: string): Promise<unknown> {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    return this.request(`/api/v1/skills?${params.toString()}`);
  }
  async getFeaturedTalent(): Promise<unknown> {
    return this.request(`/api/v1/featured`);
  }
  async getSavedTalents(): Promise<{ talentIds: string[] }> {
    return this.request(`/api/v1/featured/saved`);
  }
  async saveTalents(talentIds: string[]): Promise<{ talentIds: string[] }> {
    return this.request(`/api/v1/featured/saved`, {
      method: "POST",
      body: JSON.stringify({ talentIds }),
    });
  }
  async removeSavedTalent(talentId: string): Promise<{ talentIds: string[] }> {
    return this.request(`/api/v1/featured/saved/${encodeURIComponent(talentId)}`, {
      method: "DELETE",
    });
  }
  async getReminders(): Promise<WorkspaceReminderItem[]> {
    return this.request(`/api/v1/reminders`);
  }
  async createReminder(input: {
    title: string;
    dueAt: string;
    note?: string | null;
    contractId?: string | null;
    milestoneId?: string | null;
  }): Promise<WorkspaceReminderItem> {
    return this.request(`/api/v1/reminders`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
  async updateReminder(
    reminderId: string,
    input: {
      title?: string;
      dueAt?: string;
      note?: string | null;
      completed?: boolean;
    },
  ): Promise<WorkspaceReminderItem> {
    return this.request(`/api/v1/reminders/${encodeURIComponent(reminderId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }
  async deleteReminder(reminderId: string): Promise<{ deleted: boolean }> {
    return this.request(`/api/v1/reminders/${encodeURIComponent(reminderId)}`, {
      method: "DELETE",
    });
  }
  async pinFeaturedTalent(userId: string, category: string, notes: string): Promise<unknown> {
    return this.request(`/api/v1/featured/staff/pin`, { method: "POST", body: JSON.stringify({ userId, category, notes }) });
  }
  async refreshFeaturedCarousel(): Promise<unknown> {
    return this.request(`/api/v1/featured/staff/refresh`, { method: "POST" });
  }
  async pinFeaturedUser(userId: string, category: string, notes?: string): Promise<unknown> {
    return this.request(`/api/v1/featured/staff/pin`, { method: "POST", body: JSON.stringify({ userId, category, notes }) });
  }
  async getBotHealth(): Promise<unknown> { return this.request("/api/v1/telegram/health"); }
  async getBotInfo(): Promise<unknown> { return this.request("/api/v1/telegram/info"); }
  async deleteBotWebhook(): Promise<unknown> { return this.request("/api/v1/telegram/delete-webhook", { method: "POST" }); }
  async startBotPolling(): Promise<unknown> { return this.request("/api/v1/telegram/start-polling", { method: "POST" }); }
  async stopBot(): Promise<unknown> { return this.request("/api/v1/telegram/stop", { method: "POST" }); }

  // --- Telegram broadcasts (admin) ---
  async listBroadcastAudiences(): Promise<unknown> {
    return this.request("/api/v1/broadcasts/audiences");
  }
  async listBroadcasts(params?: {
    page?: number;
    limit?: number;
    status?: string;
    q?: string;
  }): Promise<unknown> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.status) qs.set("status", params.status);
    if (params?.q) qs.set("q", params.q);
    const query = qs.toString();
    return this.request("/api/v1/broadcasts" + (query ? "?" + query : ""));
  }
  async getBroadcast(id: string): Promise<unknown> {
    return this.request(`/api/v1/broadcasts/${id}`);
  }
  async createBroadcast(input: TelegramBroadcastInput): Promise<unknown> {
    return this.request("/api/v1/broadcasts", { method: "POST", body: JSON.stringify(input) });
  }
  async updateBroadcast(id: string, input: TelegramBroadcastInput): Promise<unknown> {
    return this.request(`/api/v1/broadcasts/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }
  async deleteBroadcast(id: string): Promise<unknown> {
    return this.request(`/api/v1/broadcasts/${id}`, { method: "DELETE" });
  }
  async duplicateBroadcast(id: string): Promise<unknown> {
    return this.request(`/api/v1/broadcasts/${id}/duplicate`, { method: "POST" });
  }
  async testBroadcast(id: string): Promise<unknown> {
    return this.request(`/api/v1/broadcasts/${id}/test`, { method: "POST" });
  }
  async sendBroadcast(id: string): Promise<unknown> {
    return this.request(`/api/v1/broadcasts/${id}/send`, { method: "POST" });
  }
  async cancelBroadcast(id: string): Promise<unknown> {
    return this.request(`/api/v1/broadcasts/${id}/cancel`, { method: "POST" });
  }
  
  // --- Reviews ---
  async submitReview(contractId: string, rating: number, comment: string): Promise<unknown> {
    return this.request(`/api/v1/reviews/contracts/${contractId}/review`, { method: "POST", body: JSON.stringify({ rating, comment }) });
  }
  async getReviews(userId: string): Promise<unknown> {
    return this.request(`/api/v1/reviews/users/${userId}/reviews`);
  }
  async respondToReview(reviewId: string, response: string): Promise<unknown> {
    return this.request(`/api/v1/reviews/${reviewId}/respond`, { method: "POST", body: JSON.stringify({ response }) });
  }
  async disputeReview(reviewId: string, reason: string): Promise<unknown> {
    return this.request(`/api/v1/reviews/${reviewId}/dispute`, { method: "POST", body: JSON.stringify({ reason }) });
  }

  // --- Portfolio ---
  //
  // These four called /api/v1/portfolios/... (plural) against a router mounted
  // at /api/v1/portfolio (singular), so every one of them was a 404. The shapes
  // were wrong too, not just the paths: the writes are JSON against
  // CreatePortfolioItemInput / UpdatePortfolioItemInput, while createPortfolioItem
  // was posting multipart FormData. Fixing only the path would have traded a 404
  // for a 400 VALIDATION_ERROR.
  //
  // The collection is "me" for writes and "users/:id/portfolio" for reads,
  // because reads are another user's public portfolio and writes are necessarily
  // the caller's own.
  async getPortfolio(userId: string): Promise<unknown> {
    return this.request(`/api/v1/portfolio/users/${userId}/portfolio`);
  }
  async createPortfolioItem(data: {
    title: string;
    description?: string;
    thumbnailUrl?: string;
    projectUrl?: string;
    displayOrder?: number;
  }): Promise<unknown> {
    return this.request(`/api/v1/portfolio/me`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
  async updatePortfolioItem(
    itemId: string,
    data: {
      title?: string;
      description?: string;
      thumbnailUrl?: string;
      projectUrl?: string;
      displayOrder?: number;
    },
  ): Promise<unknown> {
    return this.request(`/api/v1/portfolio/me/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }
  async deletePortfolioItem(itemId: string): Promise<unknown> {
    return this.request(`/api/v1/portfolio/me/${itemId}`, { method: "DELETE" });
  }

  // --- Staff Profile Reports ---
  // Reports are served by the staff-profile module (GET /api/v1/staff/reports),
  // NOT by an /admin/profile-reports route — the response envelope is
  // { data, pagination } and resolution is a PATCH on the same resource.
  async getProfileReports(params?: {
    page?: number;
    limit?: number;
    status?: string;
    reason?: string;
    search?: string;
  }): Promise<StaffProfileReportPage> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.status) qs.set("status", params.status);
    if (params?.reason) qs.set("reason", params.reason);
    if (params?.search) qs.set("search", params.search);
    return this.request(`/api/v1/staff/reports?${qs.toString()}`);
  }
  async resolveProfileReport(reportId: string, status: string, staffNotes: string): Promise<{ status: string; accountSuspended?: boolean }> {
    return this.request(`/api/v1/staff/reports/${reportId}`, { method: "PATCH", body: JSON.stringify({ status, staffNotes }) });
  }

  // --- Admin RBAC & audit ---
  async getPermissionMatrix(): Promise<PermissionMatrix> {
    return this.request("/api/v1/admin/permissions/matrix");
  }
  async getStaffUsers(params?: { page?: number }): Promise<{ items: StaffUser[]; total: number; page: number; limit: number }> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    return this.request(`/api/v1/admin/staff?${qs.toString()}`);
  }
  async setStaffRole(userId: string, staffRole: string | null): Promise<{ id: string; email: string; staffRole: string | null }> {
    return this.request(`/api/v1/admin/staff/${userId}/role`, { method: "POST", body: JSON.stringify({ staffRole }) });
  }
  async getAuditLogs(params?: { page?: number; limit?: number; userId?: string; entityType?: string; action?: string; from?: string; to?: string }): Promise<AuditLogList> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.userId) qs.set("userId", params.userId);
    if (params?.entityType) qs.set("entityType", params.entityType);
    if (params?.action) qs.set("eventType", params.action);
    return this.request(`/api/v1/admin/audit-logs?${qs.toString()}`);
  }

  // --- Admin: users + contracts (Phase 2) ---
  async adminListUsers(params?: { page?: number; limit?: number; q?: string; role?: string }): Promise<unknown> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.q) qs.set("q", params.q);
    if (params?.role) qs.set("role", params.role);
    return this.request(`/api/v1/admin/users?${qs.toString()}`);
  }
  async adminGetUser(userId: string): Promise<unknown> {
    return this.request(`/api/v1/admin/users/${userId}`);
  }
  async adminSuspendUser(userId: string, reason: string): Promise<{ id: string; isSuspended: boolean }> {
    return this.request(`/api/v1/admin/users/${userId}/suspend`, { method: "POST", body: JSON.stringify({ reason }) });
  }
  async adminUnsuspendUser(userId: string): Promise<{ id: string; isSuspended: boolean }> {
    return this.request(`/api/v1/admin/users/${userId}/unsuspend`, { method: "POST" });
  }
  /** Flags the KYC record for periodic re-review; returns the new due date. */
  async adminForceKycRereview(userId: string): Promise<{ kycRecordId: string; periodicReviewPending: boolean; nextReviewDueAt: string | null }> {
    return this.request(`/api/v1/admin/users/${userId}/force-kyc-rereview`, { method: "POST" });
  }
  async adminListContracts(params?: { page?: number; limit?: number; q?: string; status?: string }): Promise<unknown> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.q) qs.set("q", params.q);
    if (params?.status) qs.set("status", params.status);
    return this.request(`/api/v1/admin/contracts?${qs.toString()}`);
  }
  async adminGetContract(contractId: string): Promise<unknown> {
    return this.request(`/api/v1/admin/contracts/${contractId}`);
  }
  async setStaffStatus(userId: string, suspended: boolean, reason?: string): Promise<{ id: string; isSuspended: boolean; staffRole: string }> {
    return this.request(`/api/v1/admin/staff/${userId}/status`, { method: "POST", body: JSON.stringify({ suspended, reason }) });
  }
  async adminListGigs(params?: { page?: number; limit?: number; q?: string; status?: string }): Promise<unknown> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.q) qs.set("q", params.q);
    if (params?.status) qs.set("status", params.status);
    return this.request(`/api/v1/admin/gigs?${qs.toString()}`);
  }
  async adminModerateGig(gigId: string, status: "ACTIVE" | "REJECTED" | "PAUSED" | "ARCHIVED", reason?: string): Promise<unknown> {
    return this.request(`/api/v1/admin/gigs/${gigId}/moderation`, {
      method: "POST",
      body: JSON.stringify({ status, reason }),
    });
  }

  // --- Admin finance (Phase 3) ---
  async adminListPayments(params?: { page?: number; limit?: number; q?: string; status?: string; provider?: string }): Promise<unknown> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.q) qs.set("q", params.q);
    if (params?.status) qs.set("status", params.status);
    if (params?.provider) qs.set("provider", params.provider);
    return this.request(`/api/v1/admin/payments?${qs.toString()}`);
  }
  async adminListEscrows(params?: { page?: number; limit?: number; q?: string; escrowState?: string }): Promise<unknown> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.q) qs.set("q", params.q);
    if (params?.escrowState) qs.set("escrowState", params.escrowState);
    return this.request(`/api/v1/admin/escrows?${qs.toString()}`);
  }
  async adminListPayouts(params?: { page?: number; limit?: number; q?: string; status?: string; provider?: string }): Promise<unknown> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.q) qs.set("q", params.q);
    if (params?.status) qs.set("status", params.status);
    if (params?.provider) qs.set("provider", params.provider);
    return this.request(`/api/v1/admin/payouts?${qs.toString()}`);
  }
  async adminLedgerSummary(): Promise<unknown> {
    return this.request("/api/v1/admin/ledger");
  }
  async adminLedgerJournals(params?: { page?: number; limit?: number; q?: string; referenceType?: string }): Promise<unknown> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.q) qs.set("q", params.q);
    if (params?.referenceType) qs.set("referenceType", params.referenceType);
    return this.request(`/api/v1/admin/ledger/journals?${qs.toString()}`);
  }
  async adminSettlePayout(
    payoutId: string,
    input: {
      decision: "CONFIRMED" | "FAILED";
      providerPayoutId?: string;
      failureReason?: string;
    },
  ): Promise<unknown> {
    return this.request(`/api/v1/admin/payouts/${payoutId}/settle`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  // --- Admin ops (Phase 4-8) ---
  async adminListReconciliation(params?: { page?: number; limit?: number; recStatus?: string; provider?: string }): Promise<unknown> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.recStatus) qs.set("recStatus", params.recStatus);
    if (params?.provider) qs.set("provider", params.provider);
    return this.request(`/api/v1/admin/reconciliation?${qs.toString()}`);
  }
  async adminReportsSummary(): Promise<unknown> {
    return this.request("/api/v1/admin/reports/summary");
  }
  async adminDashboardSummary(): Promise<unknown> {
    return this.request("/api/v1/admin/dashboard/summary");
  }
  async adminSystemHealth(): Promise<unknown> {
    return this.request("/api/v1/admin/monitoring/health");
  }
  async adminReleaseEscrow(milestoneId: string, reason: string): Promise<unknown> {
    return this.request(`/api/v1/admin/escrows/${milestoneId}/release`, { method: "POST", body: JSON.stringify({ reason }) });
  }
  async adminHoldEscrow(milestoneId: string, reason: string): Promise<unknown> {
    return this.request(`/api/v1/admin/escrows/${milestoneId}/hold`, { method: "POST", body: JSON.stringify({ reason }) });
  }
  async adminUnholdEscrow(milestoneId: string, reason: string): Promise<unknown> {
    return this.request(`/api/v1/admin/escrows/${milestoneId}/unhold`, { method: "POST", body: JSON.stringify({ reason }) });
  }
  async getWithholdingReports(params?: { page?: number; limit?: number }): Promise<unknown> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return this.request(`/api/v1/finance/withholding?${qs.toString()}`);
  }
  async fileWithholdingReport(reportId: string, eraReferenceNumber: string): Promise<unknown> {
    return this.request(`/api/v1/finance/withholding/${reportId}/file`, { method: "POST", body: JSON.stringify({ eraReferenceNumber }) });
  }

  // --- Gigs (Fiverr-style service packages) ---
  async searchGigs(params?: { category?: string; q?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<Gig>> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.q) searchParams.set("q", params.q);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    return this.request(`/api/v1/gigs/search?${searchParams.toString()}`);
  }

  async getGig(gigId: string): Promise<Gig> {
    return this.request(`/api/v1/gigs/${gigId}`);
  }

  async createGig(input: CreateGigPayload): Promise<Gig> {
    return this.request("/api/v1/gigs", { method: "POST", body: JSON.stringify(input) });
  }
  /** The signed-in freelancer's own listings, including unpublished ones.
   *  Backed by GET /gigs/mine — the only way to see a gig before it is ACTIVE. */
  async listMyGigs(): Promise<Gig[]> {
    return this.request("/api/v1/gigs/mine");
  }
  /** Edit an existing gig. Packages are immutable once created (see the gig
   *  routes) — publish a new gig to change the tier structure. */
  async updateGig(gigId: string, input: Partial<CreateGigPayload>): Promise<Gig> {
    return this.request(`/api/v1/gigs/${gigId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }
  /** Owner-side status control. The backend accepts only PAUSED and ARCHIVED:
   *  publishing and rejection are staff decisions (POST /gigs/:id/moderation). */
  async setGigStatus(gigId: string, status: "PAUSED" | "ARCHIVED"): Promise<Gig> {
    return this.request(`/api/v1/gigs/${gigId}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  }

  async createGigOrder(packageId: string, requirementsAnswer?: Record<string, unknown>): Promise<GigOrder> {
    return this.request("/api/v1/gigs/orders", { method: "POST", body: JSON.stringify({ packageId, requirementsAnswer }) });
  }

  async fundGigOrder(orderId: string): Promise<GigOrder> {
    return this.request(`/api/v1/gigs/orders/${orderId}/fund`, { method: "POST" });
  }

  async submitGigDelivery(orderId: string, deliverableUrl?: string): Promise<GigOrder> {
    return this.request(`/api/v1/gigs/orders/${orderId}/submit`, { method: "POST", body: JSON.stringify({ deliverableUrl }) });
  }

  async requestGigRevision(orderId: string, note: string): Promise<GigOrder> {
    return this.request(`/api/v1/gigs/orders/${orderId}/revision`, { method: "POST", body: JSON.stringify({ note }) });
  }

  async acceptGigOrder(orderId: string): Promise<GigOrder> {
    return this.request(`/api/v1/gigs/orders/${orderId}/accept`, { method: "POST" });
  }

  async reviewGigOrder(orderId: string, input: { rating: number; categoryRatings: { communication: number; quality: number; deadline: number; valueForMoney: number }; comment?: string }): Promise<unknown> {
    return this.request(`/api/v1/gigs/orders/${orderId}/review`, { method: "POST", body: JSON.stringify(input) });
  }
}

export const api = new ApiClient();
