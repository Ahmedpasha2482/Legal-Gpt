import axios, { AxiosInstance, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';
import type {
  ApiResponse,
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
  Chat,
  QueryRequest,
  QueryResponse,
  CaseAnalysisRequest,
  CaseAnalysisResponse,
  Document,
  SearchRequest,
  SearchResult,
  DashboardStats,
  UploadResponse,
  PaginatedResponse,
  LawMapping,
} from '../types';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  // Token management
  private getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  private removeToken(): void {
    localStorage.removeItem('auth_token');
  }

  // Error handling
  private handleApiError(error: any): void {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          this.removeToken();
          toast.error('Session expired. Please login again.');
          window.location.href = '/login';
          break;
        case 403:
          toast.error('Access denied. Insufficient permissions.');
          break;
        case 404:
          toast.error('Resource not found.');
          break;
        case 429:
          toast.error('Too many requests. Please try again later.');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(data?.message || 'An unexpected error occurred.');
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred.');
    }
  }

  // Helper method for API calls
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    config?: any
  ): Promise<T> {
    const response = await this.client.request({
      method,
      url: endpoint,
      data,
      ...config,
    });
    return response.data;
  }

  // Authentication API
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.makeRequest<ApiResponse<AuthResponse>>(
      'POST',
      '/auth/login',
      credentials
    );
    
    if (response.success && response.data) {
      this.setToken(response.data.token);
      toast.success('Login successful!');
      return response.data;
    }
    
    throw new Error(response.message || 'Login failed');
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.makeRequest<ApiResponse<AuthResponse>>(
      'POST',
      '/auth/register',
      data
    );
    
    if (response.success && response.data) {
      this.setToken(response.data.token);
      toast.success('Registration successful!');
      return response.data;
    }
    
    throw new Error(response.message || 'Registration failed');
  }

  async logout(): Promise<void> {
    this.removeToken();
    toast.success('Logged out successfully');
  }

  async getProfile(): Promise<User> {
    const response = await this.makeRequest<ApiResponse<{ user: User }>>(
      'GET',
      '/auth/profile'
    );
    return response.data!.user;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await this.makeRequest<ApiResponse<{ user: User }>>(
      'PUT',
      '/auth/profile',
      data
    );
    toast.success('Profile updated successfully');
    return response.data!.user;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.makeRequest<ApiResponse>(
      'POST',
      '/auth/change-password',
      { currentPassword, newPassword }
    );
    toast.success('Password changed successfully');
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.makeRequest<ApiResponse<DashboardStats>>(
      'GET',
      '/auth/dashboard-stats'
    );
    return response.data!;
  }

  // Chat API
  async getChats(page = 1, limit = 20, includeArchived = false): Promise<PaginatedResponse<Chat>> {
    const response = await this.makeRequest<ApiResponse<PaginatedResponse<Chat>>>(
      'GET',
      `/chat?page=${page}&limit=${limit}&includeArchived=${includeArchived}`
    );
    return response.data!;
  }

  async getChat(chatId: string): Promise<Chat> {
    const response = await this.makeRequest<ApiResponse<{ chat: Chat }>>(
      'GET',
      `/chat/${chatId}`
    );
    return response.data!.chat;
  }

  async createChat(data: {
    title: string;
    description?: string;
    caseDetails?: Partial<Chat['caseDetails']>;
    initialMessage?: string;
  }): Promise<Chat> {
    const response = await this.makeRequest<ApiResponse<{ chat: Chat }>>(
      'POST',
      '/chat',
      data
    );
    return response.data!.chat;
  }

  async updateChat(chatId: string, data: Partial<Chat>): Promise<Chat> {
    const response = await this.makeRequest<ApiResponse<{ chat: Chat }>>(
      'PUT',
      `/chat/${chatId}`,
      data
    );
    return response.data!.chat;
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.makeRequest<ApiResponse>('DELETE', `/chat/${chatId}`);
    toast.success('Chat deleted successfully');
  }

  async archiveChat(chatId: string, archive = true): Promise<Chat> {
    const response = await this.makeRequest<ApiResponse<{ chat: Chat }>>(
      'POST',
      `/chat/${chatId}/archive`,
      { archive }
    );
    toast.success(`Chat ${archive ? 'archived' : 'unarchived'} successfully`);
    return response.data!.chat;
  }

  async shareChat(chatId: string, userId: string, permission = 'read'): Promise<Chat> {
    const response = await this.makeRequest<ApiResponse<{ chat: Chat }>>(
      'POST',
      `/chat/${chatId}/share`,
      { userId, permission }
    );
    toast.success('Chat shared successfully');
    return response.data!.chat;
  }

  async exportChat(chatId: string, format = 'json'): Promise<Blob> {
    const response = await this.client.get(`/chat/${chatId}/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async generateChatSummary(chatId: string): Promise<Chat['summary']> {
    const response = await this.makeRequest<ApiResponse<{ summary: Chat['summary'] }>>(
      'POST',
      `/chat/${chatId}/generate-summary`
    );
    return response.data!.summary;
  }

  async searchChats(query: string, limit = 10): Promise<Chat[]> {
    const response = await this.makeRequest<ApiResponse<{ chats: Chat[] }>>(
      'GET',
      `/chat/search?query=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.data!.chats;
  }

  // Query API
  async askQuestion(request: QueryRequest): Promise<QueryResponse> {
    const response = await this.makeRequest<ApiResponse<QueryResponse>>(
      'POST',
      '/query/ask',
      request
    );
    return response.data!;
  }

  async analyzeCase(request: CaseAnalysisRequest): Promise<CaseAnalysisResponse> {
    const response = await this.makeRequest<ApiResponse<CaseAnalysisResponse>>(
      'POST',
      '/query/analyze-case',
      request
    );
    return response.data!;
  }

  async searchSections(query: string, act?: string, limit = 10): Promise<SearchResult[]> {
    const params = new URLSearchParams({ query, limit: limit.toString() });
    if (act) params.append('act', act);
    
    const response = await this.makeRequest<ApiResponse<{ results: SearchResult[] }>>(
      'GET',
      `/query/search-sections?${params.toString()}`
    );
    return response.data!.results;
  }

  async getLawMapping(act: string, section: string): Promise<LawMapping> {
    const response = await this.makeRequest<ApiResponse<LawMapping>>(
      'GET',
      `/query/law-mapping/${act}/${section}`
    );
    return response.data!;
  }

  async checkLawConflicts(text: string): Promise<{
    sectionsFound: Array<{ act: string; sectionNumber: string }>;
    conflicts: any[];
    recommendations: any[];
    totalConflicts: number;
    needsUpdate: boolean;
  }> {
    const response = await this.makeRequest<ApiResponse<any>>(
      'POST',
      '/query/law-conflicts',
      { text }
    );
    return response.data!;
  }

  // Documents API
  async getDocuments(params: {
    page?: number;
    limit?: number;
    documentType?: string;
    processingStatus?: string;
    search?: string;
  } = {}): Promise<PaginatedResponse<Document>> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const response = await this.makeRequest<ApiResponse<PaginatedResponse<Document>>>(
      'GET',
      `/documents?${queryParams.toString()}`
    );
    return response.data!;
  }

  async getDocument(documentId: string): Promise<Document> {
    const response = await this.makeRequest<ApiResponse<{ document: Document }>>(
      'GET',
      `/documents/${documentId}`
    );
    return response.data!.document;
  }

  async uploadDocuments(
    files: File[],
    documentType = 'case_file',
    description = ''
  ): Promise<UploadResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('documents', file);
    });
    formData.append('documentType', documentType);
    formData.append('description', description);

    const response = await this.makeRequest<ApiResponse<UploadResponse>>(
      'POST',
      '/documents/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    const result = response.data!;
    if (result.summary.successful > 0) {
      toast.success(`${result.summary.successful} file(s) uploaded successfully`);
    }
    if (result.summary.failed > 0) {
      toast.error(`${result.summary.failed} file(s) failed to upload`);
    }
    
    return result;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.makeRequest<ApiResponse>('DELETE', `/documents/${documentId}`);
    toast.success('Document deleted successfully');
  }

  async downloadDocument(documentId: string): Promise<Blob> {
    const response = await this.client.get(`/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async reprocessDocument(documentId: string): Promise<void> {
    await this.makeRequest<ApiResponse>('POST', `/documents/${documentId}/reprocess`);
    toast.success('Document reprocessing initiated');
  }

  async getSystemDocuments(documentType?: string): Promise<Document[]> {
    const params = documentType ? `?documentType=${documentType}` : '';
    const response = await this.makeRequest<ApiResponse<{ documents: Document[] }>>(
      'GET',
      `/documents/system/list${params}`
    );
    return response.data!.documents;
  }

  async searchDocuments(request: SearchRequest): Promise<SearchResult[]> {
    const response = await this.makeRequest<ApiResponse<{ results: SearchResult[] }>>(
      'POST',
      '/documents/search',
      request
    );
    return response.data!.results;
  }

  async getDocumentStats(): Promise<{
    total: number;
    processing: number;
    completed: number;
    failed: number;
    byType: Record<string, number>;
  }> {
    const response = await this.makeRequest<ApiResponse<any>>(
      'GET',
      '/documents/stats'
    );
    return response.data!;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest<{ status: string }>('GET', '/health');
      return response.status === 'OK';
    } catch {
      return false;
    }
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getAuthToken(): string | null {
    return this.getToken();
  }
}

// Create and export singleton instance
const apiClient = new ApiClient();
export default apiClient;