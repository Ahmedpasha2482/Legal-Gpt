// User types
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'lawyer' | 'student' | 'researcher' | 'other';
  profession?: string;
  barCouncilNumber?: string;
  isVerified: boolean;
  preferences: {
    language: 'english' | 'hinglish';
    notifications: boolean;
  };
  usage: {
    queriesCount: number;
    documentsUploaded: number;
    lastActive: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Authentication types
export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: User['role'];
  profession?: string;
  barCouncilNumber?: string;
  preferences?: Partial<User['preferences']>;
}

// Chat types
export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata: {
    sources?: Source[];
    lawSections?: LawSection[];
    processingTime?: number;
    language?: 'english' | 'hinglish';
    model?: string;
    type?: 'case_analysis' | 'query' | 'system';
  };
}

export interface Chat {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  messages: Message[];
  caseDetails: {
    caseNumber?: string;
    caseType: 'criminal' | 'civil' | 'constitutional' | 'other';
    court?: string;
    status: 'active' | 'pending' | 'closed' | 'archived';
    tags?: string[];
  };
  documentsAttached: AttachedDocument[];
  summary: {
    keyPoints: string[];
    legalSections: string[];
    recommendations: string[];
    nextSteps: string[];
  };
  isArchived: boolean;
  isShared: boolean;
  sharedWith: Array<{
    userId: string;
    permission: 'read' | 'comment' | 'edit';
  }>;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttachedDocument {
  filename: string;
  originalName: string;
  uploadDate: Date;
  size: number;
  type: string;
}

// Document types
export interface Document {
  _id: string;
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  userId: string;
  documentType: DocumentType;
  lawCategory: 'criminal' | 'civil' | 'constitutional' | 'procedural' | 'evidence';
  isSystemDocument: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  extractedText: string;
  vectorIndexId?: string;
  metadata: {
    totalPages?: number;
    totalChunks?: number;
    processingTime?: number;
    extractionMethod?: string;
    language: 'english' | 'hindi' | 'mixed';
    actDetails?: {
      fullName: string;
      year: number;
      sections: DocumentSection[];
      chapters: DocumentChapter[];
    };
  };
  searchableFields: {
    sections: string[];
    keywords: string[];
    topics: string[];
  };
  isPublic: boolean;
  downloadCount: number;
  lastAccessed: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentType = 
  | 'ipc' | 'crpc' | 'crpc_amendment' | 'bns' | 'bnss' | 'bsa'
  | 'indian_evidence_act' | 'juvenile_justice' | 'ndps'
  | 'case_file' | 'judgment' | 'other';

export interface DocumentSection {
  number: string;
  title: string;
  content: string;
  page: number;
}

export interface DocumentChapter {
  number: string;
  title: string;
  sections: string[];
}

// Query types
export interface QueryRequest {
  question: string;
  chatId?: string;
  language?: 'english' | 'hinglish';
  context?: string;
  documentTypes?: DocumentType[];
}

export interface QueryResponse {
  chatId: string;
  messageId: string;
  response: string;
  metadata: {
    processingTime: number;
    sources: Source[];
    lawSections: LawSection[];
    conflicts: LawConflict[];
    relevantDocuments: number;
    language: string;
  };
}

export interface Source {
  document: string;
  section?: string;
  page?: number;
  confidence: number;
}

export interface LawSection {
  act: string;
  section: string;
  title: string;
  replacement?: string;
}

export interface LawConflict {
  original: LawSection;
  replacement: string;
  isOutdated: boolean;
}

// Case analysis types
export interface CaseAnalysisRequest {
  caseContent: string;
  chatId?: string;
  language?: 'english' | 'hinglish';
}

export interface CaseAnalysisResponse {
  summary: string;
  metadata: {
    processingTime: number;
    relevantSections: Source[];
    language: string;
  };
}

// Search types
export interface SearchRequest {
  query: string;
  documentTypes?: DocumentType[];
  limit?: number;
  includeUserDocs?: boolean;
  includeSystemDocs?: boolean;
}

export interface SearchResult {
  documentType: string;
  section?: string;
  content: string;
  similarity: number;
  page?: number;
  replacement?: string;
  isOutdated?: boolean;
}

// UI State types
export interface UIState {
  sidebarOpen: boolean;
  currentPage: string;
  loading: boolean;
  error: string | null;
  toast: ToastMessage | null;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// File upload types
export interface FileUploadResult {
  success: boolean;
  filename: string;
  documentId?: string;
  message: string;
  error?: string;
}

export interface UploadResponse {
  results: FileUploadResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Dashboard types
export interface DashboardStats {
  user: User;
  stats: {
    totalChats: number;
    totalDocuments: number;
    queriesCount: number;
    documentsUploaded: number;
    lastActive: Date;
  };
  recentChats: Array<{
    _id: string;
    title: string;
    lastActivity: Date;
    caseDetails: Chat['caseDetails'];
  }>;
}

// Settings types
export interface UserSettings {
  language: 'english' | 'hinglish';
  notifications: boolean;
  theme?: 'light' | 'dark' | 'system';
  emailNotifications?: {
    newFeatures: boolean;
    securityAlerts: boolean;
    weeklyDigest: boolean;
  };
}

// Error types
export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// Form types
export interface FormField<T = string> {
  value: T;
  error?: string;
  touched: boolean;
}

export interface ContactForm {
  name: FormField;
  email: FormField;
  message: FormField;
  subject: FormField;
}

// Law mapping types
export interface LawMapping {
  act: string;
  section: string;
  citation: string;
  isOutdated: boolean;
  replacement?: string;
  newEquivalent?: {
    newAct: string;
    newSection: string;
    fullName: string;
  };
  oldEquivalent?: {
    oldAct: string;
    oldSection: string;
    fullName: string;
  };
}

// Export utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredOnly<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>;

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  type?: 'spinner' | 'dots' | 'pulse';
  message?: string;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
}

export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  hint?: string;
}