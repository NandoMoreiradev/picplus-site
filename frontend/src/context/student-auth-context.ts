import { createContext, useContext } from 'react';
import type { StudentProfile } from '../lib/academy';

export interface RegisterStudentInput {
  name: string;
  email: string;
  password: string;
  cpf?: string;
  phone?: string;
}

export interface StudentAuthContextValue {
  student: StudentProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<StudentProfile>;
  register: (input: RegisterStudentInput) => Promise<StudentProfile>;
  logout: () => void;
  setStudent: (student: StudentProfile) => void;
}

export const StudentAuthContext =
  createContext<StudentAuthContextValue | null>(null);

export function useStudentAuth(): StudentAuthContextValue {
  const ctx = useContext(StudentAuthContext);
  if (!ctx) {
    throw new Error(
      'useStudentAuth deve ser usado dentro de <StudentAuthProvider>',
    );
  }
  return ctx;
}

