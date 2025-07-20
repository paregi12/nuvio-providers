const html = `<a href="https://video-leech.pro/?url=SDNmYUhOYjRWOWdmYmFDWnFlRWZEbmZ2TzZVb3RhdytOeTVsVStzZWRoOFlXM1hUNDVEYWc2QklJVzVpS0g4aTdzZFcvU1QvaU94VElIdFI1aC83UlhWZmU5dDQyaEdmaDJmNms5QW9rUWUrdXhoUUlKLzRtQUFWMm8rbHQwdXZnLzZTMDZSRWl0UHY0bUVrazlQZEd2cXdkOVh6WThXdGFjbk5XY0hDM0NHY1BkeTVNdTZKUXg1dkJ4QUJFL1g5" target="_blank" class="btn btn-danger" data-mdb-ripple-color="dark" style="margin:4px 1px 4px 1px"><i class="fas fa-arrow-down"></i> Instant Download</a><a href="/zfile/bHxVBwqfKIL8blWA17es" target="_blank" class="btn btn-warning" data-mdb-ripple-init style="margin:4px 1px 4px 1px"><i class="fas fa-link"></i> Resume Cloud</a>`;

console.log('Testing regex patterns...');

// Test simple patterns first
const simpleInstantRegex = /href="([^"]*video-leech[^"]*)"/i;
const simpleInstantMatch = simpleInstantRegex.exec(html);
console.log('Simple Instant match:', simpleInstantMatch ? simpleInstantMatch[1] : 'No match');

const simpleResumeRegex = /href="([^"]*zfile[^"]*)"/i;
const simpleResumeMatch = simpleResumeRegex.exec(html);
console.log('Simple Resume match:', simpleResumeMatch ? simpleResumeMatch[1] : 'No match');

// Test more specific patterns
const instantDownloadRegex = /<a[^>]*href="([^"]*)"[^>]*class="[^"]*btn-danger[^"]*"[^>]*>.*?Instant Download.*?<\/a>/i;
const instantMatch = instantDownloadRegex.exec(html);
console.log('Instant Download match:', instantMatch ? instantMatch[1] : 'No match');

const resumeCloudRegex = /<a[^>]*href="([^"]*)"[^>]*class="[^"]*btn-warning[^"]*"[^>]*>.*?Resume Cloud.*?<\/a>/i;
const resumeMatch = resumeCloudRegex.exec(html);
console.log('Resume Cloud match:', resumeMatch ? resumeMatch[1] : 'No match');