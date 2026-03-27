import Foundation
import UIKit

class GestureControlManager {
    // Supported gesture types
    enum GestureType {
        case swipeLeft
        case swipeRight
        case swipeUp
        case swipeDown
        case doubleTap
        case longPress
        case twoFingerSwipe
    }
    
    // Gesture action mapping
    private var gestureActions: [GestureType: () -> Void] = [:]
    
    // Configure gesture recognizers
    func setupGestureRecognizers(view: UIView) {
        // Swipe gestures
        let swipeDirections: [UISwipeGestureRecognizer.Direction] = [.left, .right, .up, .down]
        
        for direction in swipeDirections {
            let swipe = UISwipeGestureRecognizer(target: self, action: #selector(handleSwipe(_:)))
            swipe.direction = direction
            view.addGestureRecognizer(swipe)
        }
        
        // Double tap gesture
        let doubleTap = UITapGestureRecognizer(target: self, action: #selector(handleDoubleTap(_:)))
        doubleTap.numberOfTapsRequired = 2
        view.addGestureRecognizer(doubleTap)
        
        // Long press gesture
        let longPress = UILongPressGestureRecognizer(target: self, action: #selector(handleLongPress(_:)))
        view.addGestureRecognizer(longPress)
        
        // Two-finger swipe
        let twoFingerSwipe = UISwipeGestureRecognizer(target: self, action: #selector(handleTwoFingerSwipe(_:)))
        twoFingerSwipe.numberOfTouchesRequired = 2
        view.addGestureRecognizer(twoFingerSwipe)
    }
    
    // Register actions for gestures
    func registerAction(for gesture: GestureType, action: @escaping () -> Void) {
        gestureActions[gesture] = action
    }
    
    // Gesture handlers
    @objc private func handleSwipe(_ gesture: UISwipeGestureRecognizer) {
        switch gesture.direction {
        case .left:
            gestureActions[.swipeLeft]?()
        case .right:
            gestureActions[.swipeRight]?()
        case .up:
            gestureActions[.swipeUp]?()
        case .down:
            gestureActions[.swipeDown]?()
        default:
            break
        }
    }
    
    @objc private func handleDoubleTap(_ gesture: UITapGestureRecognizer) {
        gestureActions[.doubleTap]?()
    }
    
    @objc private func handleLongPress(_ gesture: UILongPressGestureRecognizer) {
        if gesture.state == .began {
            gestureActions[.longPress]?()
        }
    }
    
    @objc private func handleTwoFingerSwipe(_ gesture: UISwipeGestureRecognizer) {
        gestureActions[.twoFingerSwipe]?()
    }
}