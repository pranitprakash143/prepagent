export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  plan: 'FREE' | 'PRO';
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface Document {
  id: string;
  title?: string;
  file_name: string;
  file_size?: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  subject_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ProgressEvent {
  stage: string;
  progress: number;
  message: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  created_at: string;
}

export interface DashboardSummary {
  study_streak: number;
  cards_reviewed: number;
  documents_processed: number;
  recent_documents: Document[];
  recent_notes: Note[];
}

export interface SearchResult {
  id: string;
  source: 'note' | 'document';
  title: string;
  snippet: string;
  score: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  subject_id?: string;
  difficulty: number;
  next_review?: string;
  repetitions: number;
  interval_days: number;
  ease_factor: number;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  detail: string;
  code: string;
  field?: string;
}

export interface StripeSessionResponse {
  session_id: string;
  url: string;
}

export interface RazorpayOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

export interface SubscriptionStatus {
  plan: string;
  is_active: boolean;
  stripe_id?: string;
}

export interface PaymentRecord {
  id: string;
  provider: string;
  provider_payment_id?: string;
  amount: number;
  currency: string;
  status: string;
  plan: string;
  interval?: string;
  created_at?: string;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  source_verified: boolean;
  fact_verified: boolean;
  warnings: string[];
}

export interface FlashcardItem {
  question: string;
  answer: string;
  source_chunk?: string;
  verification?: VerificationResult;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  source_chunk?: string;
  verification?: VerificationResult;
}

export interface GapItem {
  pyq_id: string;
  question: string;
  topic: string;
  year?: number;
  exam_type?: string;
  coverage_score: number;
  is_gap: boolean;
  matched_chunks: string[];
}

export interface GapAnalysis {
  subject_id?: string;
  total_pyqs: number;
  covered_pyqs: number;
  gap_pyqs: number;
  coverage_percentage: number;
  gaps: GapItem[];
  strengths: string[];
  weak_areas: string[];
  recommendations: string[];
}

export interface SocraticMessage {
  role: string;
  content: string;
}

export interface SocraticResponse {
  reply: string;
  reveal_answer: boolean;
  answer?: string;
  hints_used: number;
}
