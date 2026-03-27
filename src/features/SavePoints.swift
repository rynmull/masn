import Foundation

class SavePointManager {
    // Save point data structure
    struct SavePoint {
        let id: UUID
        let timestamp: Date
        let sequence: [String]
        let position: Int
        let context: [String: Any]
    }
    
    private var savePoints: [SavePoint] = []
    private let maxSavePoints = 10  // Maximum number of save points to maintain
    
    // Create a new save point
    func createSavePoint(sequence: [String], position: Int, context: [String: Any]) -> SavePoint {
        let savePoint = SavePoint(
            id: UUID(),
            timestamp: Date(),
            sequence: sequence,
            position: position,
            context: context
        )
        
        savePoints.append(savePoint)
        
        // Remove oldest save point if we exceed the maximum
        if savePoints.count > maxSavePoints {
            savePoints.removeFirst()
        }
        
        return savePoint
    }
    
    // Restore to a specific save point
    func restore(savePoint: SavePoint) -> (sequence: [String], position: Int, context: [String: Any]) {
        return (
            sequence: savePoint.sequence,
            position: savePoint.position,
            context: savePoint.context
        )
    }
    
    // Get all available save points
    func getAllSavePoints() -> [SavePoint] {
        return savePoints.sorted { $0.timestamp > $1.timestamp }
    }
    
    // Delete a specific save point
    func deleteSavePoint(id: UUID) {
        savePoints.removeAll { $0.id == id }
    }
    
    // Auto-save functionality
    func autoSave(sequence: [String], position: Int, context: [String: Any]) {
        // Create auto-save point every N actions or time interval
        let currentTime = Date()
        
        // Check if we should create a new auto-save
        if shouldCreateAutoSave(currentTime) {
            _ = createSavePoint(sequence: sequence, position: position, context: context)
        }
    }
    
    private func shouldCreateAutoSave(_ currentTime: Date) -> Bool {
        // Create auto-save if:
        // 1. No save points exist
        // 2. More than 5 minutes have passed since last save point
        guard let lastSave = savePoints.last else {
            return true
        }
        
        let timeSinceLastSave = currentTime.timeIntervalSince(lastSave.timestamp)
        return timeSinceLastSave >= 300 // 5 minutes in seconds
    }
}