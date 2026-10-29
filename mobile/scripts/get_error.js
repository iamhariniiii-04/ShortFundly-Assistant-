const token = 'MYgQDcl8fkdNNd90R_8EqoqCMFncGJddXBtQ89ER';
const buildUrl = 'https://expo.dev/accounts/subha04s-team/projects/bro-voice-assistant/builds/44581cad-4fcb-4549-ab9c-dfe9027ff597';

async function fetchPage() {
  const res = await fetch(buildUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'Mozilla/5.0',
    },
  });

  const html = await res.text();
  // Find all matches for "logUrl" or "s3" or "storage.googleapis" or "cloudfront"
  const urls = html.match(/https?:\/\/[^\s"'\\]+(?:log|gradle|eas-build)[^\s"'\\]*/gi) || [];
  console.log('Found URLs:', urls);

  // Look for any text around "error"
  const errIdx = html.indexOf('"error"');
  if (errIdx !== -1) {
    console.log('Error context:', html.slice(errIdx, errIdx + 1000));
  }
  
  // Search for "FAILED"
  const failedIdx = html.indexOf('FAILED');
  if (failedIdx !== -1) {
    console.log('FAILED context:', html.slice(failedIdx - 100, failedIdx + 500));
  }
}

fetchPage().catch(console.error);
