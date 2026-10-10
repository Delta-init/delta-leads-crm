import type { User } from "@/types";
import type { Course } from "@/types/course";
import type { Team } from "@/types/team";
import type { InitialLeadResponse, PrimaryConcern, FollowupStrategyType } from "@/types/lead";

export type StudentStatus  = "active" | "inactive" | "graduated" | "dropped";
export type FeeStatus      = "paid" | "partial" | "pending";

export interface Student {
  _id: string;
  enrollmentNumber: string;
  name: string;
  phone?: string;
  email?: string;
  course?: Course | string | null;
  team?:   Team   | string | null;
  assignedTo?: User | string | null;
  leadId?: { _id: string; name: string; phone?: string; status: string } | string | null;

  initialLeadResponse?:  InitialLeadResponse  | null;
  primaryConcern?:       PrimaryConcern        | null;
  followupStrategyType?: FollowupStrategyType  | null;
  demoScheduled: boolean;
  demoAttended:  boolean;
  firstContactTime?: string | null;
  lastFollowupDate?: string | null;

  enrollmentDate: string;
  feeStatus:      FeeStatus;
  totalFee:       number;
  paidAmount:     number;
  pendingAmount:  number;
  status:         StudentStatus;
  notes?: string;
  /** Taken at the close, and required there. Absent on older enrolments. */
  language?: string;
  paymentMethod?: string;
  paymentReceipt?: { name: string; url: string; key: string; size?: number; mimeType?: string } | null;
  /** Each payment taken at the close, when the client paid in more than one way. Absent on older enrolments. */
  payments?: StudentPayment[];
  /** Whether a bonus was given at the close. Absent on enrolments from before it was asked. */
  hasBonus?: boolean | null;
  /** The bonus, in the fee's currency; 0 when none. Never part of the balance. */
  bonusAmount?: number;
  /** Which academy it was closed for — its fee and payments are INR when Bangalore. Absent (Dubai) on older enrolments. */
  academy?: Academy;
  createdAt: string;
  updatedAt: string;
}

/**
 * Which academy a close is for (the user, 2026-10-10): Dubai — as it always
 * was — or Bangalore: INR, the course's Bangalore price, finance's Bangalore
 * org. Chosen at the close and never changed after.
 */
export const ACADEMIES = ["dubai", "bangalore"] as const;
export type Academy = (typeof ACADEMIES)[number];
export const ACADEMY_LABELS: Record<Academy, string> = { dubai: "Dubai", bangalore: "Bangalore" };
/** An enrolment's academy — Dubai when it has none (everything from before the choice). */
export const academyOf = (v: unknown): Academy => (v === "bangalore" ? "bangalore" : "dubai");

export interface StudentFilters {
  search?: string;
  status?: string;
  feeStatus?: string;
  course?: string;
  team?: string;
  assignedTo?: string;
  initialLeadResponse?: string;
  primaryConcern?: string;
  followupStrategyType?: string;
  demoScheduled?: string;
  demoAttended?: string;
  enrollmentFrom?: string;
  enrollmentTo?: string;
  page?: number;
  limit?: number;
}

export interface CreateStudentInput {
  leadId: string;
  name: string;
  phone?: string;
  email?: string;
  course?: string | null;
  team?: string | null;
  assignedTo?: string | null;
  initialLeadResponse?: string | null;
  primaryConcern?: string | null;
  followupStrategyType?: string | null;
  demoScheduled?: boolean;
  demoAttended?: boolean;
  firstContactTime?: string | null;
  lastFollowupDate?: string | null;
  enrollmentDate?: string;
  status?: StudentStatus;
  feeStatus?: FeeStatus;
  totalFee?: number;
  paidAmount?: number;
  notes?: string;
  language?: string;
  paymentMethod?: string;
  paymentReceipt?: { name: string; url: string; key: string; size?: number; mimeType?: string } | null;
  /** Each payment taken now (and the money already on the lead, as one). They add up to paidAmount. */
  payments?: StudentPayment[];
  hasBonus?: boolean;
  bonusAmount?: number;
  /** Dubai (the default) or Bangalore. */
  academy?: Academy;
}

/**
 * What a course is taught in, and how the money came in.
 *
 * Fixed lists, not typed boxes. Finance already holds enrolments whose language
 * reads "MALAYALAM", "Malayalam" and "malayalam" — three answers to one
 * question, which nothing can count across. The payment methods are spelled the
 * way finance spells them, because the value is sent straight into its
 * `declaredPaymentMethod` and a mismatch is refused at the far end.
 */
export const ENROLMENT_LANGUAGES = ["English", "Malayalam", "Hindi/Urdu", "Tamil"] as const;
export type EnrolmentLanguage = (typeof ENROLMENT_LANGUAGES)[number];

export const ENROLMENT_PAYMENT_METHODS = [
  "cash", "bank_transfer", "cheque", "card",
  "easebuzz_emi", "tabby", "tamara", "billexpro",
] as const;
export type EnrolmentPaymentMethod = (typeof ENROLMENT_PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<EnrolmentPaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  card: "Card",
  easebuzz_emi: "Easebuzz EMI",
  tabby: "Tabby",
  tamara: "Tamara",
  billexpro: "BillExPro",
};

/** A receipt, once it is in storage. */
export interface StoredReceipt {
  name: string;
  url: string;
  key: string;
  size?: number;
  mimeType?: string;
}

/**
 * One payment taken at the close — a client may pay part in cash and part by
 * card, each with its own receipt. They add up to the enrolment's paidAmount.
 */
export interface StudentPayment {
  method: string;
  amount: number;
  receipt: StoredReceipt;
  paidAt: string;
  /** The money already on the lead before the close, as one payment. */
  collectedBefore?: boolean;
  /** A Bangalore close's payment taken in AED: the AED and its rate (INR for 1 AED); `amount` is the INR it came to. */
  original?: PaymentOriginal;
}

/** A payment taken in AED on a Bangalore close. */
export interface PaymentOriginal {
  currency: "AED";
  amount: number;
  /** INR for 1 AED. */
  rate: number;
}
