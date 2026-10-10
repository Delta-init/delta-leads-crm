import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { toast } from "@/lib/toast";
import type { ApiResponse } from "@/types";
import type { Student, StudentFilters, CreateStudentInput, StoredReceipt, ClientEmailCheck } from "@/types/student";
import { isFinanceEmail, isTakenEmailMessage } from "@/types/student";

const KEY = ["students"] as const;

/** Where the "is this email free for this client" answers are kept — asked again when a save is refused for one. */
export const EMAIL_CHECK_KEY = [...KEY, "email-check"] as const;

export const useStudents = (filters?: StudentFilters) =>
  useQuery({
    queryKey: [...KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([k, v]) => {
          if (v !== undefined && v !== "" && v !== "all") params.set(k, String(v));
        });
      }
      const res = await api.get<{ success: boolean; data: Student[]; pagination: ApiResponse<Student>["pagination"] }>(
        `/students?${params.toString()}`,
      );
      return res.data;
    },
  });

export const useStudent = (id: string) =>
  useQuery({
    queryKey: [...KEY, id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Student>>(`/students/${id}`);
      return res.data.data!;
    },
    enabled: !!id,
  });

export const useStudentByLeadId = (leadId: string) =>
  useQuery({
    queryKey: [...KEY, "by-lead", leadId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Student | null>>(`/students/by-lead/${leadId}`);
      return res.data.data ?? null;
    },
    enabled: !!leadId,
  });

export const useCreateStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateStudentInput) => {
      const res = await api.post<ApiResponse<Student>>("/students", data);
      return res.data.data!;
    },
    onSuccess: () => {
      toast.success("Student profile created");
      qc.invalidateQueries({ queryKey: KEY });
      // The close may have given the lead the client's email.
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create student";
      toast.error(msg);
      // Refused for an email another client holds: the dialog's check asks again, and shows who.
      if (isTakenEmailMessage(msg)) qc.invalidateQueries({ queryKey: EMAIL_CHECK_KEY });
    },
  });
};

/**
 * Whether an email is free for this client — one email, one client
 * (2026-10-10): asked of the server once typing pauses, for the lead being
 * closed (`leadId`) or an enrolment (`studentId`, the correction and the
 * add-email box). Only an email finance would take is asked about.
 *
 * `taken` is the server's answer when another client holds it — who, and the
 * words to show; `checking` is true until the answer for what is typed now is
 * in, so a form can wait for it. A server that can't answer (one from before,
 * a network error) holds nothing up: saving is checked there regardless.
 */
export function useClientEmailCheck(
  email: string,
  of: { leadId?: string | null; studentId?: string | null },
  enabled = true,
): { taken: ClientEmailCheck | null; checking: boolean } {
  const key = (email ?? "").trim().toLowerCase();
  // The email once it has stopped changing for a moment — not a request per keystroke.
  const [settled, setSettled] = useState(key);
  useEffect(() => {
    if (settled === key) return;
    const t = setTimeout(() => setSettled(key), 400);
    return () => clearTimeout(t);
  }, [key, settled]);

  const leadId = of.leadId ?? "";
  const studentId = of.studentId ?? "";
  const asks = enabled && Boolean(leadId || studentId) && isFinanceEmail(key);
  const current = asks && settled === key;
  const q = useQuery({
    queryKey: [...EMAIL_CHECK_KEY, settled, leadId, studentId],
    queryFn: async () => {
      const params = new URLSearchParams({ email: settled });
      if (studentId) params.set("studentId", studentId);
      else params.set("leadId", leadId);
      const res = await api.get<{ success: boolean; data: ClientEmailCheck }>(`/students/email-check?${params.toString()}`);
      return res.data.data;
    },
    enabled: current,
    retry: false,
    staleTime: 30_000,
  });
  return {
    taken: current && q.data?.ok === false ? q.data : null,
    checking: asks && (!current || q.isLoading),
  };
}

export const useUpdateStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateStudentInput> }) => {
      const res = await api.put<ApiResponse<Student>>(`/students/${id}`, data);
      return res.data.data!;
    },
    onSuccess: (_, { id }) => {
      toast.success("Student updated");
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: [...KEY, id] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update student";
      toast.error(msg);
    },
  });
};

export const useDeleteStudent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/students/${id}`);
    },
    onSuccess: () => {
      toast.success("Student deleted");
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: () => toast.error("Failed to delete student"),
  });
};

/**
 * Put a payment receipt in storage, before the enrolment that will carry it.
 *
 * Its own request rather than part of the close: the close creates a student
 * and hands it to finance in one go, and a multipart body carrying both a file
 * and the enrolment would have to be unpicked before either could be checked.
 * This returns a stored file; the close stays the JSON it always was, naming it.
 */
export async function uploadReceipt(leadId: string, file: File): Promise<StoredReceipt> {
  const body = new FormData();
  body.append("file", file);
  const res = await api.post<{ success: boolean; data: StoredReceipt }>(
    `/students/receipts/${leadId}`,
    body,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return res.data.data;
}
