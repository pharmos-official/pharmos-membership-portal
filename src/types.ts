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

export interface Membership {
  id: string;
  customer_id: string;
  membership_id: string;
  start_date: string;
  expiry_date: string;
  created_at: string;
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

export interface CustomerPortalData {
  customer: Customer;
  membership: Membership | null;
  medicine_purchases: MedicinePurchase[];
  bp_records: BpRecord[];
  sugar_records: SugarRecord[];
  ecg_records: EcgRecord[];
}
