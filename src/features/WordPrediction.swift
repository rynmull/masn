import Foundation
import UIKit

class WordPredictionManager {
    private var wordPairs: [(primary: String, secondary: String)] = []
    private var userFrequencyMap: [String: Int] = [:]
    
    // Main prediction engine that provides paired suggestions
    func getPredictions(for currentWord: String) -> [(primary: String, secondary: String)] {
        // Filter and sort predictions based on current input
        let filteredPairs = wordPairs.filter { pair in
            pair.primary.lowercased().hasPrefix(currentWord.lowercased()) ||
            pair.secondary.lowercased().hasPrefix(currentWord.lowercased())
        }
        
        // Sort by user frequency and context relevance
        return filteredPairs.sorted { pair1, pair2 in
            let freq1 = userFrequencyMap[pair1.primary] ?? 0
            let freq2 = userFrequencyMap[pair2.primary] ?? 0
            return freq1 > freq2
        }
    }
    
    // Update word frequencies based on user selection
    func updateFrequency(for word: String) {
        userFrequencyMap[word] = (userFrequencyMap[word] ?? 0) + 1
    }
    
    // Add new word pairs from context or user input
    func addWordPair(primary: String, secondary: String) {
        wordPairs.append((primary, secondary))
    }
    
    // Get context-aware suggestions based on recent input
    func getContextualPairs(recentWords: [String]) -> [(primary: String, secondary: String)] {
        // Implement context-based filtering and ranking
        return wordPairs.filter { pair in
            recentWords.contains { word in
                word.lowercased().hasPrefix(pair.primary.lowercased()) ||
                word.lowercased().hasPrefix(pair.secondary.lowercased())
            }
        }
    }
}