/**
 * Maps Supabase authentication error messages to localized Arabic messages.
 * Prevents potential information leakage and provides better UX.
 */
export const getAuthErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'خطأ في البريد الإلكتروني أو كلمة المرور',
    'Email not confirmed': 'يرجى تأكيد بريدك الإلكتروني أولاً',
    'User already registered': 'هذا البريد الإلكتروني مسجل بالفعل',
    'Email rate limit exceeded': 'تم تجاوز عدد المحاولات، يرجى الانتظار قليلاً',
    'Password should be at least 6 characters': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    'Unable to validate email address: invalid format': 'صيغة البريد الإلكتروني غير صحيحة',
    'Signup requires a valid password': 'يرجى إدخال كلمة مرور صحيحة',
    'To signup, please provide your email': 'يرجى إدخال بريدك الإلكتروني',
    'A user with this email address has already been registered': 'هذا البريد الإلكتروني مسجل بالفعل',
    'New password should be different from the old password': 'كلمة المرور الجديدة يجب أن تختلف عن القديمة',
    'Auth session missing!': 'انتهت جلسة تسجيل الدخول، يرجى تسجيل الدخول مجدداً',
  };
  
  // Return mapped message or generic error for unknown messages
  return errorMap[message] || 'حدث خطأ، يرجى المحاولة لاحقاً';
};
