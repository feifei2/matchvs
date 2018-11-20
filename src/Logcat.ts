module log {
	class Toast {
		private scroll: eui.Component;
		private toast: eui.Label;
		public constructor() {
			this.scroll = new eui.Scroller();
			this.toast = new eui.Label();
			this.toast.x = 0;
			this.toast.y = 0;
			this.toast.touchEnabled = false;
			this.toast.width = window.innerWidth;
			this.toast.height = 300;
			this.toast.multiline = true;
			this.toast.textColor = 0x000000;
			this.toast.textAlign = egret.HorizontalAlign.CENTER;
			this.toast.text = "日志记录：\n";
			this.scroll.addChild(this.toast);
		}

		public getToast(): eui.Component {
			return this.scroll;
		}

		public showToast(log: string) {
			if (this.toast)
				this.toast.text = log;
		}
	}

	class Logcat {
		private content = "日志：\n";
		public toast: eui.Component;
		private showToast: Toast;
		public constructor() {
			this.showToast = new Toast();
			this.toast = this.showToast.getToast();

			if (ApiConfig.isDEV())
				this.console = console.log.bind(this);
		}

		public append(str: string): Logcat {
			this.content += str;
			return this;
		}

		public clear() {
			this.content = "日志：\n"
		}

		private getLog(): string {
			return this.content;
		}

		public showLog() {
			this.showToast.showToast(this.getLog());
		}

		/**
		 * console日志
		 */
		public console
	}

	export let logcat: Logcat = new Logcat();
}