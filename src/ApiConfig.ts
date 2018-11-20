/**
 * 地址配置表
 */
class ApiConfig {
	public constructor() {
	}
	/**
	 * 资源服务器地址
	 */
	// public static GAME_SERVER = "https://dev-wx-games-admin.haochang.tv";//小游戏通用服务器-开发
	
	// public static RESOURCE_SERVER = "https://test-small-program-resource-qn.haochang.tv/find-diff/";//测试资源服务器
	public static GAME_SERVER = "https://new-test-wx-games-admin.haochang.tv";//小游戏通用服务器-测试
	public static SIGN = "fef364b1ceb54df6a70c13437d10ddb9";//测试环境
	
	public static ENVIRORMENT = -1;//-1开发环境，0表示测试环境，1表示正式环境
	public static isDEV(): boolean {
		return ApiConfig.ENVIRORMENT == -1;
	}
	public static FIND_DIFF = "2210574159161300";
	public static VERSION = "1.2";
	public static RANK_NAME = "find-diff-score-all";

	public static RESOURCE_SERVER = "https://d1awazzduhqq00.cloudfront.net/find-diff/";//正式资源服务器
	// public static GAME_SERVER = "https://aws-games-admin.haochang.tv";//小游戏通用服务器-线上
	// public static SIGN = "2e0840ce9d342ad92975ae0f53eabf02";//正式环境

	//matchvs is
	public static Matchvs_Id = 202465;
	//Matchvs默认将相同游戏版本的用户匹配到一起。如果开发者对游戏进行了版本升级，不希望两个版本的用户匹配到一起，此时可以在登录的时候通过gameVersion区分游戏版本
	public static VERSION_INT = 1;
	public static AppKey = "9b3cc86c2ccd4f0aa687df06e7286c38#E";
	public static Secret = "a727cf4449e24e89b91b7f99c88741f3";
	//检测是否存在多个设备同时登录同一个用户的情况，如果一个账号在两台设备上登录，则后登录的设备会连接失败
	public static DeviceId = "1";
}