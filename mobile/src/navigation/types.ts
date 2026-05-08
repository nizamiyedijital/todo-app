export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  MfaChallenge: { factorId: string };
};

export type AppStackParamList = {
  Tasks: undefined;
  Settings: undefined;
  Support: undefined;
  Notifications: undefined;
  Stats: undefined;
  Pomodoro: undefined;
  Weekly: undefined;
};
