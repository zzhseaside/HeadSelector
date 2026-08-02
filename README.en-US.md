# Assets Project Documentation

## Project Overview

This project is a character avatar selector component based on Cocos Creator, implementing circular layout infinite loop scrolling selection functionality. Through smooth animation effects and intuitive interaction experience, users can easily select different character avatars.

### Demonstration Video

<video src="https://kuailetech.cn/headselector/video.mp4" controls width="100%" style="max-width: 800px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
  Your browser does not support video playback.
</video>

*Click the play button to view the actual running effect of the avatar selector*

### Interface Screenshots
<img src="https://kuailetech.cn/headselector/picture.png">

*Real interface display of the avatar selector*

## Directory Structure

```
assets/
├── head/                          # Avatar selector core module
│   ├── RoleHeadNode.ts           # Avatar node component
│   ├── RoleHeadNode.prefab       # Avatar node prefab
│   ├── RoleSelector.ts           # Character selector main component
│   ├── image/                    # Avatar image resources
│   │   ├── *.jpg                 # Character avatar images (16 total)
│   ├── sprite-radius.effect      # Circular sprite effect
│   ├── sprite-radius.mtl         # Circular sprite material
└── Head.scene                    # Avatar selector scene file
README.md                     # This document
```

## Core Components

### 1. RoleSelector (Character Selector)

Main controller component, responsible for the interaction logic and animation effects of the entire selector.

#### Main Functions
- **Circular Layout**: Arranges avatar nodes in a circular pattern to form a ring selector
- **Infinite Loop**: Supports infinite loop scrolling of data without boundary limits
- **Smooth Animation**: Implements smooth snapping animation using exponential decay algorithm
- **Touch Interaction**: Supports dragging and clicking to select two interaction methods
- **Object Pool Optimization**: Uses NodePool to manage avatar nodes, improving performance

#### Key Parameters
```typescript
// Visual parameters
circleRadius: 360;           // Circle radius
totalHeadCount: 7;           // Total avatar node count (1 center + 3 above + 3 below)
headSpacing: 36;             // Avatar spacing (degrees)

// Haptic parameters
dragSensitivity: 0.15;       // Drag sensitivity
snapSpeed: 15.0;             // Snapping interpolation speed
inertiaFactor: 0.15;         // Inertia prediction coefficient
```

#### Core Methods
- `onTouchStart()` - Touch start handling
- `onTouchMove()` - Touch move handling
- `onTouchEnd()` - Touch end handling
- `updateVisuals()` - Update visual effects
- `updateDataBinding()` - Data binding update
- `onClickHead()` - Click avatar handling
- `getHeadIndex()` - Get currently selected index

### 2. RoleHeadNode (Avatar Node)

Individual avatar node display component.

#### Main Functions
- Display character avatar images
- Display character number labels
- Support dynamic switching of avatar content

#### Properties
```typescript
head: Sprite;                  // Avatar sprite component
headSpriteFrameArr: SpriteFrame[]; // Avatar image array
label: Label;                  // Number label component
```

#### Core Methods
- `showId(name: number)` - Display avatar with specified number

## Interaction Instructions

### Drag and Scroll
1. User drags up and down on the screen
2. The selector moves with the finger, avatar nodes produce displacement and scaling effects
3. After releasing, automatically snaps to the nearest avatar position

### Click Selection
1. User directly clicks on an avatar node
2. The selector automatically scrolls, moving the clicked avatar to the center position
3. Trigger selection event, update currently selected index

### Visual Effects
- **Center Avatar**: Maximum scaling (1.0x), fully opaque
- **Adjacent Avatars**: Medium scaling (0.65x), fully opaque
- **Edge Avatars**: Smaller scaling (0.5x), gradually transparent
- **Connecting Lines**: Dynamic connecting lines from center to all avatars, transparency changes with distance

## Data Binding

### Data Format
```typescript
dataList: any[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
```

### Data Mapping Logic
- Uses virtual indexing to achieve infinite loop
- 7 UI nodes dynamically map to 16 data items
- Supports data lists of any length

## Usage Instructions

### 1. Scene Setup
- Open the `Head.scene` scene
- Ensure the `RoleSelector` component is correctly mounted

### 2. Configure Parameters
Adjust the following parameters in the editor:
- `headPrefab` - Avatar node prefab
- `graphics` - Graphics component (for drawing connecting lines)
- `headContainer` - Avatar container node
- `headLabel` - Information display label

### 3. Customize Data
```typescript
// Modify dataList in onLoad()
this.dataList = [your data array];
```

### 4. Get Selected Item
```typescript
const selector = this.node.getComponent(RoleSelector);
const selectedIndex = selector.getHeadIndex();
```

## Technical Features

### Performance Optimization
- **Object Pool**: Reuse avatar nodes, reducing creation and destruction overhead
- **On-demand Updates**: Only update bindings when data changes
- **Smooth Animation**: Use exponential decay instead of linear interpolation, reducing computational load

### Interaction Optimization
- **Click Judgment**: Distinguish between drag and click operations
- **Inertia Scrolling**: Automatically snap to nearest position after release
- **Shortest Path**: When clicking an avatar, automatically choose the shortest scrolling path

### Visual Optimization
- **Non-linear Mapping**: Avatar spacing decreases with distance, enhancing visual hierarchy
- **Dynamic Opacity**: Edge avatars gradually disappear, highlighting the center item
- **Adaptive Scaling**: Adjust avatar size dynamically based on position

## Extension Suggestions

### 1. Event System
```typescript
// Send global event when selection changes
this.node.emit('head-selected', { index: this.selectedIndex, data: this.dataList[currentDataIdx] });
```

### 2. Sound Feedback
```typescript
// Play sound effects during switching
AudioMgr.instance.playOneShot("gears");
```

### 3. Custom Styling
Modify the configuration table in `updateHeadVisual()`:
```typescript
const angleMap = [0, 25, 46, 60, 95];  // Adjust angle spacing
const scaleMap = [1.0, 0.65, 0.6, 0.5, 0.5];  // Adjust scaling ratios
const opacityMap = [255, 255, 255, 0, 0];  // Adjust opacity
```


## Dependencies

- Cocos Creator 3.x
- TypeScript
- Built-in components: Sprite, Label, Graphics, NodePool, UIOpacity

## Important Notes

1. **Avatar Count**: Current configuration is 7 UI nodes, adjust `totalHeadCount` as needed
2. **Image Resources**: Ensure the number of images in `headSpriteFrameArr` matches the data
3. **Performance Considerations**: For large data volumes, consider paginated loading
4. **Touch Events**: Ensure nodes have touch event listeners enabled

## Version History

- v1.0.0 - Initial version
  - Implement basic circular layout
  - Support drag and click interactions
  - Implement infinite loop scrolling
  - Add object pool optimization

## License

This project is for learning and reference purposes only.

## Contact Information

If you have questions or suggestions, please provide feedback.
