# Assets 项目说明

## 项目概述

本项目是一个基于 Cocos Creator 的角色头像选择器组件，实现了圆形布局的无限循环滚动选择功能。通过流畅的动画效果和直观的交互体验，用户可以轻松选择不同的角色头像。

## 目录结构

```
assets/
├── head/                          # 头像选择器核心模块
│   ├── RoleHeadNode.ts           # 头像节点组件
│   ├── RoleHeadNode.prefab       # 头像节点预制体
│   ├── RoleSelector.ts           # 角色选择器主组件
│   ├── image/                    # 头像图片资源
│   │   ├── *.jpg                 # 角色头像图片（16张）
│   │   └── image.meta            # 图片资源元数据
│   ├── sprite-radius.effect      # 圆形精灵特效
│   ├── sprite-radius.mtl         # 圆形精灵材质
│   └── head.meta                 # 模块元数据
├── Head.scene                    # 头像选择器场景文件
└── README.md                     # 本文档
```

## 核心组件

### 1. RoleSelector（角色选择器）

主控制器组件，负责整个选择器的交互逻辑和动画效果。

#### 主要功能
- **圆形布局**：将头像节点按圆形排列，形成环形选择器
- **无限循环**：支持数据的无限循环滚动，无边界限制
- **平滑动画**：使用指数衰减算法实现流畅的吸附动画
- **触摸交互**：支持拖拽滑动和点击选择两种交互方式
- **对象池优化**：使用 NodePool 管理头像节点，提升性能

#### 关键参数
```typescript
// 视觉参数
circleRadius: 360;           // 圆半径
totalHeadCount: 7;           // 总头像节点数（中心1个 + 上3个 + 下3个）
headSpacing: 36;             // 头像间距（度）

// 手感参数
dragSensitivity: 0.15;       // 拖拽灵敏度
snapSpeed: 15.0;             // 吸附插值速度
inertiaFactor: 0.15;         // 惯性预测系数
```

#### 核心方法
- `onTouchStart()` - 触摸开始处理
- `onTouchMove()` - 触摸移动处理
- `onTouchEnd()` - 触摸结束处理
- `updateVisuals()` - 更新视觉效果
- `updateDataBinding()` - 数据绑定更新
- `onClickHead()` - 点击头像处理
- `getHeadIndex()` - 获取当前选中的索引

### 2. RoleHeadNode（头像节点）

单个头像节点的显示组件。

#### 主要功能
- 显示角色头像图片
- 显示角色编号标签
- 支持动态切换头像内容

#### 属性
```typescript
head: Sprite;                  // 头像精灵组件
headSpriteFrameArr: SpriteFrame[]; // 头像图片数组
label: Label;                  // 编号标签组件
```

#### 核心方法
- `showId(name: number)` - 显示指定编号的头像

## 交互说明

### 拖拽滑动
1. 用户在屏幕上上下拖动
2. 选择器跟随手指移动，头像节点产生位移和缩放效果
3. 松手后自动吸附到最近的头像位置

### 点击选择
1. 用户直接点击某个头像节点
2. 选择器自动滚动，将点击的头像移动到中心位置
3. 触发选中事件，更新当前选中索引

### 视觉效果
- **中心头像**：最大缩放（1.0x），完全不透明
- **相邻头像**：中等缩放（0.65x），完全不透明
- **边缘头像**：较小缩放（0.5x），逐渐透明
- **连接线**：从中心到各头像的动态连线，透明度随距离变化

## 数据绑定

### 数据格式
```typescript
dataList: any[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
```

### 数据映射逻辑
- 使用虚拟索引实现无限循环
- 7个UI节点动态映射到16个数据项
- 支持任意长度的数据列表

## 使用方法

### 1. 场景设置
- 打开 `Head.scene` 场景
- 确保 `RoleSelector` 组件已正确挂载

### 2. 配置参数
在编辑器中调整以下参数：
- `headPrefab` - 头像节点预制体
- `graphics` - 绘图组件（用于绘制连接线）
- `headContainer` - 头像容器节点
- `headLabel` - 信息显示标签

### 3. 自定义数据
```typescript
// 在 onLoad() 中修改 dataList
this.dataList = [你的数据数组];
```

### 4. 获取选中项
```typescript
const selector = this.node.getComponent(RoleSelector);
const selectedIndex = selector.getHeadIndex();
```

## 技术特点

### 性能优化
- **对象池**：复用头像节点，减少创建销毁开销
- **按需更新**：只在数据变化时更新绑定
- **平滑动画**：使用指数衰减替代线性插值，减少计算量

### 交互优化
- **点击判定**：区分拖拽和点击操作
- **惯性滚动**：松手后自动吸附到最近位置
- **最短路径**：点击头像时自动选择最短滚动路径

### 视觉优化
- **非线性映射**：头像间距随距离递减，增强视觉层次
- **动态透明度**：边缘头像逐渐消失，突出中心项
- **自适应缩放**：根据位置动态调整头像大小

## 扩展建议

### 1. 事件系统
```typescript
// 在选中变化时发送全局事件
this.node.emit('head-selected', { index: this.selectedIndex, data: this.dataList[currentDataIdx] });
```

### 2. 音效反馈
```typescript
// 在切换时播放音效
AudioMgr.instance.playOneShot("齿轮");
```

### 3. 自定义样式
修改 `updateHeadVisual()` 中的配置表：
```typescript
const angleMap = [0, 25, 46, 60, 95];  // 调整角度间距
const scaleMap = [1.0, 0.65, 0.6, 0.5, 0.5];  // 调整缩放比例
const opacityMap = [255, 255, 255, 0, 0];  // 调整透明度
```


## 依赖项

- Cocos Creator 3.x
- TypeScript
- 内置组件：Sprite, Label, Graphics, NodePool, UIOpacity

## 注意事项

1. **头像数量**：当前配置为7个UI节点，可根据需要调整 `totalHeadCount`
2. **图片资源**：确保 `headSpriteFrameArr` 中的图片数量与数据匹配
3. **性能考虑**：数据量过大时建议分页加载
4. **触摸事件**：确保节点已启用触摸事件监听

## 版本历史

- v1.0.0 - 初始版本
  - 实现基础圆形布局
  - 支持拖拽和点击交互
  - 实现无限循环滚动
  - 添加对象池优化

## 许可证

本项目仅供学习和参考使用。

## 联系方式

如有问题或建议，欢迎反馈。
