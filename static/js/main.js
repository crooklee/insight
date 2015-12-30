var g_lxdMain = null;
var g_bIsSupportAudio = false;  //是否支持音频
var g_bIsSupportThreeStream = false; //是否支持第三码流
var g_bIsSupportBeep = true; //是否支持声音告警
var g_szDeviceType = "IPCamera";  //设备类型
var g_bSupportIntelliTrace = false; //是否支持智能跟踪
var g_bSupportVideoLoss = null;  //没有默认值，兼容球机目前写死支持视频丢失
var g_bSupportSHTTP = false; //是否支持私有RTSP OVER HTTP协议

/*************************************************
 Function:        initMain
 Description:    初始化主页面
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function initMain() {
	m_szUserPwdValue = $.cookie('userInfo' + m_lHttpPort);
	if (m_szUserPwdValue == null) {
		var nowDate = new Date();
		window.location.href = "login.asp?_"+nowDate.getTime();
		return;
	}

	$("#SoftwareEdition").find("div").eq(0).html("Web:&nbsp;&nbsp;&nbsp;&nbsp;" + global_config.web_version);
	$("#SoftwareEdition").find("div").eq(1).html("Plugin:&nbsp;" + global_config.plugin_version);

	$("#ConfigDivUpdateBlock").css({"width":$("html").css("width"), "height":$("html").prop("scrollHeight") + 'px'});
	$(window).bind("resize", function () {
		$("#ConfigDivUpdateBlock").css({"width":$("html").css("width"), "height":$("html").prop("scrollHeight") + 'px'});
		if ($("#contentframe").attr("src").indexOf("preview") != "-1") {
			var curWnd = document.getElementById('contentframe').contentWindow;
			if (curWnd.m_iWndType == 0) {
				curWnd.autoSize();
			}
		}
	});
	mainEventBind();
	if ("YW5vbnltb3VzOn9/f39/fw==" !== m_szUserPwdValue) {
		GetDeviceInfo(); //获取设备型号
		getIntelliTraceSupport();
	}
	getAudioSupport();
	getThreeStreamSupport();
	LatestPage();
}

/*************************************************
 Function:        LastPage
 Description:    主页面加载时，获取cookie，跳转到刷新前的界面
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function LatestPage() {
	translator.initLanguageSelect($.cookie("language"));
	var lxd = translator.getLanguageXmlDoc("Main");
	translator.translatePage($(lxd).children("Main")[0], parent.document);
	g_lxdMain = $(lxd).children("Common")[0];
	translator.translateElements(g_lxdMain, $("#dvChangeSize")[0], "span", "title");
	var curpage = $.cookie('page');
	if (null == curpage) {
		ChangeFrame("preview.asp", 1);
	} else {
		ChangeFrame(curpage.split("%")[0], curpage.split("%")[1]);
	}
}

/*************************************************
 Function:        ChangeFrame
 Description:    主页面加载时，获取cookie，跳转到刷新前的界面
 Input:            src:页面路径
 index:ID序号
 Output:            无
 return:            无
 *************************************************/
function ChangeFrame(src, index) {
	if ("YW5vbnltb3VzOn9/f39/fw==" === m_szUserPwdValue && index != 1) {
		return;
	}
	if (src.indexOf("?") != -1) {
		var szTemp = src.split("?");
		src = szTemp[0].concat("?version=" + global_config.web_version + "&").concat(szTemp[1]);
	} else {
		src = src + "?version=" + global_config.web_version;
	}
	$("#content").html('<iframe frameborder="0" scrolling="no" id="contentframe" name="contentframe" class="contentframe" src="' + src + '"></iframe>');
	/*兼容IE10*/
	$("#contentframe").attr("src", src);
}
/*************************************************
 Function:        restoreSize
 Description:    恢复主页面框架各子元素大小
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function restoreSize(iIndex) {
	if (iIndex == 1) {
		$('#content').height(689);
		$('#contentframe').height(653);
	} else {
		$('#content').height(655);
		$('#contentframe').height(619);
	}
	$('#content').width(974);
	$('#header').width(974);
	$('#nav').width(974);
	$('#contentframe').width(938);
}
/*************************************************
 Function:        ChangeMenu
 Description:    改变主页菜单栏
 Input:            index:ID序号
 Output:            无
 return:            无
 *************************************************/
function ChangeMenu(index) {
	for (var i = 1; i < 5; i++) {
		if ($("#iMenu" + i).hasClass("menuBackground")) {
			$("#iMenu" + i).removeClass("menuBackground");
		}
	}
	$("#iMenu" + index).addClass("menuBackground");
	restoreSize(index);//还原界面大小
}

/*************************************************
 Function:        ChangeFrameLanguage
 Description:    改变页面语言
 Input:            lan:语言
 Output:            无
 return:            无
 *************************************************/
function ChangeFrameLanguage(lan) {
	$.cookie('language', lan);
	var lxd = translator.getLanguageXmlDoc("Main", lan);
	translator.translatePage($(lxd).children("Main")[0], parent.document);
	g_lxdMain = $(lxd).children("Common")[0];
	translator.translateElements(g_lxdMain, $("#dvChangeSize")[0], "span", "title");
	var curWnd = document.getElementById('contentframe').contentWindow;
	curWnd.ChangeLanguage(lan);
}
/*************************************************
 Function:        GetDeviceInfo
 Description:    获取设备名称
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function GetDeviceInfo() {
	$.ajax({
		type:"GET",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/System/deviceInfo",
		async:false,
		timeout:15000,
		success:function (xmlDoc, textStatus, xhr) {
			$("#devicetype").html($(xmlDoc).find('model').eq(0).text());
			g_szDeviceType = $(xmlDoc).find('deviceDescription').eq(0).text();
			if ("" == g_szDeviceType) {
				g_szDeviceType = "IPCamera";
			}
			if ($(xmlDoc).find("supportBeep").length > 0) {
				g_bIsSupportBeep = ($(xmlDoc).find("supportBeep").eq(0).text() == "true");
			}
			if ($(xmlDoc).find("supportVideoLoss").length > 0) {
				g_bSupportVideoLoss = ($(xmlDoc).find("supportVideoLoss").eq(0).text() == "true");
			}
		}
	});
}
/*************************************************
 Function:        getAudioSupport
 Description:    是否支持音频
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function getAudioSupport() {
	$.ajax({
		type:"GET",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/System/Audio/channels",
		async:false,
		timeout:15000,
		success:function (xmlDoc, textStatus, xhr) {
			if ($(xmlDoc).find("AudioChannel").length > 0) {
				g_bIsSupportAudio = true;
			}
		}
	});
}
/*************************************************
 Function:        getThreeStreamSupport
 Description:    是否支持第三码流
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function getThreeStreamSupport() {
	var szURL = m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/Streaming/channels";
	$.ajax({
		type:"GET",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + ("YW5vbnltb3VzOn9/f39/fw==" === m_szUserPwdValue ? "" : m_szUserPwdValue));
		},
		url:szURL,
		async:false,
		timeout:15000,
		success:function (xmlDoc, textStatus, xhr) {
			if ($(xmlDoc).find("StreamingChannel").length >= 3) {
				g_bIsSupportThreeStream = true;
			} else {
				g_bIsSupportThreeStream = false;
			}
			
			//是否支持私有取流SHTTP
			var iLen = $(xmlDoc).find("streamingTransport").length;
			g_bSupportSHTTP = false;
			for (var i = 0; i < iLen; i++) {
				if ($(xmlDoc).find("streamingTransport").eq(i).text().toLowerCase() == 'shttp') {
					g_bSupportSHTTP = true;
					break;	
				}	
			}
		},
		error:function () {
			g_bIsSupportThreeStream = false;
		}
	});
}
/*************************************************
 Function:        getIntelliTraceSupport
 Description:    获取是否支持智能跟踪配置
 Input:          无
 Output:            无
 return:            无
 *************************************************/
function getIntelliTraceSupport() {
	$.ajax({
		type:"GET",
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/Smart/capabilities",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		async:false,
		success:function (xmlDoc, textStatus, xhr) {
			g_bSupportIntelliTrace = $(xmlDoc).find("isSupportIntelliTrace").eq(0).text() == "true";
		},
		error:function () {
			g_bSupportIntelliTrace = false;
		}
	});
}
/*************************************************
 Function:        mainEventBind
 Description:    事件绑定
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function mainEventBind() {
	//点击语言选择框
	$(".languageshow").bind({
		click:function (e) {
			e.stopPropagation();
			if ($("#divLanguageChoose").css("display") !== "none") {
				$('#divLanguageChoose').hide();
			} else {
				$('#divLanguageChoose').show();
			}
		}
	});
	//点击帮助
	$(".help").bind({
		click:function (e) {
			e.stopPropagation();
			if ($("#SoftwareEdition").css("display") !== "none") {
				$('#SoftwareEdition').hide();
			} else {
				$('#SoftwareEdition').show();
			}
		}
	});
	//点击语言选择框和帮助以为的地方
	$("body").bind({
		click:function (e) {
			if ($("#divLanguageChoose").css("display") !== "none") {
				$('#divLanguageChoose').hide();
			}
			if ($("#SoftwareEdition").css("display") !== "none") {
				$("#SoftwareEdition").hide();
			}
		}
	});
	//注销鼠标悬浮
	$(".logout").bind({
		mouseover:function () {
			$(this).css("color", "#a73737");
		},
		mouseout:function () {
			$(this).css("color", "#757575");
		}
	});
}