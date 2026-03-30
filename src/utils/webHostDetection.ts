export const isHostedGithubWeb = (hostname?: string): boolean => {
  if (!hostname) return false;
  return hostname.endsWith('.github.dev') || hostname.endsWith('.app.github.dev');
};
