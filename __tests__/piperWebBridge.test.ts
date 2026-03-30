import { isHostedGithubWeb } from '../src/utils/webHostDetection';

describe('piperWebBridge hosted-web detection', () => {
  it('returns true for github.dev hostnames', () => {
    expect(isHostedGithubWeb('legendary-goggles-jpqxvwj5vq6cqv79-8081.app.github.dev')).toBe(true);
    expect(isHostedGithubWeb('my-space.github.dev')).toBe(true);
  });

  it('returns false for localhost and regular hosts', () => {
    expect(isHostedGithubWeb('localhost')).toBe(false);
    expect(isHostedGithubWeb('127.0.0.1')).toBe(false);
    expect(isHostedGithubWeb('example.com')).toBe(false);
    expect(isHostedGithubWeb(undefined)).toBe(false);
  });
});
