// TypeScript file
class RoomScence extends eui.UILayer {

    constructor() {
        super()
        this.init()
    }

    private roomInfo: eui.Label
    private init() {
        this.roomInfo = new eui.Label("Room: \n")
        this.roomInfo.width =this.width
        this.roomInfo.height = 900
        let scroll: eui.Scroller = new eui.Scroller();
        scroll.x = 0
        scroll.y = this.height - this.roomInfo.height
        scroll.addChild(this.roomInfo)
        this.addChild(scroll)

        //功能按钮
        let moduelGroup: eui.Group = new eui.Group()
        moduelGroup.layout = new eui.LinearLayoutBase();
        moduelGroup.y = 50
        this.addChild(moduelGroup)
        let join: eui.Button = new eui.Button()
        join.x = 30
        join.label = "加入房间"
        join.addEventListener(egret.TouchEvent.TOUCH_TAP, ()=>{
            Room.Matchvs._ins.joinRoomRandom(3, Room.Matchvs._ins.buildJoinUserProfile())
        }, this)
        moduelGroup.addChild(join)

        let leave: eui.Button = new eui.Button()
        leave.x = 160
        leave.label = "离开房间"
        leave.addEventListener(egret.TouchEvent.TOUCH_TAP, ()=>{
            Room.Matchvs._ins.leaveRoom("老子要离开了")
        }, this)
        moduelGroup.addChild(leave)

        let kick: eui.Button = new eui.Button()
        kick.x = 290
        kick.label = "踢人"
        kick.addEventListener(egret.TouchEvent.TOUCH_TAP, ()=>{
            // Room.Matchvs._ins.kickPlayer()
        }, this)
        moduelGroup.addChild(kick)

        let room: eui.Button = new eui.Button()
        room.x = 420
        room.label = "房间详情"
        room.addEventListener(egret.TouchEvent.TOUCH_TAP, ()=>{
            Room.Matchvs._ins.getJoinRoomDetail()
        }, this)
        moduelGroup.addChild(room)


        //消息按钮
        let msgGroup: eui.Group = new eui.Group()
        msgGroup.layout = new eui.LinearLayoutBase();
        msgGroup.y = 150
        msgGroup.x = 0
        this.addChild(msgGroup)

        let edit: eui.EditableText = new eui.EditableText();
        edit.width = 100
        edit.x = 30
        edit.background = true
        edit.backgroundColor = 0x000000
        edit.textColor = 0xffffff
        msgGroup.addChild(edit)
        let send: eui.Button = new eui.Button()
        send.x = 130
        send.label = "发送消息"
        send.addEventListener(egret.TouchEvent.TOUCH_TAP, ()=>{
            Room.Matchvs._ins.sendEvent(edit.text)
        }, this)
        msgGroup.addChild(send)

        let edit1: eui.EditableText = new eui.EditableText();
        edit1.width = 100
        edit1.x = 260
        edit1.background = true
        edit1.backgroundColor = 0x000000
        edit1.textColor = 0xffffff
        msgGroup.addChild(edit1)
        let multiSend: eui.Button = new eui.Button()
        multiSend.x = 360
        multiSend.label = "发送多条消息"
        multiSend.addEventListener(egret.TouchEvent.TOUCH_TAP, ()=>{
            let num = parseInt(edit1.text)
            for (let i = 0; i < num; i++)
                Room.Matchvs._ins.sendEvent("连续消息 " + i)
        }, this)
        msgGroup.addChild(multiSend)
    }

    private showInfo(info: string) {
        this.roomInfo.text = this.roomInfo.text + info + " \n"
    }
}