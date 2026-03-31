import {
    _decorator,
    Color,
    Component,
    EventTouch,
    Graphics,
    Input,
    instantiate,
    Label,
    math,
    Node,
    NodePool,
    Prefab,
    UIOpacity,
    Vec2,
    Vec3
} from 'cc';
import RoleHeadNode from "./RoleHeadNode";

const {ccclass, property} = _decorator;

@ccclass('RoleSelector')
export class RoleSelector extends Component {

    @property(Prefab)
    private headPrefab: Prefab = null!;
    @property({type: Graphics})
    private graphics: Graphics = null;
    @property(Node)
    private headContainer: Node = null;
    @property(Label)
    private headLabel: Label = null;

    // --- 视觉参数 ---
    private circleRadius: number = 360;            // 圆半径
    private totalHeadCount: number = 12;           // 总头像数量 (360/30)
    private headSpacing: number = 36;              // 头像间距（度）

    // --- 数据与对象池 ---
    private headPool: NodePool = new NodePool();
    private activeHeads: Node[] = [];
    private headData: Array<{ node: Node, index: number }> = [];

    // 【新增】数据列表 (你可以从外部传入或读取配置)
    public dataList: any[] = [];
    private lastVirtualIndex: number = -9999;      // 用于优化，避免重复渲染

    // --- 状态与交互参数 ---
    private selectedIndex: number = -1;            // 当前选中的【UI节点索引】 (0~11)

    // 运动学角度 (不再限制在 -180~180 范围内，无限累加确保动画连续性)
    private currentRotation: number = 0;
    private targetRotation: number = 0;

    private isDragging: boolean = false;
    private isAnimating: boolean = false;          // 是否在自动滚动中
    private velocity: number = 5;                  // 滑动松手时的瞬时速度

// --- 手感微调参数 ---
    private dragSensitivity: number = 0.15;         // 拖拽灵敏度 (0.1太重了，0.3更跟手)
    private snapSpeed: number = 15.0;              // 吸附插值速度 (从 1.0 提升到 15.0，解决回弹缓慢)
    private inertiaFactor: number = 0.15;          // 惯性预测系数 (配合新的灵敏度调小，避免一划飞出几十个)

    // 拖拽采样
    private lastTouchY: number = 0;
    private lastTouchTime: number = 0;

    private touchStartPos: Vec2 = new Vec2();      // 记录按下时的初始位置
    private isClickValid: boolean = true;          // 是否为合法点击

    onLoad() {
        this.dataList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

        // 【修改点1】：写死我们只需要 7 个节点 (中心1个 + 上3个 + 下3个)
        this.totalHeadCount = 7;

        // headSpacing=36 依然保留，但它现在只是一个“滑动阻力/单位步长”的概念
        this.generateHeads();
        this.initGraphics();

        this.currentRotation = 0;
        this.targetRotation = 0;
        this.updateVisuals();

        console.log(`头像选择器初始化完成，总节点数: ${this.totalHeadCount}, 逻辑间距: ${this.headSpacing}`);
    }

    onEnable() {
        this.node.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onDisable() {
        this.node.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    // ==========================================
    // 核心交互与运动逻辑
    // ==========================================

    private onTouchStart(event: EventTouch) {
        this.isDragging = true;
        this.isAnimating = false;
        this.isClickValid = true; // 每次按下时，默认这是一次合法点击

        const loc = event.getUILocation();
        this.touchStartPos = loc.clone(); // 记录起始点
        this.lastTouchY = loc.y;
        this.lastTouchTime = Date.now();
        this.velocity = 0;
    }

    private onTouchMove(event: EventTouch) {
        if (!this.isDragging) return;

        const loc = event.getUILocation();

        // 【新增】：如果手指移动距离超过了 10 像素，说明用户在“拖拽”，取消点击资格
        if (Vec2.distance(this.touchStartPos, loc) > 10) {
            this.isClickValid = false;
        }

        const currentTime = Date.now();
        const deltaY = loc.y - this.lastTouchY;
        const deltaTime = (currentTime - this.lastTouchTime) / 1000;

        this.currentRotation -= deltaY * this.dragSensitivity;

        if (deltaTime > 0.001) {
            const instantVelocity = -(deltaY * this.dragSensitivity) / deltaTime;
            this.velocity = math.lerp(this.velocity, instantVelocity, 0.5);
        }

        this.lastTouchY = loc.y;
        this.lastTouchTime = currentTime;
        this.updateVisuals();
    }

    private onTouchEnd(event: EventTouch) {
        if (!this.isDragging) return;
        this.isDragging = false;

        // 如果这是一次合法点击，父节点直接放弃惯性滚动，把控制权完全交给 onClickHead
        if (this.isClickValid) {
            this.velocity = 0;
            return;
        }

        // --- 下面是常规的滑动松手后的吸附逻辑 ---
        if (Math.abs(this.velocity) < 10) {
            this.velocity = 0;
        }

        const predictedAngle = this.currentRotation + this.velocity * this.inertiaFactor;
        let targetGridAngle = Math.round(predictedAngle / this.headSpacing) * this.headSpacing;

        this.targetRotation = targetGridAngle;
        this.isAnimating = true;
    }

    update(deltaTime: number) {
        if (!this.isDragging && this.isAnimating) {
            // 使用独立于帧率的指数衰减公式，比普通 lerp 更加平滑且干脆
            const t = 1 - Math.exp(-this.snapSpeed * deltaTime);
            this.currentRotation = math.lerp(this.currentRotation, this.targetRotation, t);

            // 将停止阈值从 0.05 放宽到 0.5，视觉上看不出差别，但能瞬间停稳并节省性能
            if (Math.abs(this.currentRotation - this.targetRotation) < 0.5) {
                this.currentRotation = this.targetRotation;
                this.isAnimating = false;
            }
            this.updateVisuals();
        }
    }

    // ==========================================
    // 视觉计算与对象生成
    // ==========================================
    private updateVisuals() {
        this.headContainer.setRotationFromEuler(0, 0, this.currentRotation);

        // 1. 计算【虚拟总步数】 (相当于一共滚动了多少格)
        let virtualIndex = Math.round(this.currentRotation / this.headSpacing);

        // 2. 计算当前最左侧居中的【UI节点索引】(0~11)
        let nearestIndex = (virtualIndex % this.totalHeadCount + this.totalHeadCount) % this.totalHeadCount;

        if (this.selectedIndex !== nearestIndex) {
            this.selectedIndex = nearestIndex;
            // AudioMgr.instance.playOneShot("齿轮");
            //TODO:这里是选中某个数据,最好在这里发送一个全局事件,需要改变的UI接收事件即可
        }

        // 3. 将数据映射到 UI 节点上
        this.updateDataBinding(virtualIndex);

        if (this.headLabel) {
            // 获取当前选中的实际数据索引用于展示
            const L = this.dataList.length;
            const currentDataIdx = ((virtualIndex % L) + L) % L;
            this.headLabel.string = `转角: ${this.currentRotation.toFixed(0)}° | UI节点: ${this.selectedIndex} | 数据index: [${currentDataIdx}]`;
        }
        // 改成这样：
        for (let i = 0; i < this.headData.length; i++) {
            this.updateHeadVisual(this.headData[i]); // 传入整个数据对象
        }

        this.updateGraphicsLines();
    }

    /**
     * 【核心新增】将无限循环的数据映射到 12 个 UI 节点上
     */
    private updateDataBinding(virtualIndex: number) {
        // 优化：如果滚动步数没变，不需要重复刷新数据
        if (this.lastVirtualIndex === virtualIndex) return;
        this.lastVirtualIndex = virtualIndex;

        const L = this.dataList.length;
        if (L === 0) return;

        const N = this.totalHeadCount; // 12

        // 计算当前中心点对应的数据索引 (保证为正数 0 ~ L-1)
        const centerDataIndex = ((virtualIndex % L) + L) % L;

        for (let i = 0; i < this.headData.length; i++) {
            const headObj = this.headData[i];
            const nodeIndex = headObj.index; // 0 ~ 11

            // 计算该节点相对于中心点 selectedIndex 的最短距离偏移 (-6 到 5)
            // 举例: selectedIndex=2, nodeIndex=1 -> offset=-1 (下边第1个)
            //      selectedIndex=2, nodeIndex=3 -> offset=1  (上边第1个)
            //      selectedIndex=0, nodeIndex=11 -> offset=-1 (跨越边界，下边第1个)
            let offset = nodeIndex - this.selectedIndex;
            offset = ((offset + N / 2) % N + N) % N - N / 2;

            // 根据偏移量算出它应该显示哪一个数据 (保证为正数 0 ~ L-1)
            const targetDataIndex = ((centerDataIndex + offset) % L + L) % L;

            // 获取对应的数据
            const dataItem = this.dataList[targetDataIndex];

            // 传递给子节点进行渲染更新
            const roleHead = headObj.node.getComponent(RoleHeadNode);
            if (roleHead) {
                // 这里调用你头像节点的具体更新方法，例如传入数据和下标
                // roleHead.updateInfo(dataItem);
                // 暂时复用你的 showId 作为演示，把绑定的数据索引传进去看看效果
                roleHead.showId(dataItem);
            }
        }
    }

    private generateHeads() {
        this.clearHeads();

        const startAngleDeg = 180;

        for (let i = 0; i < this.totalHeadCount; i++) {
            let headNode = this.getHeadNode();
            if (!headNode) continue;

            headNode.parent = this.headContainer;
            this.activeHeads.push(headNode);

            const angleDeg = startAngleDeg - i * this.headSpacing;
            const angleRad = angleDeg * Math.PI / 180;

            const x = this.circleRadius * Math.cos(angleRad);
            const y = this.circleRadius * Math.sin(angleRad);
            headNode.setPosition(new Vec3(x, y, 0));

            this.headData.push({node: headNode, index: i});

            headNode.on(Node.EventType.TOUCH_END, () => {
                console.log( `选中了第 ${i} 个头像节点` )
                this.onClickHead(i);
            }, this);
        }
    }

    /**
     * 【全新重构】基于“逻辑步长”的非线性视觉映射
     */
    private updateHeadVisual(headObj: { node: Node, index: number }) {
        // 1. 计算整个逻辑循环的周长 (7 个节点 * 36 步距 = 252 逻辑度)
        const logicalCircle = this.totalHeadCount * this.headSpacing;

        // 2. 算出这个节点在逻辑轨道上的固定位置
        const logicalLocalAngle = 180 - headObj.index * this.headSpacing;
        const worldAngle = logicalLocalAngle + this.currentRotation;

        // 3. 计算它距离中心点 (180度) 有多少“逻辑度”偏差
        let diffAngle = (worldAngle - 180) % logicalCircle;

        // 确保偏差值规范在 -126 到 126 之间 (刚好对应 -3.5 到 +3.5 个节点)
        if (diffAngle > logicalCircle / 2) diffAngle -= logicalCircle;
        if (diffAngle < -logicalCircle / 2) diffAngle += logicalCircle;

        // 4. 算出它是距离中心的第几个【逻辑步数】 (-3 到 +3 的连续浮点数)
        // 例如：0 就是最左边选中，1 就是下一个，1.5 就是滑到一半
        const logicalStep = diffAngle / this.headSpacing;
        const absStep = Math.abs(logicalStep);     // 取绝对值 (用来查表)
        const sign = Math.sign(logicalStep) || 1;  // 判断是偏上还是偏下

        // ==========================================
        // 🚀 核心配置表：你可以随心所欲修改这里的数值来调手感！
        // 数组索引对应：[中心0个, 偏离1个, 偏离2个, 偏离3个, 偏离4个(缓冲边界)]
        // ==========================================
        // ① 视觉角度差：决定它们在圆环上的物理间距 (递减，所以间距越来越小)
        const angleMap = [0, 25, 46, 60, 95]; // 间距分别是: 36, 26, 18, 15
        // ② 缩放配置：精准控制每一个顺位的缩放大小
        const scaleMap = [1.0, 0.65, 0.6, 0.5, 0.5];
        // ③ 透明度配置：中心最亮，边缘消失
        const opacityMap = [255, 255, 255, 0, 0];

        // 5. 根据连续的 step 进行数组间的【线性插值】
        const floor = Math.floor(absStep);
        const frac = absStep - floor;
        const safeFloor = Math.min(floor, angleMap.length - 2); // 防越界

        // 算出最终要显示的 角度、缩放、透明度
        const visualDiffAngle = math.lerp(angleMap[safeFloor], angleMap[safeFloor + 1], frac);
        const targetScale = math.lerp(scaleMap[safeFloor], scaleMap[safeFloor + 1], frac);
        const targetOpacity = math.lerp(opacityMap[safeFloor], opacityMap[safeFloor + 1], frac);

        // 6. 将“视觉角度差”转换为屏幕上的坐标
        const finalWorldAngle = 180 + sign * visualDiffAngle;

        // 因为你的 headContainer 还在旋转，我们减去它的旋转，算出相对于容器的 local 角度
        const localAngleRad = (finalWorldAngle - this.currentRotation) * Math.PI / 180;

        const x = this.circleRadius * Math.cos(localAngleRad);
        const y = this.circleRadius * Math.sin(localAngleRad);

        // 应用位移和缩放
        headObj.node.setPosition(new Vec3(x, y, 0));
        headObj.node.setScale(new Vec3(targetScale, targetScale, 1));

        // // 应用透明度
        let uiOpacity = headObj.node.getComponent(UIOpacity) || headObj.node.addComponent(UIOpacity);
        uiOpacity.opacity = Math.round(targetOpacity);

        // 抵消容器旋转，使头像始终正立
        headObj.node.angle = -this.currentRotation;
    }

    private initGraphics() {
        if (this.graphics) {
            this.graphics.lineWidth = 2;
            this.graphics.strokeColor = new Color(255, 255, 255, 100);
        }
    }

    private updateGraphicsLines() {
        if (!this.graphics) return;
        this.graphics.clear();

        for (let i = 0; i < this.headData.length; i++) {
            const pos = this.headData[i].node.getPosition();
            const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
            const opacity = Math.max(50, 255 - (dist / this.circleRadius) * 100);

            this.graphics.strokeColor = new Color(255, 255, 255, opacity);
            this.graphics.moveTo(0, 0);
            this.graphics.lineTo(pos.x, pos.y);
            this.graphics.lineWidth = 1; // 线宽，可以根据需要调整
            this.graphics.stroke();
        }
        // 画一个圆表示轨道
        this.graphics.strokeColor = new Color(150, 150, 150, 100);
        this.graphics.lineWidth = 2; // 线宽，可以根据需要调整
        this.graphics.circle(0, 0, this.circleRadius);
        this.graphics.stroke();
    }

    private onClickHead(clickedNodeIndex: number) {
        // 直接判断是否为合法点击，完美避开事件执行先后顺序的问题！
        if (!this.isClickValid) return;

        // 1. 获取总节点数 (当前为 7)
        const N = this.totalHeadCount;

        // 2. 计算从“当前选中节点”到“点击节点”的步数差
        let diff = clickedNodeIndex - this.selectedIndex;

        // 3. 寻找最短路径 (例如从 0 到 6，其实是往下走 1 步，转换为 -1)
        const half = Math.floor(N / 2);
        if (diff > half) {
            diff -= N;
        } else if (diff < -half) {
            diff += N;
        }

        // 4. 如果点击的就是当前正中心的节点，不执行任何操作
        if (diff === 0) return;

        // 5. 计算目标角度：找到当前准确的“网格对齐角度”，并加上需要转动的逻辑度数
        const currentGridAngle = Math.round(this.currentRotation / this.headSpacing) * this.headSpacing;
        this.targetRotation = currentGridAngle + diff * this.headSpacing;

        // 6. 开启插值动画，让 update 自动平滑滚动过去
        this.isAnimating = true;
    }

    private getHeadNode(): Node {
        return this.headPool.size() > 0 ? this.headPool.get() : instantiate(this.headPrefab);
    }

    private clearHeads() {
        this.activeHeads.forEach(head => this.headPool.put(head));
        this.activeHeads = [];
        this.headData = [];
        if (this.graphics) this.graphics.clear();
    }

    public getHeadIndex(){
        return this.selectedIndex;
    }
}