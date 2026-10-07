
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
  userId: string;
  amountMinor: number;
  provider: "TELEBIRR" | "CBE_BIRR" | "M_PESA";
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

export interface Milestone {
  id: string;
  contractId: string;
  title: string;
  amountMinor: number;
  dueDate: string;
  escrowState: string;
  submittedAt: string | null;
  autoReleaseAt: string | null;
  releasedAt: string | null;
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

export interface SmartRepliesResponse {
  suggestions: string[];
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
class ApiClient {
  private accessToken: string | null = typeof window !== "undefined" ? window.localStorage.getItem("yekis-api-token") : null;
  private refreshToken: string | null = typeof window !== "undefined" ? window.localStorage.getItem("yekis-refresh-token") : null;
  private refreshPromise: Promise<void> | null = null;

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

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
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

    let response = await performRequest(this.accessToken);

    // Access token expired â†’ attempt a silent refresh, then retry the request
    // once. Refresh itself never goes through this branch to avoid a loop.
    if (
      response.status === 401 &&
      this.refreshToken &&
      !path.includes("/auth/")
    ) {
      try {
        await this.tryRefresh();
        response = await performRequest(this.accessToken);
      } catch {
        // tryRefresh already cleared the session on failure â€” let the original
        // 401 surface below (app will re-render the login screen).
      }
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Too many requests. Please wait a moment before trying again.");
      }
      let error: {
        message?: string;
        error?: string;
        // F-02: the KYC gate returns a machine-readable next step so the UI can
        // offer "Verify your identity" instead of rendering a dead end.
        nextAction?: { type: string; path: string };
      };
      try {
        error = await response.json();
      } catch {
        const text = await response.text().catch(() => "");
        error = { error: text || `HTTP ${response.status}` };
      }
      const thrown = new Error(
        error.message || error.error || `HTTP ${response.status}`,
      ) as Error & {
        code?: string;
        nextAction?: { type: string; path: string };
      };
      thrown.code = error.error;
      if (error.nextAction) thrown.nextAction = error.nextAction;
      throw thrown;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  /**
   * Request using an explicit bearer token instead of the session token.
   *
   * Used by the guest support widget, which holds a conversation-scoped token
   * rather than a session. Deliberately skips the refresh/retry path: a guest
   * token cannot be refreshed, and silently retrying with `this.accessToken`
   * would either leak the visitor's session into a guest call or 401.
   */
  private async requestWithToken<T>(
    path: string,
    token: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
      Authorization: `Bearer ${token}`,
    };

    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Too many requests. Please wait a moment before trying again.");
      }
      let error: { message?: string; error?: string };
      try {
        error = await response.json();
      } catch {
        const text = await response.text().catch(() => "");
        error = { error: text || `HTTP ${response.status}` };
      }
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) return {} as T;
    return response.json();
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
  async loginWithTelegram(authData: string | Record<string, unknown>, role?: string): Promise<TelegramAuthResponse> {
    const body =
      typeof authData === "string"
        ? { initData: authData, role }
        : { ...authData, role };
    return this.request("/api/v1/auth/telegram", {
      method: "POST",
      body: JSON.stringify(body),
    });
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
    return this.request("/api/v1/auth/telegram/link", {
      method: "POST",
      body: JSON.stringify({ initData }),
    });
  }

  async unlinkTelegram(): Promise<{ unlinked: boolean }> {
    return this.request("/api/v1/auth/telegram/link", { method: "DELETE" });
  }

  /**
   * Redeems the one-time code the Telegram bot mints via /login. This is the
   * sign-in path that works when the Login Widget cannot render (domain not
   * registered with @BotFather, or telegram.org blocked).
   */
  async loginWithTelegramCode(code: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    return this.request("/api/v1/auth/telegram/code", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  async loginWithGoogleOAuth(idToken: string, role?: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    return this.request("/api/v1/auth/oauth/google", {
      method: "POST",
      body: JSON.stringify({ idToken, role }),
    });
  }

  async loginWithAppleOAuth(idToken: string, firstName?: string, lastName?: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    return this.request("/api/v1/auth/oauth/apple", {
      method: "POST",
      body: JSON.stringify({ idToken, firstName, lastName }),
    });
  }

  async loginWithFacebookOAuth(accessToken: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    return this.request("/api/v1/auth/oauth/facebook", {
      method: "POST",
      body: JSON.stringify({ accessToken }),
    });
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

  async loginWithMobile(input: { phone?: string; email?: string; identifier?: string; password: string }): Promise<{ accessToken: string; refreshToken?: string; user?: AuthUser }> {
    return this.request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
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
    return this.request("/api/v1/chat/direct", {
      method: "POST",
      body: JSON.stringify({ recipientId, subject }),
    });
  }

  async getChatMessages(conversationId: string): Promise<ChatMessage[]> {
    return this.request(`/api/v1/chat/conversations/${conversationId}/messages`);
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

  async getSmartReplies(conversationId: string): Promise<SmartRepliesResponse> {
    return this.request(`/api/v1/chat/conversations/${conversationId}/assistant/suggest-replies`, {
      method: "POST",
    });
  }

  async summarizeChat(conversationId: string): Promise<ConversationSummaryResponse> {
    return this.request(`/api/v1/chat/conversations/${conversationId}/assistant/summarize`, {
      method: "POST",
    });
  }

  async extractDealTerms(conversationId: string): Promise<DealTermsResponse> {
    return this.request(`/api/v1/chat/conversations/${conversationId}/assistant/extract-deal`, {
      method: "POST",
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

  async resolveDispute(disputeId: string, input: { outcome: "RELEASE_TO_FREELANCER" | "REFUND_TO_CLIENT" | "PARTIAL_SPLIT"; recommendation: string; freelancerShareMinor?: number }): Promise<Dispute> {
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

  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    return this.request("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  }

  async register(input: {
    email: string;
    phone: string;
    password: string;
    languagePreference: "am" | "en";
    /** BOTH is a real UserRole (see the Prisma enum and RegisterInput). */
    role: "CLIENT" | "FREELANCER" | "BOTH";
    dateOfBirth: string;
    consents: { kycDataProcessing: true; financialDataProcessing: true; platformNotifications: boolean; marketingCommunications: boolean; analytics: boolean };
  }): Promise<{ id: string; ucid: string }> {
    return this.request("/api/v1/auth/register", { method: "POST", body: JSON.stringify(input) });
  }

  // Wallet / Top-ups
  async getWallet(): Promise<WalletResponse> {
    return this.request("/api/v1/escrow/wallet");
  }

  async getTopUpRequests(): Promise<TopUpRequest[]> {
    return this.request("/api/v1/wallet/topups");
  }

  async getTopUpReceiptUrl(topUpId: string): Promise<{ url: string }> {
    return this.request(`/api/v1/wallet/topups/${topUpId}/receipt-url`);
  }

  async initiateCheckoutTopUp(amountMinor: number, provider: string): Promise<{ redirectUrl: string; topUpId: string }> {
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

  async createTopUpRequest(data: FormData): Promise<TopUpRequest> {
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/wallet/topups`, {
      method: "POST",
      headers,
      body: data,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "UNKNOWN_ERROR" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async attachTopUpReceipt(topUpId: string, data: FormData): Promise<TopUpRequest> {
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/wallet/topups/${topUpId}/attach-receipt`, {
      method: "POST",
      headers,
      body: data,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "UNKNOWN_ERROR" }));
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
    }

    return response.json();
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
    const headers: Record<string, string> = {};
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
    const response = await fetch(`${API_BASE_URL}/api/v1/kyc/documents`, { method: "POST", headers, body: data });
    if (!response.ok) { const error = await response.json().catch(() => ({ error: "UNKNOWN_ERROR" })); throw new Error(error.message || error.error || `HTTP ${response.status}`); }
    return response.json();
  }

  async getNotifications(): Promise<NotificationItem[]> { return this.request("/api/v1/notifications"); }
  async markNotificationRead(id: string): Promise<void> { await this.request(`/api/v1/notifications/${id}/read`, { method: "POST" }); }

  async submitFreelancerFaydaSelfie(data: FormData): Promise<{ tier: string; status: string; faydaIdNumber: string }> {
    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/kyc/freelancer-fayda-selfie`, {
      method: "POST",
      headers,
      body: data,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "UNKNOWN_ERROR" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
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


  async withdrawWallet(input: { amountMinor: number; provider: "TELEBIRR" | "CBE_BIRR" | "M_PESA"; payoutAccountIdentifier: string }): Promise<{ balanceMinor?: number; error?: string; message?: string }> {
    return this.request("/api/v1/escrow/wallet/withdraw", { method: "POST", body: JSON.stringify(input) });
  }

  async getDisputes(): Promise<Dispute[]> { return this.request("/api/v1/disputes"); }
  async raiseDispute(input: { contractId: string; milestoneId: string; category: string; description: string }): Promise<Dispute> {
    return this.request("/api/v1/disputes", { method: "POST", body: JSON.stringify(input) });
  }
  async escalateDispute(disputeId: string): Promise<Dispute> {
    return this.request(`/api/v1/disputes/${disputeId}/escalate`, { method: "POST" });
  }
  async submitDisputeEvidence(disputeId: string, statement: string): Promise<Dispute> {
    return this.request(`/api/v1/disputes/${disputeId}/evidence`, { method: "POST", body: JSON.stringify({ statement }) });
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
  async getProfileCompleteness(): Promise<{ profileCompleteness: number }> {
    return this.request(`/api/v1/users/me/profile/completeness`);
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
  async getPortfolio(userId: string): Promise<unknown> {
    return this.request(`/api/v1/portfolios/${userId}`);
  }
  async createPortfolioItem(data: FormData): Promise<unknown> {
    const headers: Record<string, string> = {};
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
    const response = await fetch(`${API_BASE_URL}/api/v1/portfolios`, { method: "POST", headers, body: data });
    if (!response.ok) { const error = await response.json().catch(() => ({ error: "UNKNOWN_ERROR" })); throw new Error(error.message || error.error || `HTTP ${response.status}`); }
    return response.json();
  }
  async updatePortfolioItem(itemId: string, data: unknown): Promise<unknown> {
    return this.request(`/api/v1/portfolios/${itemId}`, { method: "PATCH", body: JSON.stringify(data) });
  }
  async deletePortfolioItem(itemId: string): Promise<unknown> {
    return this.request(`/api/v1/portfolios/${itemId}`, { method: "DELETE" });
  }

  // --- Staff Profile Reports ---
  // Reports are served by the staff-profile module (GET /api/v1/staff/reports),
  // NOT by an /admin/profile-reports route — the response envelope is
  // { data, pagination } and resolution is a PATCH on the same resource.
  async getProfileReports(params?: { page?: number; limit?: number }): Promise<StaffProfileReportPage> {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    return this.request(`/api/v1/staff/reports?${qs.toString()}`);
  }
  async resolveProfileReport(reportId: string, status: string, staffNotes: string): Promise<unknown> {
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
  async adminSettlePayout(payoutId: string, input: { decision: "CONFIRMED" | "FAILED"; providerPayoutId?: string; failureReason?: string }): Promise<unknown> {
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
