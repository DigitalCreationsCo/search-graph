const stopWords = new Set([
  "and", "is", "the", "of", "on", "in", "to", "for", "with", "by", "at", "an", "as", "it", "be", "or", "from", "this", "that", "which", "a"
]);

function parseTitleKeywords(title: string): string[] {
  const keywords = title
    .toLowerCase() // Convert to lowercase for consistency
    .split(/[\s.,|/\\-]+/) // Delimit by spaces, punctuation, and special characters
    .filter((word) => word.length > 2 && !stopWords.has(word)); // Filter out short words and stop words

  if (keywords.length === 0) {
    // Extract the two longest words from the title
    const longestWords = title
      .toLowerCase()
      .split(/[\s.,|/\\-]+/) // Delimit by spaces, punctuation, and special characters
      .filter((word) => word.length > 2) // Filter out short words
      .sort((a, b) => b.length - a.length) // Sort words by length in descending order
      .slice(0, 2); // Take the two longest words

    return longestWords;
  }

  return keywords;
}


function parseLinkKeywords(link: string): string[] {
  // Remove URL schemes like "https://", "www.", and split the rest
  return link
    .toLowerCase()
    .replace(/https?:\/\/(www\.)?/, "") // Remove protocol and "www"
    .split(/[\s.,|/\\-]+/) // Delimit by common URL separators
    .filter((word) => word.length > 2 && !stopWords.has(word)); // Filter out short words and stop words
}
  
export function getCommonKeywords(title: string, link: string): string[] {
    const titleKeywords = parseTitleKeywords(title);
    const linkKeywords = parseLinkKeywords(link);
  
    // Merge title and link keywords for frequency analysis
    const allKeywords = [...titleKeywords, ...linkKeywords];
  
    // Create a frequency map for each keyword
    const frequencyMap: Record<string, number> = {};
    allKeywords.forEach((keyword) => {
      frequencyMap[keyword] = (frequencyMap[keyword] || 0) + 1;
    });
  
    // Extract common keywords
    const commonKeywords = titleKeywords.filter((titleWord) =>
      linkKeywords.some((linkWord) => linkWord.includes(titleWord) || titleWord.includes(linkWord))
    );
  
    // Remove duplicates and sort common keywords by frequency in descending order
    const uniqueKeywords = Array.from(new Set(commonKeywords));
    return uniqueKeywords.sort((a, b) => (frequencyMap[b] || 0) - (frequencyMap[a] || 0)).slice(undefined, 2);
}
  