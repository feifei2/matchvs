module Room {
	/**
	 * matchvs流程：
	 * 1.自动注册用户->登录用户
	 * 注意事项：
	 * 1.客户端网络异常（包含网络关闭、弱网络、挂起至后台等情况）
	 * 2.玩家断线20秒内可调用reconnect接口重连到原来房间()
	 */
	export class Matchvs {
		private constructor() {
			this.construct();
		}

		private construct() {
			this._engine = new MatchvsEngine();
			this._response = new MatchvsResponse();
			MatchvsLog.closeLog();
			this._engine.init(this._response, "Matchvs", ApiConfig.isDEV() ? "alpha" : "release", ApiConfig.Matchvs_Id);
		}
		/**
		 * 初始化
		 */
		public init() {
			this._response.registerUserResponse = this.registerUserCallback.bind(this);
			this._response.loginResponse = this.loginCallback.bind(this);
			this._response.joinRoomResponse = this.joinRoomRandomCallback.bind(this);
			this._response.joinRoomNotify = this.joinRoomNotifyCallback.bind(this);
			this._response.joinOverResponse = this.joinOverCallback.bind(this);
			this._response.sendEventResponse = this.sendEventCallback.bind(this);
			this._response.sendEventNotify = this.sendEventNotifyCallback.bind(this);
			this._response.leaveRoomResponse = this.leaveRoomCallback.bind(this);
			this._response.leaveRoomNotify = this.leaveRoomNotifyCallback.bind(this);
			this._response.logoutResponse = this.logoutCallback.bind(this);
			if (this._expandModule) {
				this._response.createRoomResponse = this.createRoomCallback.bind(this);
				this._response.setRoomPropertyResponse = this.setRoomPropertyCallback.bind(this);
				this._response.setRoomPropertyNotify = this.setRoomPropertyNotifyCallback.bind(this);
				this._response.getRoomListResponse = this.getRoomListCallback.bind(this);
				this._response.getRoomDetailResponse = this.getRoomDetailCallback.bind(this);
				this._response.kickPlayerResponse = this.kickPlayerCallback.bind(this);
				this._response.kickPlayerNotify = this.kickPlayerNotifyCallback.bind(this);
				this._response.subscribeEventGroupResponse = this.subscribeEventGroupCallback.bind(this);
				this._response.sendEventGroupResponse = this.sendEventGroupCallback.bind(this);
				this._response.sendEventGroupNotify = this.sendEventGroupNotifyCallback.bind(this);
				this._response.setFrameSyncResponse = this.setFrameSyncCallback.bind(this);
				this._response.frameUpdate = this.frameUdpateCallback.bind(this);
			}
			//网络回调
			this._response.errorResponse = this.errorCallback.bind(this);
			this._response.networkStateNotify = this.networkStateNotifyCallback.bind(this);
			this._response.reconnectResponse = this.reconnectCallback.bind(this);
			//服务端消息推送
			this._response.gameServerNotify = this.gameServerNotifyCallback.bind(this);

			let register = this._engine.registerUser();
			log.logcat.console("注册用户：", register, this.MatchvsLog(register))
			if (0 != register)
				this.retryLogin();
		}

		private static _instance: Matchvs;
		private _engine: MatchvsEngine;
		private _response: MatchvsResponse;
		private _expandModule: boolean = true;//MatchvsSDK 扩展功能是否使用
		//data
		private userInfo: MsRegistRsp;
		public static get _ins(): Matchvs {
			if (!Matchvs._instance || null == Matchvs._instance) {
				Matchvs._instance = new Matchvs();
			}
			return Matchvs._instance;
		}

		///////////////////////////////////////////////////////Matchvs流程
		/**
		 * 注册matchvs成功接口（自动登录）
		 */
		private registerUserCallback(userInfo: MsRegistRsp) {
			log.logcat.console("注册用户成功，用户信息 ", userInfo, this.MatchvsLog(userInfo.status))
			this.userInfo = userInfo;
			this.doLogin();
		}
		/**
		 * 登录matchvs成功接口
		 */
		private loginCallback(loginRsp: MsLoginRsp) {
			log.logcat.console("登录用户请求结果：", loginRsp, this.MatchvsLog(loginRsp.status))
			if (loginRsp.status === 200) {
				this.isUserLogined = true;
				this.completeRetryLogin();
				if (loginRsp.roomID && parseInt(loginRsp.roomID) > 0) {
					//上次异常登出，自动重连房间
					if (this.maxPlayer > 0)
						this.joinRoomRandom(this.maxPlayer, this.buildJoinUserProfile());
				}
			}
		}
		/**
		 * 用户创建/加入房间
		 */
		private joinRoomRandomCallback(status: number, roomUserInfoList: Array<MsRoomUserInfo>, roomInfo: MsRoomInfo) {
			log.logcat.console("加入成功，用户信息 ", status, roomUserInfoList, roomInfo, this.userInfo, this.MatchvsLog(status))
			if (status == 200) {
				this.roomInfo = roomInfo;
				this.playerInRoom = roomUserInfoList.length;
				this.playerInRoom++;//加上用户自己
				//我是房主
				if (roomInfo.ownerId === this.userInfo.userID) {//添加房间属性
					this.matchvsRoomProperty.maxPlayer = this.maxPlayer;
					this.matchvsRoomProperty.roomID = roomInfo.roomID;
					this.roomInfo.roomProperty = this.buildJoinRoomProperty();
					this.setRoomProperty(roomInfo.roomID, this.buildJoinRoomProperty())
				}
				if (this.playerInRoom >= this.maxPlayer)//房间人数已满，加入结束函数
					this.joinOver("当前加入人数已满 " + this.maxPlayer);
			}
		}
		/**
		 * 房间里有其它用户加入
		 */
		private joinRoomNotifyCallback(roomUserInfo: MsRoomUserInfo) {
			this.playerInRoom++;
			if (this.playerInRoom >= this.maxPlayer)//房间人数已满，加入结束函数
				this.joinOver("当前加入人数已满 " + this.maxPlayer);
			log.logcat.console("其他用户加入成功，用户信息 ", roomUserInfo, "最大人数 " +  this.maxPlayer, " 当前已有人数 " + this.playerInRoom)
		}
		/**
		 * 停止加入的回调
		 */
		private joinOverCallback(joinOverRsp: MsJoinOverRsp) {
			log.logcat.console("房间禁止加人成功 ", joinOverRsp, this.MatchvsLog(joinOverRsp.status))
		}
		/**
		 * 数据发送给其他玩家(除自己以外的所有用户)回调
		 */
		private sendEventCallback(sendEventRsp: MsSendEventRsp) {
			log.logcat.console("数据发送成功 ", sendEventRsp, this.MatchvsLog(sendEventRsp.status))
		}
		/**
		 * 收到其他玩家消息的回调
		 */
		private sendEventNotifyCallback(eventInfo: MsSendEventNotify) {
			log.logcat.console("收到其他玩家消息成功 ", eventInfo)
		}
		/**
		 * 自己离开房间回调
		 */
		private leaveRoomCallback(leaveRoomRsp: MsLeaveRoomRsp) {
			log.logcat.console("自己离开房间成功 ", leaveRoomRsp, this.MatchvsLog(leaveRoomRsp.status))
		}
		/**
		 * 其他成员离开房间回调
		 */
		private leaveRoomNotifyCallback(leaveRoomInfo: MsLeaveRoomNotify) {
			this.playerInRoom--;
			log.logcat.console("其他成员离开房间成功 ", leaveRoomInfo)
		}
		/**
		 * 游戏登出回调
		 */
		private logoutCallback(status: number) {
			log.logcat.console("游戏登出成功 ", status, this.MatchvsLog(status))
			this._engine.uninit();
		}
		/**
		 * 创建房间回调(用户主动创建)
		 */
		private createRoomCallback(rsp: MsCreateRoomRsp) {
			log.logcat.console("用户主动创建成功 ", rsp, this.MatchvsLog(rsp.status))
		}
		/**
		 * 设置房间属性回调
		 */
		private setRoomPropertyCallback(rsp: MsSetRoomPropertyRspInfo) {
			log.logcat.console("设置房间属性回调 ", rsp, this.MatchvsLog(rsp.status))
		}
		/**
		 * 接收到房主设置房间属性
		 */
		private setRoomPropertyNotifyCallback(notify: MsRoomPropertyNotifyInfo) {
			log.logcat.console("接收到房主设置房间属性 ", notify)
		}
		/**
		 * 查看房间列表回调(用户主动创建的房间列表)
		 */
		private getRoomListCallback(status: number, roomInfos: Array<MsRoomInfoEx>) {
			log.logcat.console("用户主动创建房间列表成功 ", status, roomInfos, this.MatchvsLog(status))
		}
		/**
		 * 获取房间详细信息回调
		 */
		private getRoomDetailCallback(rsp: MsGetRoomDetailRsp) {
			log.logcat.console("获取房间详细信息回调成功 ", rsp, this.MatchvsLog(rsp.status))
		}
		/**
		 * 房间内的玩家踢出房间回调
		 */
		private kickPlayerCallback(rsp: MsKickPlayerRsp) {
			log.logcat.console("房间内的玩家踢出房间成功 ", rsp, this.MatchvsLog(rsp.status))
		}
		/**
		 * 收到踢人的消息回调
		 */
		private kickPlayerNotifyCallback(knotify: MsKickPlayerNotify) {
			log.logcat.console("房间内的玩家被踢出房间成功 ", knotify)
		}
		/**
		 * 消息订阅组回调
		 */
		private subscribeEventGroupCallback(status: number, groups: Array<string>) {
			log.logcat.console("房间内的玩家踢出房间成功 ", status, groups, this.MatchvsLog(status))
		}
		/**
		 * 分组消息发送回调
		 */
		private sendEventGroupCallback(status: number, dstNum: number) {
			log.logcat.console("分组消息发送成功 ", status, dstNum, this.MatchvsLog(status))
		}
		/**
		 * 收到分组消息回调
		 */
		private sendEventGroupNotifyCallback(srcUserID: number, groups: Array<string>, cpProto: string) {
			log.logcat.console("收到分组消息回调成功 ", srcUserID, groups, cpProto)
		}
		/**
		 * 设置帧同步回调
		 */
		private setFrameSyncCallback(rsp: MsSetChannelFrameSyncRsp) {
			log.logcat.console("设置帧同步 ", rsp, this.MatchvsLog(rsp.status))
		}
		/**
		 * 帧同步消息所有玩家调用
		 */
		private frameUdpateCallback(data: MsFrameData) {
			log.logcat.console("帧同步消息 ", data)
		}
		/**
		 * 网络异常
		 */
		private errorCallback(errCode: number, errMsg: string) {
			this.errorTimestamp = Core.ServerTimeUtils.getServerTimeMillis();
			Room.matchvsEventDispatcher.dispatchEvent(new MatchvsEvent(MatchvsEventConstant.MATCHVS_NETWORK_FAIL, false, false));
			log.logcat.console("网络异常 ", errCode, errMsg, this.MatchvsLog(errCode))
		}
		/**
		 * 有其他用户网络状态回调
		 */
		private networkStateNotifyCallback(netnotify: MsNetworkStateNotify) {
			let eventType;
			switch (netnotify.state) {
				case 1:
					eventType = MatchvsEventConstant.MATCHVS_NETWORK_RECONNECTING;
					break;
				case 2:
					eventType = MatchvsEventConstant.MATCHVS_NETWORK_RECONNECTED;
					break;
				case 3:
					eventType = MatchvsEventConstant.MATCHVS_NETWORK_FAIL;
					break;
			}
			Room.matchvsEventDispatcher.dispatchEvent(new MatchvsEvent(eventType, false, false));
			log.logcat.console("有其他用户网络状态 ", netnotify, this.MatchvsLog(netnotify.state))
		}
		/**
		 * 断线重连接口回调(成功则返回加入房间信息)
		 */
		private reconnectCallback(status: number, roomUserInfoList: Array<MsRoomUserInfo>, roomInfo: MsRoomInfo) {
			log.logcat.console("断线重连接口 ", status, roomUserInfoList, roomInfo, this.MatchvsLog(status))
			if (status != 200)
				this.reconnect();
		}
		/**
		 * 收到 来自gameService的消息回调
		 */
		private gameServerNotifyCallback(eventInfo: MsGameServerNotifyInfo) {
			log.logcat.console("服务器推送消息 ", eventInfo)
		}


		///////////////////////////////////////////////////////自定义流程

		/////////////////////Matchvs内部使用
		private roomInfo: MsRoomInfo;
		private isUserInRoom(): boolean {
			return this.roomInfo && null != this.roomInfo;
		}
		private errorTimestamp: number = -1;
		private doLogin() {
			let login = this._engine.login(this.userInfo.id, this.userInfo.token, ApiConfig.Matchvs_Id, ApiConfig.VERSION_INT, ApiConfig.AppKey, ApiConfig.Secret, "1", 0);
			log.logcat.console("登录用户：", login, this.MatchvsLog(login))
			if (0 != login)
				this.retryLogin();
		}
		private isUserRegisted(): boolean {
			return this.userInfo && null != this.userInfo;
		}
		private isUserLogined: boolean = false;
		private isUserAvailable(): boolean {
			return this.isUserRegisted && this.isUserLogined;
		}

		private MAX_COUNT = 3;
		private retryNum = 0;
		private completeRetryLogin() {
			this.retryNum = 0;
		}
		private retryLogin() {
			if (this.retryNum < this.MAX_COUNT) {
				if (this.isUserRegisted()) {
					//登录
					this.doLogin();
				}
			} else {
				this.completeRetryLogin();
				log.logcat.console("登录用户重试失败：")
			}
		}

		/////////////////////Matchvs外部调用
		private maxPlayer: number = -1;
		private playerInRoom: number = 0;
		/**
		 * 随机加入房间(不能超过20玩家)
		 */
		public joinRoomRandom(maxPlayer: number, userProfile: string) {
			if (!this.isUserAvailable()) {
				log.logcat.console("随机房间失败，用户未登录")
				return;
			}
			let join = this._engine.joinRandomRoom(maxPlayer, userProfile);
			if (join === 0)
				this.maxPlayer = maxPlayer;
			log.logcat.console("随机房间结果", join, this.MatchvsLog(join))
		}
		/**
		 * 停止加入(1.当房间用户数量小于上限maxPlayer数量时调用 2.开始游戏后调用，防止中途退出后其他人加入)，房间所有人均可以调用
		 */
		public joinOver(cpProto?: string) {
			if (!this.isUserAvailable()) {
				log.logcat.console("房间停止加人失败，用户未登录")
				return;
			} else if (!this.isUserInRoom()) {
				log.logcat.console("房间停止加人失败，用户未进入到房间")
				return;
			}
			let over = this._engine.joinOver(cpProto ? cpProto : "游戏开始");
			log.logcat.console("房间停止加人", over, this.MatchvsLog(over))
		}
		/**
		 * 发送消息(return {sequence: number, result: number}, sequence 与接口回调 sendEventResponse 收到的 sequence 对应)
		 */
		public sendEvent(data: string) {
			if (!this.isUserAvailable()) {
				log.logcat.console("发送消息失败，用户未登录")
				return;
			} else if (!this.isUserInRoom()) {
				log.logcat.console("发送消息失败，用户未进入到房间")
				return;
			}
			let event = this._engine.sendEvent(data);
			log.logcat.console("发送消息", event, this.MatchvsLog(event.result))
			return event;
		}
		/**
		 * 发送消息(return {sequence: number, result: number}, sequence 与接口回调 sendEventResponse 收到的 sequence 对应)
		 */
		public sendEventEx(msgType: number, data: string, desttype: number, userIDs: Array<number>) {
			if (!this.isUserAvailable()) {
				log.logcat.console("发送消息Ex失败，用户未登录")
				return;
			} else if (!this.isUserInRoom()) {
				log.logcat.console("发送消息Ex失败，用户未进入到房间")
				return;
			}
			let event = this._engine.sendEventEx(msgType, data, desttype, userIDs);
			log.logcat.console("发送消息Ex", event, this.MatchvsLog(event))
			return event;
		}
		/**
		 * 离开房间
		 */
		public leaveRoom(cpProto?: string) {
			if (!this.isUserAvailable()) {
				log.logcat.console("离开房间失败，用户未登录")
				return;
			} else if (!this.isUserInRoom()) {
				log.logcat.console("离开房间失败，用户未进入到房间")
				return;
			}
			let leave = this._engine.leaveRoom(cpProto);
			log.logcat.console("离开房间 ", leave, this.MatchvsLog(leave))
		}
		/**
		 * 用户登出
		 */
		public logout(cpProto?: string) {
			if (!this.isUserAvailable()) {
				log.logcat.console("用户登出失败，用户未登录")
				return;
			}
			let out = this._engine.logout(cpProto);
			log.logcat.console("用户登出 ", out, this.MatchvsLog(out))
		}
		/**
		 * 手动断线重连
		 */
		public reconnect() {
			if (!this.isUserAvailable()) {
				log.logcat.console("用户登出失败，用户未登录")
				return;
			}
			let timestamp = Core.ServerTimeUtils.getServerTimeMillis();
			if (timestamp - this.errorTimestamp >= 20 * 1000)
				log.logcat.console("断线重连 超过20s ", this.errorTimestamp, timestamp)
			else {
				let connect = this._engine.reconnect();
				log.logcat.console("断线重连 ", connect, this.MatchvsLog(connect))
			}
		}
		/////////MatchvsSDK 扩展功能
		/**
		 * 加入自定义属性匹配房间
		 */
		public joinRoomWithProperties(matchinfo: MsMatchInfo, userProfile: string) {
			if (!this.isUserAvailable()) {
				log.logcat.console("加入自定义属性匹配房间失败，用户未登录")
				return;
			} else if (!this._expandModule) {
				log.logcat.console("加入自定义属性匹配房间失败，功能未开启")
				return;
			}
			let property = this._engine.joinRoomWithProperties(matchinfo, userProfile);
			log.logcat.console("加入自定义属性匹配房间 ", property, this.MatchvsLog(property))
		}
		/**
		 * 用户主动创建房间
		 */
		public createRoom(createRoomInfo: MsCreateRoomInfo, userProfile: string) {
			if (!this.isUserAvailable()) {
				log.logcat.console("用户创建房间失败，用户未登录")
				return;
			} else if (!this._expandModule) {
				log.logcat.console("用户主动创建房间失败，功能未开启")
				return;
			}
			let create = this._engine.createRoom(createRoomInfo, userProfile);
			log.logcat.console("加入自定义属性匹配房间 ", create, this.MatchvsLog(create))
		}
		/**
		 * 查看用户主动创建房间列表
		 */
		public getRoomList(filter: MsRoomFilterEx) {
			if (!this.isUserAvailable()) {
				log.logcat.console("查看用户创建房间列表失败，用户未登录")
				return;
			} else if (!this._expandModule) {
				log.logcat.console("查看用户主动创建房间列表失败，功能未开启")
				return;
			}
			let list = this._engine.getRoomListEx(filter);
			log.logcat.console("查看用户主动创建房间列表 ", list, this.MatchvsLog(list))
		}
		/**
		 * 踢人
		 */
		public kickPlayer(userID: number, cpProto: string) {
			if (!this.isUserAvailable()) {
				log.logcat.console("踢人失败，用户未登录")
				return;
			} else if (!this._expandModule) {
				log.logcat.console("踢人失败，功能未开启")
				return;
			} else if (!this.isUserInRoom()) {
				log.logcat.console("踢人失败，用户未进入到房间")
				return;
			}
			let kick = this._engine.kickPlayer(userID, cpProto);
			log.logcat.console("踢人 ", kick, this.MatchvsLog(kick))
		}
		/**
		 * 订阅组
		 * @param confirms,cancles string-要订阅/取消的组名,eg:["私聊组1", "好友组2"]
		 */
		public subscribeEventGroup(confirms: Array<string>, cancles: Array<string>) {
			if (!this.isUserAvailable()) {
				log.logcat.console("订阅组失败，用户未登录")
				return;
			} else if (!this._expandModule) {
				log.logcat.console("订阅组失败，功能未开启")
				return;
			} else if (!this.isUserInRoom()) {
				log.logcat.console("订阅组失败，用户未进入到房间")
				return;
			}
			let group = this._engine.subscribeEventGroup(confirms, cancles);
			log.logcat.console("订阅组 ", group, this.MatchvsLog(group))
		}
		/**
		 * 发送组消息
		 */
		public sendEventGroup(groups: Array<string>, data: string) {
			if (!this.isUserAvailable()) {
				log.logcat.console("发送组消息失败，用户未登录")
				return;
			} else if (!this._expandModule) {
				log.logcat.console("发送组消息失败，功能未开启")
				return;
			} else if (!this.isUserInRoom()) {
				log.logcat.console("发送组消息失败，用户未进入到房间")
				return;
			}
			let event = this._engine.sendEventGroup(groups, data);
			log.logcat.console("发送组消息 ", event, this.MatchvsLog(event))
		}
		/**
		 * 设置帧率,帧率须能被1000整除. 0表示关闭，参数值大于0表示打开，不调用为关闭
		 */
		public setFrameSync(frameRate: number) {
			if (!this.isUserAvailable()) {
				log.logcat.console("发送组消息失败，用户未登录")
				return;
			} else if (!this._expandModule) {
				log.logcat.console("发送组消息失败，功能未开启")
				return;
			}
			let frame = this._engine.setFrameSync(frameRate);
			log.logcat.console("设置帧同步接口 ", frame, this.MatchvsLog(frame))
		}
		/**
		 * 获取房间详细信息
		 */
		public getRoomDetail(roomID: string) {
			if (!this.isUserAvailable()) {
				log.logcat.console("获取房间详细信息失败，用户未登录")
				return;
			} else if (!this._expandModule) {
				log.logcat.console("获取房间详细信息失败，功能未开启")
				return;
			} else if (!this.isUserInRoom()) {
				log.logcat.console("获取房间详细信息失败，用户未进入到房间")
				return;
			}
			let detail = this._engine.getRoomDetail(roomID);
			log.logcat.console("获取房间详细信息 ", detail, this.MatchvsLog(detail))
		}
		/**
		 * 成功创建房间后，设置房间属性
		 */
		public setRoomProperty(roomID: string, roomProperty: string) {
			if (!this.isUserAvailable()) {
				log.logcat.console("设置房间属性失败，用户未登录")
				return;
			} else if (!this._expandModule) {
				log.logcat.console("设置房间属性失败，功能未开启")
				return;
			} else if (!this.isUserInRoom()) {
				log.logcat.console("设置房间属性失败，用户未进入到房间")
				return;
			}
			let property = this._engine.setRoomProperty(roomID, roomProperty);
			log.logcat.console("设置房间属性 ", property, this.MatchvsLog(property))
		}


		/////////////////////find-diff专用
		/**
		 * 自定义加入房间附带消息，比如：头像，分数等，建议json
		 */
		public buildJoinUserProfile(): string {
			return JSON.stringify(this.matchvsUserProfile);
		}
		public buildJoinRoomProperty(): string {
			return JSON.stringify(this.matchvsRoomProperty);
		}

		private matchvsUserProfile = {
			avatar: "http://life.southmoney.com/tuwen/UploadFiles_6871/201808/20180808151217543.jpg",
			nickname: "我是昵称",
			level: 0,
			userId: -1
		}
		private matchvsRoomProperty = {
			roomID: "",
			roomName: "找茬测试房间",
			maxPlayer: 0
		}
		/**
		 * 获取房间详细信息
		 */
		public getJoinRoomDetail() {
			if (!this.isUserAvailable()) {
				log.logcat.console("获取房间详细信息失败，用户未登录")
				return;
			} else if (!this._expandModule) {
				log.logcat.console("获取房间详细信息失败，功能未开启")
				return;
			} else if (!this.isUserInRoom()) {
				log.logcat.console("获取房间详细信息失败，用户未进入到房间")
				return;
			}
			let detail = this._engine.getRoomDetail(this.roomInfo.roomID);
			log.logcat.console("获取房间详细信息 ", detail, this.MatchvsLog(detail))
		}
		MatchvsLog(errno: number): string {
			return (errno === 0 || errno === 200 ? "日志：" : "错误日志：") + (errno <= 0 ? MatchvsError["__" + -errno] : MatchvsError["_" + errno])
		}
	}

	export class MatchvsEvent extends egret.Event {
		constructor(type: string, bubbles?: boolean, cancelable?: boolean, data?: any) {
			super(type, bubbles, cancelable, data)
		}
	}

	export class MatchvsEventConstant {
		/**
		 * matchvs登录成功
		 */
		public static MATCHVS_LOGIN_COMPLETE = "MATCHVS_LOGIN_COMPLETE"
		/**
		 * 网络中断
		 */
		public static MATCHVS_NETWORK_FAIL = "MATCHVS_NETWORK_FAIL"
		/**
		 * 网络重连中
		 */
		public static MATCHVS_NETWORK_RECONNECTING = "MATCHVS_NETWORK_RECONNECTING"
		/**
		 * 网络重连成功
		 */
		public static MATCHVS_NETWORK_RECONNECTED = "MATCHVS_NETWORK_RECONNECTED"
	}

	class MatchvsEventDispatcher extends egret.EventDispatcher {
		constructor(target?: egret.IEventDispatcher) {
			super(target)
		}
	}

	/**
	 * matchvs错误码，使用前需判断，如果error <= 0, 错误码前加"__";如果error > 0, 错误码前加"_"
	 */
	export let MatchvsError = {
		__0: "接口调用成功",
		__1: "其他错误",
		__2: "未初始化",
		__3: "正在初始化",
		__4: "未登录",
		__5: "正在登录",
		__6: "不在观战房间",
		__7: "正在创建房间，或者正在加入游戏房间",
		__8: "已经在(观战)房间",
		__9: "正在重连",
		__10: "正在离开房间",
		__11: "正在登出",
		__12: "正在加入观战房间",
		__14: "正在观战离开房间",
		__20: "frameRate不能超过20，不能小于0",
		__21: "cpProto过长，不能超过1024字符",
		__23: "msgType非法",
		__24: "desttype非法",
		__25: "channel非法，请检查是否正确填写为“Matchvs”",
		__26: "platform非法，请检查是否正确填写为“alpha”或“release”",
		__27: "timeout超出范围0=<timeout<=600",
		__30: "设置的rType值与当前模式冲突",
		_1: "用户掉线",
		_2: "用户已经登录游戏，待定重连",
		_3: "用户离开房间了",
		_1001: "网络错误",
		_200: "成功",
		_201: "重连到大厅，没有进入房间",
		_400: "请求不存在",
		_401: "无效 appkey",
		_402: "应用校验失败，确认是否在未上线时用了release环境，并检查gameID、appkey 和 secret",
		_403: "访问禁止，该用户多端登录",
		_404: "无服务",
		_405: "房间已满",
		_406: "房间关闭",
		_407: "超过总人数（观战人数+玩家人数）的限制",
		_408: "超过观战数据延迟时间限制",
		_409: "房间不存在",
		_410: "用户不存在",
		_411: "请求用户不在房间内",
		_412: "目标用户不在房间内",
		_413: "TTL超过最大限制",
		_414: "房间为空",
		_415: "房间不为空",
		_416: "不允许自己踢自己",
		_500: "服务错误，请确认是否正确打开gameServer",
		_502: "服务停止，许可证失效 或者账号欠费",
		_503: "ccu 超出额",
		_504: "流量用完",
		_507: "房间号不存在",
		_508: "当前用户不在房间",
		_509: "目标用户不在房间了",
		_510: "服务正在升级",
		_520: "gameServer 代理打开失败（尝试重启）",
		_521: "gameServer 不存在",
		_523: "gameServer 内部请求错误",
		_522: "没有打开帧同步，请调用setFrameSync接口设置帧率",
		_527: "消息发送太频繁，请不要超过每个房间 500次(总人数 (总接收+总发送))"
	}

	export let matchvsEventDispatcher: MatchvsEventDispatcher = new MatchvsEventDispatcher()
}