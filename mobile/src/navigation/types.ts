export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  MfaChallenge: { factorId: string };
};

export type AppStackParamList = {
  Tasks: undefined;
  Settings: undefined;
};
