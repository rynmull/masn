export const isForceLocalOnlyMode = (): boolean => {
  return process.env.EXPO_PUBLIC_FORCE_LOCAL_ONLY === 'true';
};
