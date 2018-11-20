namespace Core {

    class ServerTimeCountDown {

        private static _INSTANCE: ServerTimeCountDown;
        private static _DEFAULT_INTERVAL: number = 300;//默认计时间隔

        public static i(): ServerTimeCountDown {
            if (!ServerTimeCountDown._INSTANCE) ServerTimeCountDown._INSTANCE = new ServerTimeCountDown();
            return ServerTimeCountDown._INSTANCE;
        }

        private _timeMillisOffset: number;
        public _serverTimeStamp: number;
        private _extraTimeMillisOffset: number = 0;
        private _totalInterval: number = 0;
        private readonly _originalCounter: egret.Timer;
        private readonly _counters: Array<TimeCounter>;

        private constructor() {
            this._originalCounter = new egret.Timer(ServerTimeCountDown._DEFAULT_INTERVAL, 0);
            this._originalCounter.addEventListener(egret.TimerEvent.TIMER, this._onInterval, this);
            this._counters = new Array();
        }

        /**
         * @hide 初始化，请于项目内第一次网络请求调用，且保证此次请求失败游戏不能开始
         * @param {number} currServerTime 当前服务器时间戳（ms）
         */
        public init(serverTimeMillis: number) {
            this._serverTimeStamp = serverTimeMillis;
            this._timeMillisOffset = serverTimeMillis - Date.now();
            if (!this._originalCounter.running)
                this._originalCounter.start();
        }

        /**
         * @hide 重新校准，在合适的时候（如退后台返回）时候调用
         * @param {number} currServerTime 当前服务器时间戳（ms）
         */
        public adjust(serverTimeMillis: number) {
            const newOffset = serverTimeMillis - Date.now();
            if (newOffset != this._timeMillisOffset) {
                this._serverTimeStamp = serverTimeMillis;
                this._timeMillisOffset = newOffset;
            }
        }

        /**
         * @hide 增加一个计时器到计时器队列里
         * @param {ServerTimeCounter} c 计时器
         */
        async _add(c: TimeCounter) {
            if (c) {
                c._startTime = this._serverTimeStamp;
                if (c instanceof ServerTimeCounter)
                    c._endTime = c._startTime + c._total;
                this._counters.push(c);
            }
        }

        /**
         * @hide 从计时器队列移除一个已经完成的或者被主动停止的计时器
         * @param {ServerTimeCounter} c 计时器
         */
        async _remove(c: TimeCounter) {
            if (c) {
                const index = this._counters.indexOf(c);
                if (index >= 0)
                    this._counters.splice(index, 1);
            }
        }

        /**
         * @hide 内部跑的计时器的定时回调，用于自己动态变更服务器时间
         * @param {TimerEvent} ev 无限循环的Timer事件，只有无限循环才能不受本机时间影响
         */
        private async _onInterval(ev: egret.TimerEvent) {
            this._totalInterval = ServerTimeCountDown._DEFAULT_INTERVAL + this._extraTimeMillisOffset;
            this._extraTimeMillisOffset = 0;
            this._serverTimeStamp += this._totalInterval;
            for (let c of this._counters) {
                if (!c) continue;
                if (!c._run) {
                    this._remove(c);
                } else if (c._interval <= this._totalInterval) {
                    this._callbackCounters(c, this._serverTimeStamp);
                } else if (c._duringInterval + this._totalInterval >= c._interval) {
                    this._callbackCounters(c, this._serverTimeStamp);
                    c._duringInterval = 0;
                } else {
                    c._duringInterval += this._totalInterval;
                }
            }
        }

        /**
         * @hide 回调各个计时器
         * @param {ServerTimeCounter} 计时器
         * @param {number} currServerTime 当前服务器时间
         */
        private _callbackCounters(c: TimeCounter, currServerTime: number) {
            if (c instanceof ServerTimeCounter) {
                if (c._endTime > currServerTime) {
                    if (c._progressCallback) {
                        const progress = currServerTime - c._startTime;
                        c._progressCallback(progress, c._total, currServerTime, c._endTime);
                    }
                } else {
                    if (c._completeCallback)
                        c._completeCallback();
                    this._remove(c);
                }
            } else if (c instanceof InfinityCounter) {
                if (c._progressCallback) {
                    const progress = currServerTime - c._startTime;
                    c._progressCallback(progress, currServerTime);
                }
            }
        }
    }

    interface TimeCounter {
        readonly _interval: number;
        _startTime: number;
        _run: boolean;
        _duringInterval: number;
        start(): void;
        stop(): void;
    }

    export class ServerTimeUtils {
        /**
          * @hide 初始化，请于项目内第一次网络请求调用，且保证此次请求失败游戏不能开始
          * @param {number} currServerTime 当前服务器时间戳（ms）
          */
        public static init(serverTimeMillis: number) {
            ServerTimeCountDown.i().init(serverTimeMillis);
        }

        /**
         * @hide 重新校准，在合适的时候（如退后台返回）时候调用
         * @param {number} currServerTime 当前服务器时间戳（ms）
         */
        public static adjust(serverTimeMillis: number) {
            ServerTimeCountDown.i().adjust(serverTimeMillis);
        }

        /**
         * 获取当前服务器时间戳ms
         * @return {number} 服务器毫秒级时间戳
         */
        public static getServerTimeMillis(): number {
            return ServerTimeCountDown.i()._serverTimeStamp;
        }
    }

    export class ServerTimeCounter implements TimeCounter {
        public _startTime: number;
        public _endTime: number;
        public readonly _total: number;
        public readonly _interval: number;
        public readonly _progressCallback: (progress: number, total: number, currTimeStamp: number, endTimeStamp: number) => void;
        public readonly _completeCallback: () => void;
        _duringInterval: number = 0;
        public _run: boolean = true;

        /**
         * @param {number} interval 回调间隔（只能为{@link ServerTimeCountDown#_DEFAULT_INTERVAL}的整数倍
         * @param {number} total 总共需要计时的总时长
         * @param {Function} completeCallback 计时完成回调
         * @param {Function} progressCallback 计时进度回调
         */
        constructor(interval: number, total: number, completeCallback?: () => void, progressCallback?: (progress: number, total: number, currTimeStamp: number, endTimeStamp: number) => void) {
            this._interval = interval;
            this._total = total;
            this._completeCallback = completeCallback;
            this._progressCallback = progressCallback;
        }

        /**
         * 开始计时
         */
        public start() {
            ServerTimeCountDown.i()._add(this);
        }

        /**
         * 停止（取消）计时
         */
        public stop() {
            this._run = false;
            ServerTimeCountDown.i()._remove(this);
        }
    }

    export class InfinityCounter implements TimeCounter {
        public _startTime: number;
        public readonly _interval: number;
        public readonly _progressCallback: (progress: number, currTimeStamp: number) => void;
        _duringInterval: number = 0;
        public _run: boolean = true;

        /**
         * @param {number} interval 回调间隔（只能为{@link ServerTimeCountDown#_DEFAULT_INTERVAL}的整数倍
         * @param {number} total 总共需要计时的总时长
         * @param {Function} completeCallback 计时完成回调
         * @param {Function} progressCallback 计时进度回调
         */
        constructor(interval: number, progressCallback?: (progress: number, currTimeStamp: number) => void) {
            this._interval = interval;
            this._progressCallback = progressCallback;
        }

        /**
         * 开始计时
         */
        public start() {
            ServerTimeCountDown.i()._add(this);
        }

        /**
         * 停止（取消）计时
         */
        public stop() {
            this._run = false;
            ServerTimeCountDown.i()._remove(this);
        }
    }
}