
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

export interface TopUpRequest {
  id: string;
  userId: string;
  amountMinor: number;
  provider: "TELEBIRR" | "CBE_BIRR";
  senderName: string;
  referenceNumber: string;
  receiptPath: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
}

export interface TopUpQueueItem {
  id: string;
  userId: string;
  provider: "TELEBIRR" | "CBE_BIRR" | "CHAPA";
  amountMinor: number;
  referenceNumber: string;
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

export interface NotificationItem { id: string; type: string; message: string; isRead: boolean; createdAt: string; }

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
  contract?: { id: string } | null;
}

export interface ProposalInput {
  jobId: string;
  coverLetter: string;
  quotedAmountMinor: number;
  estimatedDays: number;
  milestoneBreakdown: { title: string; amountMinor: number; dueDate: string }[];
}

export interface Proposal {
  id: string;
  jobId: string;
  freelancerId: string;
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
}

export interface ChatConversation {
  id: string;
  subject: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  latestMessage: { body: string; createdAt: string; senderId: string } | null;
  unread: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender: { id: string; role: string; staffRole: string | null };
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";


// === MAIN FUNCTIONS ===
class ApiClient {
  private accessToken: string | null = typeof window !== "undefined" ? window.localStorage.getItem("yekis-api-token") : null;

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

  clearToken() {
    this.setToken(null);
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "UNKNOWN_ERROR" }));
      throw new Error(error.message || error.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Auth
  async loginWithTelegram(initData: string, role?: string): Promise<TelegramAuthResponse> {
    return this.request("/api/v1/auth/telegram", {
      method: "POST",
      body: JSON.stringify({ initData, role }),
    });
  }

  // ---------- Social sign-in (server verifies provider credentials) ----------

  async getOAuthProviders(): Promise<{
    google: boolean;
    apple: boolean;
    facebook: boolean;
    telegram: boolean;
  }> {
    return this.request("/api/v1/auth/oauth/providers", { method: "GET" });
  }

  async loginWithGoogleOAuth(idToken: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    return this.request("/api/v1/auth/oauth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
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

  async createGuestSupport(email: string, body: string): Promise<{ id: string; subject: string; status: string; assignedStaff?: { id: string; name: string } | null }> {
    return this.request("/api/v1/chat/guest", { method: "POST", body: JSON.stringify({ email, body }) });
  }

  async getChatMessages(conversationId: string): Promise<ChatMessage[]> {
    return this.request(`/api/v1/chat/conversations/${conversationId}/messages`);
  }

  async sendChatMessage(conversationId: string, body: string): Promise<ChatMessage> {
    return this.request(`/api/v1/chat/conversations/${conversationId}/messages`, { method: "POST", body: JSON.stringify({ body }) });
  }

  async markChatRead(conversationId: string): Promise<{ ok: boolean }> {
    return this.request(`/api/v1/chat/conversations/${conversationId}/read`, { method: "POST" });
  }

  async getStaffConversations(params?: { page?: number; pageSize?: number; search?: string; status?: string }): Promise<PaginatedResponse<StaffConversation>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    return this.request(`/api/v1/chat/admin/conversations?${searchParams.toString()}`);
  }

  async setConversationStatus(conversationId: string, status: "OPEN" | "CLOSED"): Promise<StaffConversation> {
    return this.request(`/api/v1/chat/admin/conversations/${conversationId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
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
  async fileStr(flagId: string, reviewNotes: string, strReferenceNumber: string): Promise<TransactionFlag> {
    return this.request(`/api/v1/tms/${flagId}/file-str`, { method: "POST", body: JSON.stringify({ reviewNotes, strReferenceNumber }) });
  }
  async dismissFlag(flagId: string, reviewNotes: string): Promise<TransactionFlag> {
    return this.request(`/api/v1/tms/${flagId}/dismiss`, { method: "POST", body: JSON.stringify({ reviewNotes }) });
  }

  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    return this.request("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  }

  async register(input: {
    email: string;
    phone: string;
    password: string;
    languagePreference: "am" | "en";
    role: "CLIENT" | "FREELANCER";
    dateOfBirth: string;
    consents: { kycDataProcessing: true; marketingCommunications: boolean; analytics: boolean };
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

  // Escrow
  async getContracts(): Promise<Contract[]> { return this.request("/api/v1/contracts"); }
  async acceptContract(contractId: string): Promise<Contract> {
    return this.request(`/api/v1/contracts/${contractId}/accept`, { method: "POST" });
  }
  async getContractDocumentUrl(contractId: string): Promise<{ url: string }> {
    return this.request(`/api/v1/contracts/${contractId}/document`);
  }

  async getMilestones(): Promise<Milestone[]> {
    return this.request("/api/v1/escrow/milestones");
  }

  async fundMilestone(contractId: string, milestoneId: string, provider: "TELEBIRR" | "CHAPA" | "CBE_BIRR"): Promise<{ redirectUrl: string | null; providerTransactionId: string }> {
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


  async withdrawWallet(input: { amountMinor: number; provider: "TELEBIRR" | "CHAPA" | "CBE_BIRR"; payoutAccountIdentifier: string }): Promise<{ balanceMinor?: number; error?: string; message?: string }> {
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

  // --- Profiles ---
  async getPublicProfile(userId: string): Promise<unknown> {
    return this.request(`/api/v1/users/${userId}/profile`);
  }
  async updateProfile(data: unknown): Promise<unknown> {
    return this.request(`/api/v1/users/me/profile`, { method: "PATCH", body: JSON.stringify(data) });
  }
  async getProfileCompleteness(): Promise<unknown> {
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
    return this.request(`/api/v1/profiles/featured/refresh`, { method: "POST" });
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
  async getProfileReports(page?: number): Promise<unknown> {
    const params = new URLSearchParams();
    if (page) params.set("page", String(page));
    return this.request(`/api/v1/admin/profile-reports?${params.toString()}`);
  }
  async resolveProfileReport(reportId: string, status: string, staffNotes: string): Promise<unknown> {
    return this.request(`/api/v1/admin/profile-reports/${reportId}/resolve`, { method: "POST", body: JSON.stringify({ status, staffNotes }) });
  }
}

export const api = new ApiClient();
