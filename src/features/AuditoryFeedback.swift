import Foundation
import AVFoundation

class AuditoryFeedbackManager {
    private var audioEngine: AVAudioEngine
    private var player: AVAudioPlayer?
    private var speechSynthesizer = AVSpeechSynthesizer()
    
    // Feedback settings
    struct FeedbackSettings {
        var volume: Float
        var speed: Float
        var pitch: Float
        var voiceIdentifier: String
        var useHaptics: Bool
    }
    
    private var settings: FeedbackSettings
    
    init() {
        self.audioEngine = AVAudioEngine()
        self.settings = FeedbackSettings(
            volume: 1.0,
            speed: 1.0,
            pitch: 1.0,
            voiceIdentifier: "com.apple.ttsbundle.siri_female_en-US_compact",
            useHaptics: true
        )
    }
    
    // Update feedback settings
    func updateSettings(_ newSettings: FeedbackSettings) {
        self.settings = newSettings
    }
    
    // Play different types of feedback
    enum FeedbackType {
        case success
        case error
        case warning
        case notification
        case selectionChange
        case actionComplete
    }
    
    // Play sound feedback
    func playSound(for type: FeedbackType) {
        var filename: String
        
        switch type {
        case .success:
            filename = "success.wav"
        case .error:
            filename = "error.wav"
        case .warning:
            filename = "warning.wav"
        case .notification:
            filename = "notification.wav"
        case .selectionChange:
            filename = "selection.wav"
        case .actionComplete:
            filename = "complete.wav"
        }
        
        guard let url = Bundle.main.url(forResource: filename, withExtension: nil) else { return }
        
        do {
            player = try AVAudioPlayer(contentsOf: url)
            player?.volume = settings.volume
            player?.play()
        } catch {
            print("Error playing sound: \(error.localizedDescription)")
        }
    }
    
    // Speak text feedback
    func speak(_ text: String, interrupt: Bool = false) {
        if interrupt {
            speechSynthesizer.stopSpeaking(at: .immediate)
        }
        
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(identifier: settings.voiceIdentifier)
        utterance.volume = settings.volume
        utterance.rate = settings.speed
        utterance.pitchMultiplier = settings.pitch
        
        speechSynthesizer.speak(utterance)
    }
    
    // Play haptic feedback if enabled
    func playHaptic(for type: FeedbackType) {
        guard settings.useHaptics else { return }
        
        let generator: UIFeedbackGenerator
        
        switch type {
        case .success:
            generator = UINotificationFeedbackGenerator()
            (generator as? UINotificationFeedbackGenerator)?.notificationOccurred(.success)
        case .error:
            generator = UINotificationFeedbackGenerator()
            (generator as? UINotificationFeedbackGenerator)?.notificationOccurred(.error)
        case .warning:
            generator = UINotificationFeedbackGenerator()
            (generator as? UINotificationFeedbackGenerator)?.notificationOccurred(.warning)
        case .notification:
            generator = UIImpactFeedbackGenerator(style: .medium)
            (generator as? UIImpactFeedbackGenerator)?.impactOccurred()
        case .selectionChange:
            generator = UISelectionFeedbackGenerator()
            (generator as? UISelectionFeedbackGenerator)?.selectionChanged()
        case .actionComplete:
            generator = UIImpactFeedbackGenerator(style: .light)
            (generator as? UIImpactFeedbackGenerator)?.impactOccurred()
        }
    }
    
    // Combined feedback (sound + haptic)
    func provideFeedback(type: FeedbackType, withSound: Bool = true, withHaptic: Bool = true) {
        if withSound {
            playSound(for: type)
        }
        if withHaptic {
            playHaptic(for: type)
        }
    }
}