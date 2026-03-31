import { _decorator, Component, EffectAsset, Enum, Vec2, Sprite, Material, UITransform, warn, Label, SpriteFrame } from 'cc';
const { ccclass, property, requireComponent, executeInEditMode } = _decorator;

@ccclass('RoleHeadNode')
export default class RoleHeadNode extends Component {
    @property(Sprite)
    private head: Sprite = null;
    @property([SpriteFrame])
    private headSpriteFrameArr: SpriteFrame[] = [];
    @property(Label)
    private label: Label = null;


    protected onLoad() {
        this.init();
    }

    private init() {
        this.label.string = "";
    }


    showId(name: number) {
        this.label.string = `${name}`;
        this.head.spriteFrame = this.headSpriteFrameArr[name];
    }


}
