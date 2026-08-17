export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string | null;
  date_of_birth: string | null;
  gender: string | null;
  notes: string | null;
  created_at: string;
}

export type MembershipPlan = 'basic' | 'prime';
export type MembershipStatus = 'active' | 'disabled';

export interface Membership {
  id: string;
  customer_id: string;
  membership_id: string;
  start_date: string;
  expiry_date: string;
  created_at: string;
  plan: MembershipPlan;
  status: MembershipStatus;
  prime_enabled: boolean;
}

export interface CustomerWithMembership extends Customer {
  memberships?: Membership[];
  membership?: Membership | null;
}

export interface MedicinePurchase {
  id: string;
  customer_id: string;
  membership_id: string;
  purchase_date: string;
  medicine_name: string;
  quantity: number;
  unit: string;
  days_of_medicine: number;
  next_due_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface RoutineMedicine {
  id: string;
  customer_id: string;
  membership_id: string;
  medicine_name: string;
  quantity: number;
  unit: string;
  total_amount: number | null;
  notes: string | null;
  created_at: string;
}

export interface RoutineMedicineTotal {
  id: string;
  customer_id: string;
  membership_id: string;
  total_amount: number | null;
  created_at: string;
}

export interface BpRecord {
  id: string;
  customer_id: string;
  checkup_date: string;
  checkup_time: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  reading_text: string | null;
  notes: string | null;
  created_at: string;
}

export type SugarTestType = 'Fasting' | 'PP' | 'RBS' | 'HbA1c';

export interface SugarRecord {
  id: string;
  customer_id: string;
  checkup_date: string;
  checkup_time: string;
  test_type: SugarTestType;
  reading: number;
  unit: string;
  notes: string | null;
  created_at: string;
}

export interface EcgRecord {
  id: string;
  customer_id: string;
  checkup_date: string;
  checkup_time: string;
  result: string | null;
  notes: string | null;
  created_at: string;
  ecg_attachments?: EcgAttachment[];
}

export interface EcgAttachment {
  id: string;
  ecg_record_id: string;
  file_name: string;
  file_type: string;
  file_path: string;
  uploaded_at: string;
}

export interface CustomerProfile extends Customer {
  membership: Membership | null;
  medicine_purchases: MedicinePurchase[];
  routine_medicines: RoutineMedicine[];
  routine_medicine_totals: RoutineMedicineTotal[];
  bp_records: BpRecord[];
  sugar_records: SugarRecord[];
  ecg_records: EcgRecord[];
}

export interface CustomerAccount {
  id: string;
  customer_id: string;
  mobile: string;
  password_hash: string | null;
  account_activated: boolean;
  created_at: string;
  last_login: string | null;
}

export type MemberDocumentCategory =
  | 'Prescriptions'
  | 'Diagnosis'
  | 'Blood Reports'
  | 'ECG Reports'
  | 'Other Documents'
  | 'Notes';

export interface MemberDocument {
  id: string;
  customer_id: string;
  category: string;
  title: string;
  description: string | null;
  file_name: string | null;
  file_type: string | null;
  file_path: string | null;
  uploaded_by: 'member' | 'admin';
  document_date: string;
  created_at: string;
}

export interface CustomerPortalData {
  customer: Customer;
  membership: Membership | null;
  membership_usable: boolean;
  medicine_purchases: MedicinePurchase[];
  bp_records: BpRecord[];
  sugar_records: SugarRecord[];
  ecg_records: EcgRecord[];
  member_documents: MemberDocument[];
}

export interface AppSettings {
  whatsapp_number: string;
  whatsapp_message: string;
  basic_plan_price: string;
  basic_plan_label: string;
  prime_plan_price: string;
  prime_plan_label: string;
}

export interface AdminUser {
  id: string;
  username: string;
  full_name: string;
  is_active: boolean;
}

export interface AdminSession {
  adminId: string;
  sessionToken: string;
  fullName: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  whatsapp_number: '9993446609',
  whatsapp_message: 'Hello! I would like to create a new Pharmos Membership account. Please guide me through the registration process.',
  basic_plan_price: '99',
  basic_plan_label: 'Pharmos Care',
  prime_plan_price: '199',
  prime_plan_label: 'Pharmos Prime',
};

export const MEMBER_DOCUMENT_CATEGORIES: MemberDocumentCategory[] = [
  'Prescriptions',
  'Diagnosis',
  'Blood Reports',
  'ECG Reports',
  'Other Documents',
  'Notes',
];