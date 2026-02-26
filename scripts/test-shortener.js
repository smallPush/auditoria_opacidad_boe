
async function shortenUrl(url) {
  try {
    const response = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`);
    if (!response.ok) {
        console.log("Response not OK:", response.status);
        return url;
    }
    return await response.text();
  } catch (e) {
    console.error("Error fetching short URL:", e.message);
    return url;
  }
}

const testUrl = "https://radarboe.es/#/audit/BOE-A-2026-1484";
console.log("Original URL:", testUrl);
shortenUrl(testUrl).then(short => console.log("Shortened URL:", short));
