export type AccountStatus = "new" | "distributed";

export type AttemptStatus =
  | "pending"
  | "no_answer"
  | "interested"
  | "not_interested"
  | "callback";

export interface Account {
  id: string;
  seq: number;
  name: string;
  sector: string | null;
  phone: string | null;
  region: string | null;
  status: AccountStatus;
  created_at: string;
}

export interface Employee {
  id: string;
  name: string;
  token: string;
  phone: string | null;
  active: boolean;
  created_at: string;
}

export interface Assignment {
  id: string;
  group_id: string;
  employee_id: string;
  day: number;
  assigned_date: string;
  created_at: string;
}

export interface Attempt {
  id: string;
  assignment_id: string;
  account_id: string;
  group_id: string;
  employee_id: string;
  day: number;
  status: AttemptStatus;
  note: string;
  updated_at: string;
}
