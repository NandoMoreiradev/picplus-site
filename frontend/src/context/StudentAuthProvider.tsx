import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  STUDENT_AUTH_EXPIRED_EVENT,
  studentApi,
  studentTokenStore,
} from '../lib/academy';
import type { StudentProfile } from '../lib/academy';
import { StudentAuthContext } from './student-auth-context';
import type { RegisterStudentInput } from './student-auth-context';

export function StudentAuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(
    () => studentTokenStore.get() !== null,
  );

  useEffect(() => {
    if (!studentTokenStore.get()) return;
    let cancelled = false;
    studentApi
      .get<StudentProfile>('/academy/auth/me')
      .then((me) => !cancelled && setStudent(me))
      .catch(() => studentTokenStore.clear())
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => setStudent(null);
    window.addEventListener(STUDENT_AUTH_EXPIRED_EVENT, onExpired);
    return () =>
      window.removeEventListener(STUDENT_AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await studentApi.post<{
      accessToken: string;
      student: StudentProfile;
    }>('/academy/auth/login', { email, password });
    studentTokenStore.set(result.accessToken);
    setStudent(result.student);
    return result.student;
  }, []);

  const register = useCallback(async (input: RegisterStudentInput) => {
    const result = await studentApi.post<{
      accessToken: string;
      student: StudentProfile;
    }>('/academy/auth/register', input);
    studentTokenStore.set(result.accessToken);
    setStudent(result.student);
    return result.student;
  }, []);

  const logout = useCallback(() => {
    studentTokenStore.clear();
    setStudent(null);
  }, []);

  const value = useMemo(
    () => ({
      student,
      loading,
      login,
      register,
      logout,
      setStudent,
    }),
    [student, loading, login, register, logout],
  );

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
}

