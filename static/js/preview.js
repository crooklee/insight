var m_szXmlStr = "";
var m_bChannelRecord = false;   //通道是否在录像
var m_bSound = false;           //通道声音属否打开

var m_bPTZAuto = false;         //云台是否自动轮询
var m_bIsDiskFreeSpaceEnough = true;
var sliderPtzSpd = null;      //PTZ速度滑动条
var sliderVolume = null;      //声音滑动条

var m_szBrowser = navigator.appName; //获取浏览器名称
var m_szExit = "是否注销";
var m_iPtzSpeed = 60;
var m_iWndType = 0;
var m_iPtzMode = 1;//0为显示,1为隐藏

var m_iOperateMode = 0;         //弹出编辑路径窗口后的操作  0 - 添加 1 - 修改
var m_oOperated = null;         //被操作修改值的对象
var m_iProtocolType = 0;        //取流方式，默认为RTSP
var m_bLight = false;           //ptz灯光状态
var m_bWiper = false;
var m_oPtzTabs = null;          //云台预置点tabs对象

var m_szaudioCompressionType = 'G.711ulaw';
var m_iTalkNum = 0;  //语音对讲通道数
var m_bTalk = 0; //是否正在对讲
var m_iTalkingNO = 0; //正在对讲的通道号

var g_lxdPreview = null; // Preview.xml
var g_bEnable3DZoom = false; //是否开启3D定位
var g_bEnableEZoom = false; //是否开启电子定位
var g_bEnableManualTrack = false; //是否开启手动跟踪
var g_bEnableCorridor = false;  //是否开启走廊模式

var g_iPatrolDelayMin = 0;
var g_iPatrolDelayMax = 30;

var g_aSpecialPresets = [33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105];  //默认特殊预置点
var g_iCaptureFileFormat = 0; //抓图文件格式
var g_bSupportPresetName = false; //是否支持预置点名称设置
var g_bSupportWiperStatus = true; //是否支持雨刷状态
var g_iAudioBitRate = -1;  //音频码率
var g_aPlugins = [];
/*************************************************
 Function:        InitPreview
 Description:    初始化预览界面
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function InitPreview() {    
	$.cookie('page', null);
	m_szUserPwdValue = $.cookie('userInfo' + m_lHttpPort);
	if (m_szUserPwdValue === null) {
		var nowDate = new Date();
		window.parent.location.href = "login.asp?_"+nowDate.getTime();
		return;
	}

	window.parent.document.getElementById("curruser").innerHTML = (Base64.decode(m_szUserPwdValue).split(":")[0]);		//显示用户
	window.parent.ChangeMenu(1);

	getUPnPInfo();

	m_oPtzTabs = $(".ptztabs").tabs(".ptzpanes", {tabs:"span", markCurrent:false});

	InitSlider();

	ChangeLanguage(parent.translator.szCurLanguage);
	
	g_aPlugins = checkExistPlugins();
	if (g_aPlugins.length == 0) {
		$("#seSwitchPlugin").val("webcomponents").change();
		return;
	} else {
		if ($.inArray("webcomponents", g_aPlugins) != -1) {
			$("#seSwitchPlugin").val("webcomponents").change();
			//设置基本信息
			var szInfo = '<?xml version="1.0" encoding="utf-8"?><Information><WebVersion><Type>ipc</Type><Version>3.1.2.120416</Version><Build>20120416</Build></WebVersion><PluginVersion><Version>3.0.3.5</Version><Build>20120416</Build></PluginVersion><PlayWndType>0</PlayWndType></Information>';
			m_PreviewOCX.HWP_SetSpecialInfo(szInfo, 0);
			//比较插件版本信息
			if (!CompareFileVersion()) {
				UpdateTips();
			}
			var szPathInfo = m_PreviewOCX.HWP_GetLocalConfig();            
			var xmlDoc = parseXmlFromStr(szPathInfo);
			m_iProtocolType = parseInt($(xmlDoc).find("ProtocolType").eq(0).text(), 10);
			//抓图文件格式
			if ($(xmlDoc).find("CaptureFileFormat").length > 0) {
				g_iCaptureFileFormat = parseInt($(xmlDoc).find("CaptureFileFormat").eq(0).text(), 10);
			}
		} else if ($.inArray("quicktime", g_aPlugins) != -1) {
			$("#seSwitchPlugin").val("quicktime").change();
		} else if ($.inArray("vlc", g_aPlugins) != -1) {
			$("#seSwitchPlugin").val("vlc").change();
		} else if ($.inArray("mjpeg", g_aPlugins) != -1) {
			$("#seSwitchPlugin").val("mjpeg").change();
		} else {
			$("#seSwitchPlugin").val("webcomponents").change();
		}
	}
	//视频底部栏按钮鼠标悬停样式
	$("#toolbar").find("span").each(function () {
		$(this).hover(function () {
			if ($(this).hasClass("volumemouseout")) {
				if (!$(this).children().hasClass("sounddisable")) {
					$(this).removeClass().addClass("volumemouseover");
				}
			} else {
				if (!($(this).children().hasClass("capturedisable") || $(this).children().hasClass("recorddisable") || $(this).children().hasClass("disEZoom") || $(this).children().hasClass("dis3DZoom") || $(this).children().hasClass("disMTrack"))) {
					$(this).removeClass().addClass("btnmouseover");
				}
			}
		}, function () {
			if ($(this).hasClass("volumemouseover") || $(this).hasClass("volumemouseout")) {
				$(this).removeClass().addClass("volumemouseout");
			} else {
				$(this).removeClass().addClass("btnmouseout");
			}
		});
	});
	//setTimeout("StartRealPlay()", 10); //开启预览
	if ("YW5vbnltb3VzOn9/f39/fw==" === m_szUserPwdValue) {
		$("#ptzshow").hide();
		//$("#spOriginal").hide();
	} else {
		//云台相关初始化延后执行
		setTimeout(function () {
			//获取云台能力
			getPTZCab();
			//验证巡航时间有效性输入
			$('#PatrolTime').bind({
				keyup:function () {
					var szVal = $(this).val();
					if (szVal.charAt(szVal.length - 1) < '0' || szVal.charAt(szVal.length - 1) > '9') {
						if (szVal.length > 0) {
							$(this).val(szVal.substring(0, szVal.length - 1));
						}
						/*else {
						 $(this).val('10');
						 }*/
					}
					if (szVal.length > 0) {
						var iVal = parseInt(szVal, 10);
						if (!isNaN(iVal)) {
							if (iVal > g_iPatrolDelayMax) {
								$(this).val(g_iPatrolDelayMax);
							} else if (iVal < g_iPatrolDelayMin) {
								$(this).val(g_iPatrolDelayMin);
							} else {
								$(this).val(iVal);
							}
						} else {
							$(this).val("");
						}
					}
				},
				blur:function () {
					if ($(this).val() == "") {
						$(this).val(2);
					}
				}
			});
			//验证巡航速度有效性输入
			$('#PatrolSpeed').bind({
				keyup:function () {
					var szVal = $(this).val();
					if (szVal.charAt(szVal.length - 1) < '0' || szVal.charAt(szVal.length - 1) > '9') {
						if (szVal.length > 0) {
							$(this).val(szVal.substring(0, szVal.length - 1));
						}
						/*else {
						 $(this).val('1');
						 }*/
					}
					if (szVal.length > 0) {
						var iVal = parseInt(szVal, 10);
						if (!isNaN(iVal)) {
							if (iVal > 40) {
								$(this).val(40);
							} else if (iVal < 1) {
								$(this).val(1);
							} else {
								$(this).val(iVal);
							}
						} else {
							$(this).val("");
						}
					}
				},
				blur:function () {
					if ($(this).val() == "") {
						$(this).val(30);
					}
				}
			});
			//云台添加hover事件
			$(".ptzDir").find("span").each(function () {
				$(this).hover(function () {
					$(this).addClass("sel");
				}, function () {
					$(this).removeClass("sel");
				});
			});
			//自动扫描点击事件
			$("#auto").unbind().hover(function () {
				if (!m_bPTZAuto) {
					$(this).addClass("sel");
				}
			}, function () {
				if (!m_bPTZAuto) {
					$(this).removeClass("sel");
				}
			});
			//调焦、聚焦和光圈等按钮鼠标悬停样式
			$(".ptzBtnMid").find("span").each(function () {
				$(this).hover(function () {
					$(this).addClass("sel");
				}, function () {
					$(this).removeClass("sel");
				});
			});
			//灯光、雨刷、一键聚焦和镜头初始化等按钮鼠标悬停样式
			$(".ptzAidBg").find("span").each(function (i) {
				if (i % 2 == 0) {
					$(this).hover(function () {
						$(this).addClass("sel");
					}, function () {
						$(this).removeClass("sel");
					});
				}
			});
			//
			$("#SelectPreset").unbind().bind({
				change:function () {
					var szSelText = $(this).find("option:selected").eq(0).text();
					var objStringTest = window.parent.$("#dvStringLenTest");
					objStringTest.html(szSelText);  //用这个来检测字符串的宽度
					if (($(this).width() - 18) < objStringTest.width()) {
						$(this).attr("title", szSelText);
					} else {
						$(this).removeAttr("title");
					}
				}
			});
			//列表快速定位
			$("#PresetArea").bind("keydown", function (event) {
				var iInputNum = 0;
				var iInputCode = event.which;
				if ((iInputCode < 96 || iInputCode > 105) && (iInputCode < 48 || iInputCode > 57 || event.shiftKey)) { //0-9
					return false;
				}
				if (iInputCode >= 96 && iInputCode <= 105) {
					iInputNum = iInputCode - 96;
				}
				if (iInputCode >= 48 && iInputCode <= 57) {
					iInputNum = iInputCode - 48;
				}
				var lastDate = $(this).data("lastTime");
				var nowDate = (new Date()).getTime();
				if (lastDate) {
					if ((nowDate - lastDate) < 500) {
						var iLastInput = $(this).data("lastInput");
						iInputNum = parseInt(iLastInput + "" + iInputNum, 10);
						if (iInputNum > 256) {
							iInputNum = 256;
						}
					}
				}
				$(this).data("lastInput", iInputNum);
				var oSelect = $(this).children("div").eq(iInputNum - 1).click();
				$(this).parent().scrollTop(oSelect.height() * (iInputNum - 1));
				$(this).data("lastTime", nowDate);
			});
			//初始化预置点
			InitPreset();
			//获取预置点
			getPresets();
			//初始化巡航预置点列表
			InitPresetList();
			//获取巡航能力
			GetPatrolsCab();
			//初始化轨迹
			InitPattern();

		}, 50);
	}
	if (!parent.g_bIsSupportAudio) {
		$("#voiceTalk").parent().hide();
		$("#opensound").parent().hide();
	}

	$.ajax({
		type:"GET",
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/Image/channels/1/corridor",
		async:true,
		timeout:15000,
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		success:function (xmlDoc, textStatus, xhr) {
			g_bEnableCorridor = ($(xmlDoc).find("enabled").eq(0).text() == "true");
		},
		error:function (xhr, textStatus, errorThrown) {
			g_bEnableCorridor = false;
		}
	});
	if (!g_bIsIE) {
		$("#seSwitchPlugin").append("<option value='vlc'>VLC</option><option value='mjpeg'>MJPEG</option>");
	}
	if (window.parent.g_szDeviceType == "IPDome") {
		$("#dv3DZoom").show();
		$("#dvEZoom").hide();
	} else if (window.parent.g_szDeviceType == "IPZoom") {
		$("#dv3DZoom").show();
		$("#dvEZoom").hide();
	} else {
		$("#dv3DZoom").hide();
		$("#dvEZoom").show();
	}
	if (window.parent.g_bIsSupportThreeStream) {
		$("#threestream").show();
		$("#substream").removeClass().addClass("thirdstreamout");
	} else {
		$("#threestream").hide();
		$("#substream").removeClass().addClass("substreamout");
	}
	$("#mainstream").removeClass().addClass("mainstreamover");

	if (window.parent.g_bSupportIntelliTrace) {
		$("#dvManualTrack").show();
	} else {
		$("#dvManualTrack").hide();
	}
}

/*************************************************
 Function:        StartRealPlay
 Description:    开始预览
 Input:            iChannelNum：通道号
 iWndNum：窗口号  （默认当前选中窗口）
 Output:            无
 return:            无
 *************************************************/
function StartRealPlay() {
	if (null == m_PreviewOCX) {
		return;
	}
	if (!HWP.wnds[0].isPlaying) {
		var szURL = "";

		//先判断是否支持SHTTP,且当前本地采用的是RTP OVER RTSP[显示的是TPC]情况下 - 采用私有RTSP OVER HTTP
		
        //if (window.parent.g_bSupportSHTTP && 0 == m_iProtocolType) {
        if ( 0 == m_iProtocolType) {    
			if (0 == m_iStreamType) { //主码流
				szURL = "http://" + m_szHostName + ":" + g_szHttpPort + "/SDK/play/100/004";  //[能力可以得到支持那种封装]这里最后以为暂时使用RTP包
			} else if (1 == m_iStreamType) {//子码流
				szURL = "http://" + m_szHostName + ":" + g_szHttpPort + "/SDK/play/101/004";
			} else {
				szURL = "http://" + m_szHostName + ":" + g_szHttpPort + "/SDK/play/102/004";  //三码流，未必支持可能就返回失败了
			}
            
		} else {
			if (m_iProtocolType == 4) {
				if (m_iStreamType == 0) {
					szURL = "rtsp://" + m_szHostName + ":" + g_szHttpPort + "/ISAPI/streaming/channels/101";
				} else if (m_iStreamType == 1) {
					szURL = "rtsp://" + m_szHostName + ":" + g_szHttpPort + "/ISAPI/streaming/channels/102";
				} else {
					szURL = "rtsp://" + m_szHostName + ":" + g_szHttpPort + "/ISAPI/streaming/channels/103";
				}
			} else {
				if (m_iStreamType == 0) {
					szURL = "rtsp://" + m_szHostName + ":" + m_lRtspPort + "/ISAPI/streaming/channels/101";
				} else if (m_iStreamType == 1) {
					szURL = "rtsp://" + m_szHostName + ":" + m_lRtspPort + "/ISAPI/streaming/channels/102";
				} else {
					szURL = "rtsp://" + m_szHostName + ":" + m_lRtspPort + "/ISAPI/streaming/channels/103";
				}
			}
		}
        console.log(szURL)
		//if (m_PreviewOCX.HWP_Play(szURL, ("YW5vbnltb3VzOn9/f39/fw==" === m_szUserPwdValue ? "" : m_szUserPwdValue), 0, "", "") != 0) {
        if (m_PreviewOCX.HWP_Play(szURL, "YW5vbnltb3VzOn9/f39/fw==", 0, "", "") != 0) {		
            var iError = m_PreviewOCX.HWP_GetLastError();
			if (403 == iError) {
				alert(403);
			} else {
				alert(iError);
			}
			return;
		}
		//强制I帧
		$.ajax({
			type:"PUT",
			url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/Streaming/channels/10"+(m_iStreamType+1)+"/requestKeyFrame",
			async:false,
			beforeSend:function (xhr) {
				xhr.setRequestHeader("If-Modified-Since", "0");
				xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
			}
		});
		HWP.wnds[0].isPlaying = true;
		//m_bChannelRecord = false;

		//$("#capture").attr("class", 'capture');
		//$("#startRecord").attr("class", 'startrecord');
		//$("#opensound").attr("class", 'closesound');
		//$("#play").attr("title", getNodeValue('stoppreview')).attr("class", "stoprealplay");
		//$("#dvEZoomBtn").attr("title", getNodeValue("laEnableZoom")).attr("class", "StartEZoom");
		//$("#Start3DZoom").attr("title", getNodeValue("Start3DZoom")).attr("class", "Start3DZoom");
		//$("#btnManualTrack").attr("title", getNodeValue("StartManualTrack")).attr("class", "StartMTrack");
	} else {
		StopRealPlay();
	}
}
/*************************************************
 Function:        StopRealPlay
 Description:    停止预览
 Input:            iChannelNum : 通道号
 Output:            无
 return:            无
 *************************************************/
function StopRealPlay() {
	if (null == m_PreviewOCX) {
		return;
	}
	//如果正在录像，先停止
	if (m_bChannelRecord) {
		StopRecord();
	}
	if (HWP.Stop(0) != 0) {
		alert(s.translator.translateNode(g_lxdPreview, 'previewfailed'));
		return;
	}
	HWP.wnds[0].isPlaying = false; // 可去掉，wuyang
	m_bChannelRecord = false;

	//如果声音打开了，关闭声音
	if (m_bSound) {
		$("#opensound").attr("title", parent.translator.translateNode(g_lxdPreview, 'opensound'));
	}

	m_PreviewOCX.HWP_DisableZoom(0);
	$("#dvEZoomBtn").attr("class", "disEZoom").attr("title", "");
	g_bEnableEZoom = false;
	$("#Start3DZoom").attr("title", "").attr("class", "dis3DZoom");
	g_bEnable3DZoom = false;
	$("#btnManualTrack").attr("title", "").attr("class", "disMTrack");
	g_bEnableManualTrack = false;

	$("#capture").removeClass().addClass('capturedisable');
	$("#startRecord").removeClass().addClass('recorddisable');
	sliderVolume.wsetValue(0);
	$("#opensound").removeClass().addClass('sounddisable');
	$("#play").removeClass().addClass("play").attr("title", parent.translator.translateNode(g_lxdPreview, 'jsPreview'));
	m_bSound = false;
}
/*************************************************
 Function:        StartRecord
 Description:    开始录像
 Input:            szFileName: 自定义录像文件名
 Output:            无
 return:            无
 *************************************************/
function StartRecord(szFileName) {
	if (!m_bChannelRecord) {
		if (HWP.wnds[0].isPlaying) {
			var time = new Date();
			var szFileName = "";
			var szHostName = "";
			if (m_szHostName.indexOf("[") < 0) {
				szHostName = m_szHostName;
			} else {
				szHostName = m_szHostName.substring(1, m_szHostName.length - 1).replaceAll(":", ".");
			}
			szFileName = szHostName + "_01" + "_" + time.Format("yyyyMMddhhmmssS");
			var iRes = m_PreviewOCX.HWP_StartSave(0, szFileName);
			if (0 == iRes) {
				m_bChannelRecord = true;
				$("#startRecord").removeClass().addClass("stoprecord");
				$("#startRecord").attr("title", parent.translator.translateNode(g_lxdPreview, 'stoprecord'));
				m_bIsDiskFreeSpaceEnough = true;
				//强制I帧
				$.ajax({
					type:"PUT",
					url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/Streaming/channels/10"+(m_iStreamType+1)+"/requestKeyFrame",
					async:false,
					beforeSend:function (xhr) {
						xhr.setRequestHeader("If-Modified-Since", "0");
						xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
					}
				});
			} else if (-1 == iRes) {
				var iError = m_PreviewOCX.HWP_GetLastError();
				if (10 == iError || 9 == iError) {
					alert(parent.translator.translateNode(g_lxdPreview, 'jsCreateFileFailed'));
				} else {
					alert(parent.translator.translateNode(g_lxdPreview, 'recordfailed'));
				}
			} else if (-2 == iRes) {
				m_bIsDiskFreeSpaceEnough = false;
				alert(parent.translator.translateNode(g_lxdPreview, 'FreeSpaceTips'));
			} else if (-3 == iRes) {
				alert(parent.translator.translateNode(g_lxdPreview, 'jsCreateFileFailed'));
			}
		}
	} else {
		StopRecord();
	}
}
/*************************************************
 Function:        StopRecord
 Description:    停止录像
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function StopRecord() {
	var szRecord = parent.translator.translateNode(g_lxdPreview, 'jsRecord');	//录像
	var iRes = m_PreviewOCX.HWP_StopSave(0);
	if (0 == iRes) {
		m_bChannelRecord = false;
		g_transStack.push(function () {
			showTips("", parent.translator.translateNode(g_lxdPreview, 'jsRecordSucc'));
		}, true);
	}
	$("#startRecord").removeClass().addClass("startrecord");
	$("#startRecord").attr("title", parent.translator.translateNode(g_lxdPreview, 'jsRecord'));
}
/*************************************************
 Function:        CapturePicture
 Description:    抓图
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function CapturePicture() {
	if (HWP.wnds[0].isPlaying) {
		var time = new Date();
		var szFileName = "";
		var szHostName = "";
		if (m_szHostName.indexOf("[") < 0) {
			szHostName = m_szHostName;
		} else {
			szHostName = m_szHostName.substring(1, m_szHostName.length - 1).replaceAll(":", ".");
		}
		szFileName = szHostName + "_01" + "_" + time.Format("yyyyMMddhhmmssS") + (g_iCaptureFileFormat == 1 ? ".bmp" : "");

		var iRes = m_PreviewOCX.HWP_CapturePicture(0, szFileName);
		if (iRes == 0) {
			g_transStack.push(function () {
				showTips("", parent.translator.translateNode(g_lxdPreview, 'jsCaptureSucc'));
			}, true);
		} else if (iRes == -1) {
			var iError = m_PreviewOCX.HWP_GetLastError();
			if (10 == iError || 9 == iError) {
				alert(parent.translator.translateNode(g_lxdPreview, 'jsCreateFileFailed'));
			} else {
				alert(parent.translator.translateNode(g_lxdPreview, 'capturefailed'));
			}
		} else if (-2 == iRes) {
			alert(parent.translator.translateNode(g_lxdPreview, 'FreeSpaceTips'))
		} else if (-3 == iRes) {
			alert(parent.translator.translateNode(g_lxdPreview, 'jsCreateFileFailed'));
		} else {
			//未定义
		}
	}
}
/*************************************************
 Function:        OpenSound
 Description:    声音控制
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function OpenSound() {
	if (HWP.wnds[0].isPlaying) {
		if (!m_bSound) {
			if (0 == m_PreviewOCX.HWP_OpenSound(0)) {
				$("#opensound").removeClass().addClass('opensound');
				$("#opensound").attr("title", parent.translator.translateNode(g_lxdPreview, 'closesound'));
				m_bSound = true;
				SetVolume(50);
			} else {
				var iError = m_PreviewOCX.HWP_GetLastError();
				//声音设备被占用
				if (14 == iError) {
					alert(parent.translator.translateNode(g_lxdPreview, 'jsOpenSoundFailed'));//提示语待定
				}
			}
		} else {
			if (0 == m_PreviewOCX.HWP_CloseSound()) {
				$("#opensound").removeClass().addClass('closesound');
				$("#opensound").attr("title", parent.translator.translateNode(g_lxdPreview, 'opensound'));
				m_bSound = false;
				sliderVolume.wsetValue(0);
			}
		}
	}
}
/*************************************************
 Function:        SetVolume
 Description:    设置音量
 Input:            lVolume     音量   0-100
 Output:            无
 return:            无
 *************************************************/
function SetVolume(lVolume) {
	if (0 == m_PreviewOCX.HWP_SetVolume(0, lVolume)) {
		sliderVolume.wsetValue(lVolume);
		sliderVolume.setTitle('' + lVolume);
	}
}
/*************************************************
 Function:        ChangeLanguage
 Description:    改变页面语言
 Input:            lan：语言
 Output:            无
 return:            无
 *************************************************/
//var g_transStack = new parent.TransStack();
function ChangeLanguage(lan) {
	g_lxdPreview = parent.translator.getLanguageXmlDoc("Preview", lan);
	parent.translator.appendLanguageXmlDoc(g_lxdPreview, parent.g_lxdMain);
	parent.translator.translatePage(g_lxdPreview, document);

	window.parent.document.title = parent.translator.translateNode(g_lxdPreview, "title");
	m_szExit = parent.translator.translateNode(g_lxdPreview, "exit");

	parent.translator.translateElements(g_lxdPreview, $("#toolbar")[0], "div", "title");

	parent.translator.translateElements(g_lxdPreview, $(".ptzAid")[0], "span", "title");
	//添加云台操作提示语
	$("#zoomIn").attr("title", getNodeValue("laZoom") + " +");
	$("#zoomOut").attr("title", getNodeValue("laZoom") + " -");
	$("#focusIn").attr("title", getNodeValue("laFocus") + " +");
	$("#focusOut").attr("title", getNodeValue("laFocus") + " -");
	$("#irisIn").attr("title", getNodeValue("laIris") + " +");
	$("#irisOut").attr("title", getNodeValue("laIris") + " -");

	//parent.translator.translateElements(g_lxdPreview, $(".ptzDis")[0], "div", "title");
	//添加预置点相关操作提示语
	$(".tab1").attr("title", getNodeValue("laPreset"));
	$(".tab2").attr("title", getNodeValue("Patrol"));
	$(".tab3").attr("title", getNodeValue("Pattern"));

	$(".gotoPreset").attr("title", getNodeValue("ExcutePreset"));
	$(".setPreset").attr("title", getNodeValue("SetPreset"));
	$(".cleanPreset").attr("title", getNodeValue("CleanPreset"));

	$(".start").attr("title", getNodeValue("Start"));
	$(".stop").attr("title", getNodeValue("stop"));
	$(".save").attr("title", getNodeValue("laSaveBtn"));
	$(".delete").attr("title", getNodeValue("DelDigitalIpBtn"));
	$(".startSave").attr("title", getNodeValue("StartSave"));
	$(".stopSave").attr("title", getNodeValue("StopSave"));
	//是否预览
	if (HWP.wnds[0].isPlaying) {
		$("#play").attr("title", parent.translator.translateNode(g_lxdPreview, 'stoppreview'));
	} else {
		$("#play").attr("title", parent.translator.translateNode(g_lxdPreview, 'jsPreview'));
	}
	if (m_bChannelRecord) {
		$("#startRecord").attr("title", parent.translator.translateNode(g_lxdPreview, 'stoprecord'));
	} else {
		$("#startRecord").attr("title", parent.translator.translateNode(g_lxdPreview, 'jsRecord'));
	}
	if (m_bSound) {
		$("#opensound").attr("title", parent.translator.translateNode(g_lxdPreview, 'closesound'));
	} else {
		$("#opensound").attr("title", parent.translator.translateNode(g_lxdPreview, 'opensound'));
	}
	if (g_bEnable3DZoom) {
		$("#Start3DZoom").attr("title", getNodeValue("Stop3DZoom"));
	} else {
		if ($("#Start3DZoom").hasClass("dis3DZoom")) {
			$("#Start3DZoom").attr("title", "");
		} else {
			$("#Start3DZoom").attr("title", getNodeValue("Start3DZoom"));
		}
	}
	if (g_bEnableManualTrack) {
		$("#btnManualTrack").attr("title", getNodeValue("StopManualTrack"));
	} else {
		if ($("#btnManualTrack").hasClass("disMTrack")) {
			$("#btnManualTrack").attr("title", "");
		} else {
			$("#btnManualTrack").attr("title", getNodeValue("StartManualTrack"));
		}
	}
	if (g_bEnableEZoom) {
		$("#dvEZoomBtn").attr("title", getNodeValue("laDisableZoom"));
	} else {
		if ($("#dvEZoomBtn").hasClass("disEZoom")) {
			$("#dvEZoomBtn").attr("title", "");
		} else {
			$("#dvEZoomBtn").attr("title", getNodeValue("laEnableZoom"));
		}
	}
	$("#spOriginal").attr("title", parent.translator.translateNode(g_lxdPreview, 'windowProportionOpt1'));
	$("#sizeauto").attr("title", parent.translator.translateNode(g_lxdPreview, 'windowAuto'));
	$("#ptzshow").attr("title", parent.translator.translateNode(g_lxdPreview, 'laPTZ'));

	sliderPtzSpd.setTitle(parent.translator.translateNode(g_lxdPreview, 'ptzSpeed') + ':' + (m_iPtzSpeed > 90 ? 7 : parseInt(m_iPtzSpeed / 15)));

	InitPatrolLan();
	InitPresetListLan();
	if ($('#divPreviewTips').css('display') != 'none') {
		g_transStack.translate();
	}
}
/*************************************************
 Function:        showTips
 Description:    显示提示语
 Input:            title:标题
 strTips:提示语
 Output:            无
 return:            无
 *************************************************/
var g_iShowTipsTimer;
function showTips(title, strTips) {
	$('#laPreviewTips').html(strTips);
	$('#divPreviewTips').show();
	clearTimeout(g_iShowTipsTimer);
	g_iShowTipsTimer = setTimeout(function () {
		$('#laPreviewTips').html('');
		$('#divPreviewTips').hide();
	}, 5000);
}
/*************************************************
 Function:        InitPatrolLan
 Description:    初始化路径选择下拉框语言
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function InitPatrolLan() {
	var oSelect = document.getElementById("selectPatrol");
	var iLen = oSelect.options.length;
	var szName = parent.translator.translateNode(g_lxdPreview, 'laTrack');
	for (var i = 0; i < iLen; i++) {
		oSelect.options[i].text = szName + " " + (i + 1);
	}
}

/*************************************************
 Function:        InitPresetList
 Description:    初始化预置点下拉框
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function InitPresetList() {
	$("#SelectPreset").empty();
	var szName = parent.translator.translateNode(g_lxdPreview, 'laPreset');
	for (var i = 0; i < 256; i++) {
		if (window.parent.g_szDeviceType == "IPDome") {
			if ($.inArray(i + 1, g_aSpecialPresets) >= 0) {
				continue;
			}
		}
		$("<option value='" + (i + 1) + "'>" + szName + " " + (i + 1) + "</option>").appendTo("#SelectPreset");
	}
}
/*************************************************
 Function:        InitPresetListLan
 Description:    初始化预置点下拉框语言
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function InitPresetListLan() {
	var szPresetName = parent.translator.translateNode(g_lxdPreview, 'laPreset');
	$("#SelectPreset").find("option").each(function () {
		var szName = $(this).html();
		$(this).html(szPresetName + " " + szName.split(" ")[1]);
	});
}
/*************************************************
 Function:        PluginEventHandler
 Description:    回放事件响应
 Input:            iEventType 事件类型, iParam1 参数1, iParam2 保留
 Output:            无
 return:            无
 *************************************************/
function PluginEventHandler(iEventType, iParam1, iParam2) {
	if (21 == iEventType) {
		if (m_bIsDiskFreeSpaceEnough) {
			m_bIsDiskFreeSpaceEnough = false;
			setTimeout(function () {
				alert(parent.translator.translateNode(g_lxdPreview, 'FreeSpaceTips'));
			}, 2000);
		}
		StopRecord();
	} else if (3 == iEventType) {
		m_PreviewOCX.HWP_StopVoiceTalk();
		m_bTalk = 0;
		$("#voiceTalk").removeClass().addClass("voiceoff").attr("title", parent.translator.translateNode(g_lxdPreview, 'voiceTalk'));
		setTimeout(function () {
			alert(parent.translator.translateNode(g_lxdPreview, 'VoiceTalkFailed'));
		}, 2000);
	}
}
/*************************************************
 Function:        GetSelectWndInfo
 Description:    获取选中窗口信息
 Input:            SelectWndInfo:窗口信息xml
 Output:            无
 return:            无
 *************************************************/
function GetSelectWndInfo(SelectWndInfo) {
	return;
}
/*************************************************
 Function:        SetZoomInStart
 Description:
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetZoomInStart() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	StopPTZAuto();
	var szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZData><zoom>" + (m_iPtzSpeed) + "</zoom></PTZData>";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/continuous",
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        SetPTZCallback
 Description:    ptz设置回调
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetPTZCallback(xhr) {
	if (xhr.status == 403) {
		if ("ptzOccupiedPriority" == $(xhr.responseXML).find("subStatusCode").eq(0).text()) {
			alert(getNodeValue("ptzOccupiedPriority"));
		} else {
			alert(getNodeValue('jsNoOperationRight'));
		}
	}
}
/*************************************************
 Function:        StopPTZAuto
 Description:    停止云台自转
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function StopPTZAuto() {
	if (m_bPTZAuto) {
		//如果云台自转，就停止
		ptzAuto();
	}
}
/*************************************************
 Function:        SetZoomOutStart
 Description:
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetZoomOutStart() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	StopPTZAuto();
	var szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZData><zoom>" + (-m_iPtzSpeed) + "</zoom></PTZData>";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/continuous",
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        SetPTZStop
 Description:    停止PTZ操作
 Input:            iType 操作类型
 Output:            无
 return:            无
 *************************************************/
function SetPTZStop(iType) {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	StopPTZAuto();
	var szXml = "";
	if (iType == 0) {
		szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZData><pan>" + 0 + "</pan><tilt>" + 0 + "</tilt></PTZData>";
	} else {
		szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZData><zoom>" + 0 + "</zoom></PTZData>";
	}
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/continuous",
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        SetPTZLeftStart
 Description:    开始向左转
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetPTZLeftStart() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	StopPTZAuto();
	var szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZData><pan>" + (-m_iPtzSpeed) + "</pan><tilt>" + 0 + "</tilt></PTZData>";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/continuous",
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        SetPTZLeftUpStart
 Description:    开始向左上转
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetPTZLeftUpStart() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	StopPTZAuto();
	var szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZData><pan>" + (-m_iPtzSpeed) + "</pan><tilt>" + (m_iPtzSpeed) + "</tilt></PTZData>";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/continuous",
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        SetPTZLeftDownStart
 Description:    开始向左下转
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetPTZLeftDownStart() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	StopPTZAuto();
	var szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZData><pan>" + (-m_iPtzSpeed) + "</pan><tilt>" + (-m_iPtzSpeed) + "</tilt></PTZData>";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/continuous",
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        SetPTZRightStart
 Description:    开始向右转
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetPTZRightStart() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	StopPTZAuto();
	var szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZData><pan>" + (m_iPtzSpeed) + "</pan><tilt>" + 0 + "</tilt></PTZData>";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/continuous",
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        SetPTZRightUpStart
 Description:    开始向右上转
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetPTZRightUpStart() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	StopPTZAuto();
	var szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZData><pan>" + (m_iPtzSpeed) + "</pan><tilt>" + (m_iPtzSpeed) + "</tilt></PTZData>";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/continuous",
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        SetPTZRightDownStart
 Description:    开始向右下转
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetPTZRightDownStart() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	StopPTZAuto();
	var szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZData><pan>" + (m_iPtzSpeed) + "</pan><tilt>" + (-m_iPtzSpeed) + "</tilt></PTZData>";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/continuous",
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        SetPTZUpStart
 Description:
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetPTZUpStart() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	StopPTZAuto();
	var szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZData><pan>" + 0 + "</pan><tilt>" + (m_iPtzSpeed) + "</tilt></PTZData>";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/continuous",
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        SetPTZDownStart
 Description:
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetPTZDownStart() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	StopPTZAuto();
	var szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZData><pan>" + 0 + "</pan><tilt>" + (-m_iPtzSpeed) + "</tilt></PTZData>";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/continuous",
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        ptzAuto
 Description:    云台自动
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function ptzAuto() {
	if (window.parent.g_szDeviceType != "IPDome") {
		if (!HWP.wnds[0].isPlaying) {
			return;
		}
		var szXml = "";
		if (!m_bPTZAuto) {
			szXml = "<?xml version='1.0' encoding='UTF-8'?><autoPanData><autoPan>" + (-m_iPtzSpeed) + "</autoPan></autoPanData>";
		} else {
			szXml = "<?xml version='1.0' encoding='UTF-8'?><autoPanData><autoPan>" + 0 + "</autoPan></autoPanData>";
		}
		var xmlDoc = parseXmlFromStr(szXml);
		$.ajax({
			type:"PUT",
			beforeSend:function (xhr) {
				xhr.setRequestHeader("If-Modified-Since", "0");
				xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
			},
			url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/autoPan",
			processData:false,
			data:xmlDoc,
			async:false,
			success:function (xmlDoc, textStatus, xhr) {
				m_bPTZAuto = !m_bPTZAuto;
				if (m_bPTZAuto) {
					$("#auto").addClass("sel");
				} else {
					$("#auto").removeClass("sel");
				}
			},
			error:function () {
				if (!m_bPTZAuto) {
					szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZData><pan>" + (-m_iPtzSpeed) + "</pan><tilt>" + 0 + "</tilt></PTZData>";
				} else {
					szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZData><pan>" + 0 + "</pan><tilt>" + 0 + "</tilt></PTZData>";
				}
				var xmlDoc = parseXmlFromStr(szXml);
				$.ajax({
					type:"PUT",
					beforeSend:function (xhr) {
						xhr.setRequestHeader("If-Modified-Since", "0");
						xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
					},
					url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/continuous",
					processData:false,
					data:xmlDoc,
					async:false,
					success:function (xmlDoc, textStatus, xhr) {
						m_bPTZAuto = !m_bPTZAuto;
						if (m_bPTZAuto) {
							$("#auto").addClass("sel");
						} else {
							$("#auto").removeClass("sel");
						}
					},
					error:function (xhr, textStatus, errorThrown) {
						if (xhr.status == 403) {
							if ("ptzOccupiedPriority" == $(xhr.responseXML).find("subStatusCode").eq(0).text()) {
								alert(getNodeValue("ptzOccupiedPriority"));
							} else {
								alert(getNodeValue('jsNoOperationRight'));
							}
						}
					}
				});
			}
		});
	} else {  //球机调用特殊预置点
		if (!HWP.wnds[0].isPlaying) {
			return;
		}
		var szURL = "";
		if (!m_bPTZAuto) {
			szURL = m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/presets/" + 99 + "/goto";
		} else {
			szURL = m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/presets/" + 96 + "/goto";
		}
		$.ajax({
			type:"PUT",
			beforeSend:function (xhr) {
				xhr.setRequestHeader("If-Modified-Since", "0");
				xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
			},
			url:szURL,
			async:false,
			success:function (xmlDoc, textStatus, xhr) {
				m_bPTZAuto = !m_bPTZAuto;
				if (m_bPTZAuto) {
					$("#auto").addClass("sel");
				} else {
					$("#auto").removeClass("sel");
				}
			},
			error:function (xhr, textStatus, errorThrown) {
				if (xhr.status == 403) {
					if ("ptzOccupiedPriority" == $(xhr.responseXML).find("subStatusCode").eq(0).text()) {
						alert(getNodeValue("ptzOccupiedPriority"));
					} else {
						alert(getNodeValue('jsNoOperationRight'));
					}
				}
			}
		});
	}
}
/*************************************************
 Function:        SetFocusInStart
 Description:
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetFocusInStart() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	StopPTZAuto();
	var szXml = "<?xml version='1.0' encoding='UTF-8'?><FocusData><focus>" + (m_iPtzSpeed) + "</focus></FocusData>";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/System/Video/inputs/channels/1/focus",
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        SetFocusStop
 Description:
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetFocusStop() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	var szXml = "<?xml version='1.0' encoding='UTF-8'?><FocusData><focus>" + 0 + "</focus></FocusData>";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/System/Video/inputs/channels/1/focus",
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        SetFocusOutStart
 Description:
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetFocusOutStart() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	StopPTZAuto();
	var szXml = "<?xml version='1.0' encoding='UTF-8'?><FocusData><focus>" + (-m_iPtzSpeed) + "</focus></FocusData>";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/System/Video/inputs/channels/1/focus",
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        IrisInStart
 Description:
 Input:          无
 Output:            无
 return:            无
 *************************************************/
function IrisInStart() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	StopPTZAuto();
	var szXml = "<?xml version='1.0' encoding='UTF-8'?><IrisData><iris>" + (m_iPtzSpeed) + "</iris></IrisData>";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/System/Video/inputs/channels/1/iris",
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        IrisOutStart
 Description:
 Input:            iChannel  通道号
 Output:            无
 return:            无
 *************************************************/
function IrisOutStart() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	StopPTZAuto();
	var szXml = "<?xml version='1.0' encoding='UTF-8'?><IrisData><iris>" + (-m_iPtzSpeed) + "</iris></IrisData>";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/System/Video/inputs/channels/1/iris",
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        IrisStop
 Description:
 Input:            iChannel  通道号
 Output:            无
 return:            无
 *************************************************/
function IrisStop() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	var szXml = "<?xml version='1.0' encoding='UTF-8'?><IrisData><iris>" + 0 + "</iris></IrisData>";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/System/Video/inputs/channels/1/iris",
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        SetPresetFun
 Description:    设置预置点
 Input:            iPresetId 预置点ID
 Output:            无
 return:            无
 *************************************************/
function SetPresetFun(iPresetId) {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	StopPTZAuto();
	var oSel = $("#PresetArea").children("div").eq(iPresetId - 1);
	var szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZPreset><id>" + iPresetId + "</id><presetName>" + oSel.children("span").eq(1).text() + "</presetName></PTZPreset>";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/presets/" + iPresetId,
		processData:false,
		data:xmlDoc,
		success:function () {
			oSel.data("presetName", oSel.children("span").eq(1).text());
			//更新巡航列表预置点名称
			var oSelPreset = $("#SelectPreset").children("option[value='" + iPresetId + "']").eq(0);
			var szName = oSel.children("span").eq(1).text();
			oSelPreset.text(szName);
			var objStringTest = window.parent.$("#dvStringLenTest");
			objStringTest.html(szName);  //用这个来检测字符串的宽度
			if (($("#SelectPreset").width() - 18) < objStringTest.width()) {
				oSelPreset.attr("title", szName);
			}

		},
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        GotoPreset
 Description:    调用预置点
 Input:            iPresetId 预置点ID
 Output:            无
 return:            无
 *************************************************/
function GotoPreset(iPresetId) {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	StopPTZAuto();
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/presets/" + iPresetId + "/goto",
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        CleanPreset
 Description:    清除预置点
 Input:            iPresetId 预置点ID
 Output:            无
 return:            无
 *************************************************/
function CleanPreset(iPresetId) {
	StopPTZAuto();
	$.ajax({
		type:"DELETE",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/presets/" + iPresetId,
		success:function(xml, textstatus, xhr) {//
			if(g_bSupportPresetName)
			{
				$("#PresetArea .presetname").eq(iPresetId - 1).html(getNodeValue('laPreset') + ' ' + iPresetId).attr("title","");
				$("#PresetArea .presetname").eq(iPresetId - 1).parent().data('presetName', getNodeValue('laPreset') + ' ' + iPresetId);
				$("#SelectPreset option:[value=" + (iPresetId) + "]").html(getNodeValue('laPreset') + ' ' + iPresetId);
			}
		},
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        InitSlider
 Description:    初始化预览页面滑动条
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function InitSlider() {
	sliderPtzSpd = new neverModules.modules.slider({
		targetId:"ptzSlider",
		sliderCss:"speedSlider",
		barCss:"speedBar",
		min:1,
		max:7,
		hints:""
	});
	sliderPtzSpd.create();
	sliderPtzSpd.onchange = function () {
		var spd = sliderPtzSpd.getValue();
		if (spd < 7) {
			m_iPtzSpeed = spd * 15;
		} else {
			m_iPtzSpeed = 100;
		}
		sliderPtzSpd.setTitle(parent.translator.translateNode(g_lxdPreview, 'ptzSpeed') + ':' + spd);  //云台活动条提示
	};
	var iVol;
	sliderVolume = new neverModules.modules.slider({
		targetId:"volumeDiv",
		sliderCss:"imageslider1",
		barCss:"imageBar2",
		min:0,
		max:100
	});
	sliderVolume.create();
	sliderVolume.onchange = function () {
		if (!HWP.wnds[0].isPlaying) {
			this.wsetValue(0);
		} else {
			iVol = sliderVolume.getValue();
			if (iVol > 0) {
				if (!m_bSound) {
					if (0 == m_PreviewOCX.HWP_OpenSound(0)) {
						m_bSound = true;
						$("#opensound").removeClass().addClass("opensound").attr("title", parent.translator.translateNode(g_lxdPreview, 'closesound'));
						SetVolume(iVol);
					} else {
						var iError = m_PreviewOCX.HWP_GetLastError();
						//声音设备被占用
						if (25 == iError) {
							g_transStack.push(function () {
								showTips('', parent.translator.translateNode(g_lxdPreview, 'jsOpenSoundFailed'));//提示语待定
							}, true);
						}
					}
				} else {
					SetVolume(iVol);
				}
			} else {
				m_PreviewOCX.HWP_CloseSound();
				m_bSound = false;
				$("#opensound").removeClass().addClass("closesound");
			}
			sliderVolume.setTitle('' + iVol);
		}
	};
}

/*************************************************
 Function:        InitPreset
 Description:    初始化预置点
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function InitPreset() {
	var szName = parent.translator.translateNode(g_lxdPreview, 'laPreset');
	for (var i = 1; i < 257; i++) {
		$("<div><span class='presetnum'>" + i + "</span><span class='presetname'>" + szName + " " + i + "</span><span></span><span></span><span></span></div>").appendTo("#PresetArea").bind("click", {index:i},function (event) {
			if (!$(this).hasClass("select")) {
				$(this).siblings(".select").each(function () {
					$(this).removeClass("select");
					var oLastSelSpans = $(this).children("span");
					oLastSelSpans.eq(1).html($(this).data("presetName")).unbind();
					oLastSelSpans.eq(2).removeClass("gotoPreset").unbind();
					oLastSelSpans.eq(3).removeClass("setPreset").unbind();
					oLastSelSpans.eq(4).removeClass("cleanPreset").unbind();
				});
				$(this).attr("class", "select");
				var oSelSpans = $(this).children("span");
				if (g_bSupportPresetName && $.inArray(event.data.index, g_aSpecialPresets) < 0) {
					oSelSpans.eq(1).click(function () {
						$(this).attr("title", "");
						var that = this;
						$(this).html("<input type='text' value='" + $(this).text() + "' style='margin:0 auto; width:" + ($(this).width() - 3) + "px;'/>").find(":text").eq(0).bind({
							click:function (event) {
								event.stopPropagation();
							},
							keydown:function (event) {
								var iInputCode = event.which;
								if (iInputCode == 8 || iInputCode == 13 || iInputCode == 17 || iInputCode == 46 || (iInputCode > 36 && iInputCode < 41)) { //退格键、回车键、Ctrl键、方向键
									event.stopPropagation();
									return;
								}
								//不允许输入特殊字符%、&、<、>、'、"    中文iInputCode == 0 || iInputCode == 229
								if (((iInputCode == 53 || iInputCode == 55 || iInputCode == 188 || iInputCode == 190) && event.shiftKey) || iInputCode == 222) {
									return false;
								}
								if (20 <= $(this).val().replace(/[^\x00-\xff]/g, "rr").length) {
									return false;
								}
								event.stopPropagation();
							},
							keyup:function (event) {
								var szVal = $(this).val();
								if (szVal.replace(/[^\x00-\xff]/g, "rr").length > 20) {
									var szTemp = "";
									var iStrSize = 0;
									for (var i = 0; i < szVal.length; i++) {
										var char = szVal.charAt(i);
										strCheck = /[^\x00-\xff]/;
										if (strCheck.test(char)) {
											iStrSize += 2;
										} else {
											iStrSize += 1;
										}
										if (iStrSize <= 20) {
											szTemp += szVal.charAt(i);
										} else {
											$(this).val(szTemp);
										}
									}
								}
							},
							focus:function () {
								$(this).val($(this).val());
							},
							blur:function () {
								var szVal = $(this).val();
								szVal = szVal.replace(/[%&<>\'"]/g, "");
								$(that).attr("title", szVal).html(szVal.replace(/[ ]/g, "&nbsp;"));
							}
						}).focus();
					});
				}
				oSelSpans.eq(2).addClass("gotoPreset").attr("title", getNodeValue("ExcutePreset")).bind("click", {index:event.data.index}, function (event) {
					GotoPreset(event.data.index);
				});
				//球机特殊预置点不支持设置和清除
				if (window.parent.g_szDeviceType !== "IPDome" || $.inArray(event.data.index, g_aSpecialPresets) < 0) {
					oSelSpans.eq(3).addClass("setPreset").attr("title", getNodeValue("SetPreset")).bind("click", {index:event.data.index}, function (event) {
						SetPresetFun(event.data.index);
					});
					oSelSpans.eq(4).addClass("cleanPreset").attr("title", getNodeValue("CleanPreset")).bind("click", {index:event.data.index}, function (event) {
						CleanPreset(event.data.index);
					});
				}
			}
		}).bind({
				mouseover:function () {
					if (!$(this).hasClass("select")) {
						$(this).addClass("enter");
					}
				},
				mouseout:function () {
					$(this).removeClass("enter");
				}
			}).data("presetName", szName + " " + i);
	}
}
/*************************************************
 Function:        getPresets
 Description:    获取预置点信息
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function getPresets() {
	if (window.parent.g_szDeviceType == "IPCamera") {
		return;
	}
	var szURL = m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/presets";
	$.ajax({
		type:"GET",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		async:true,
		timeout:15000,
		url:szURL,
		success:function (xmlDoc, textStatus, xhr) {
			var oPresets = $(xmlDoc).find("PTZPreset");
			oPresets.each(function () {
				var iId = parseInt($(this).find("id").eq(0).text(), 10);
				var szName = $(this).find("presetName").eq(0).text();
				$("#PresetArea").children("div").eq(iId - 1).data("presetName", szName).children("span").eq(1).html(szName.replace(/[ ]/g, "&nbsp;")).attr("title", szName);
				if ($.inArray(iId, g_aSpecialPresets) < 0) {
					var oSelPreset = $("#SelectPreset").children("option[value='" + iId + "']").eq(0);
					oSelPreset.text(szName);
					var objStringTest = window.parent.$("#dvStringLenTest");
					objStringTest.html(szName);  //用这个来检测字符串的宽度
					if (($("#SelectPreset").width() - 18) < objStringTest.width()) {
						oSelPreset.attr("title", szName);
					}
				}
			});
		}
	});
}
/*************************************************
 Function:        InsertPresetList
 Description:    插入预置点到巡航路径中
 Input:            iNo：序号
 iPresetID :    预置点序号
 iPatrolTime : 延时
 iPatrolSpeed : 速度
 Output:            无
 return:            无
 *************************************************/
function InsertPresetList(iNo, iPresetID, iPatrolTime, iPatrolSpeed) {
	var szName = $("#SelectPreset").children("option[value='" + iPresetID + "']").text();
	$('#PatrolPresetList').children("div").last().children("span").eq(0).removeClass("delete");
	$("<div><span class='firstchild'></span><span class='secondchild'>" + iNo + "</span><span class='thirdchild' id='" + iPresetID + "' title='"+szName+"'>" + szName + "</span><span class='fouthchild'>" + iPatrolTime + "s</span><span>" + iPatrolSpeed + "</span><span></span></div>").appendTo("#PatrolPresetList").bind({
		click:function () {
			if (!$(this).hasClass("select")) {
				$(this).siblings(".select").each(function () {
					$(this).removeClass("select");
					$(this).children("span").eq(5).removeClass("edit").unbind();
				});
				$(this).attr("class", "select");
				var parent = this;
				$(this).children("span").eq(5).addClass("edit").bind("click", {parent:parent}, function (event) {
					var oParent = event.data.parent;
					var oChildren = $(oParent).children("span");
					var iPresetId = oChildren.eq(2).attr("id");
					var iPatrolTime = oChildren.eq(3).text().split("s")[0];
					var iPatrolSpeed = oChildren.eq(4).text();
					EditPresetListDlg(oParent, 1, iPresetId, iPatrolTime, iPatrolSpeed);
				});
			}
		},
		mouseover:function () {
			if (!$(this).hasClass("select")) {
				$(this).addClass("enter");
			}
		},
		mouseout:function () {
			$(this).removeClass("enter");
		}
	}).children("span").eq(0).bind("click",function () {
			if ($('#PatrolPresetList').children("div").index($(this).parent()) != ($('#PatrolPresetList').children("div").length - 1)) {
				return;
			}
			$('#PatrolPresetList').children("div").last().remove();
			if ($('#PatrolPresetList').children("div").last().hasClass("select")) {
				$('#PatrolPresetList').children("div").last().click().children("span").eq(0).addClass("delete");
			} else {
				$('#PatrolPresetList').children("div").last().children("span").eq(0).addClass("delete");
			}
		}).addClass("delete");
	$("#PatrolPresetList").scrollTop(1000);
}

/*************************************************
 Function:        EditPresetListDlg
 Description:    弹出编辑窗口
 input:          obj : 当前点击对象
 Output:            无
 return:            无
 *************************************************/
function EditPresetListDlg(obj, iOperateMode, iPresetID, iPatrolTime, iPatrolSpeed) {
	if (0 == iOperateMode) {
		if ($('#PatrolPresetList').children("div").length >= 32) {
			return;
		}
	}
	m_iOperateMode = iOperateMode;
	m_oOperated = obj;
	$('#SelectPreset').val(iPresetID);
	$('#PatrolTime').val(iPatrolTime);
	$('#PatrolSpeed').val(iPatrolSpeed);

	$('#EditPatrolPreset').css('right', '2px');
	$('#EditPatrolPreset').css('top', $(obj).offset().top - $('#EditPatrolPreset').height() + 30);
	$('#EditPatrolPreset').modal();
}

/*************************************************
 Function:        onPresetListDlgOk
 Description:    路径编辑窗口确定键事件响应
 input:          无
 Output:            无
 return:            无
 *************************************************/
function onPresetListDlgOk() {
	if (m_iOperateMode == 0) {
		InsertPresetList($('#PatrolPresetList').children("div").length + 1, $('#SelectPreset').attr("value"), $('#PatrolTime').val(), $('#PatrolSpeed').val());
	} else {
		var szName = $('#SelectPreset').find("option:selected").eq(0).text();
		var obj = $(m_oOperated).children("span");
		obj.eq(2).html(szName).attr("id", $('#SelectPreset').attr("value")).attr("title", szName);
		obj.eq(3).html($('#PatrolTime').val() + 's');
		obj.eq(4).html($('#PatrolSpeed').val());
		obj.eq(5).unbind().bind("click", {parent:m_oOperated, a:$('#SelectPreset').attr("value"), b:$('#PatrolTime').val(), c:$('#PatrolSpeed').val()}, function (event) {
			EditPresetListDlg(event.data.parent, 1, event.data.a, event.data.b, event.data.c);
		});
	}
	$.modal.impl.close();
}
/*************************************************
 Function:        GetPatrolsDelayCab
 Description:    获取巡航时间能力
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function GetPatrolsDelayCab() {
	$.ajax({
		type:"GET",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		async:true,
		timeout:15000,
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/patrols/capabilities",
		success:function (xmlDoc, textStatus, xhr) {
			g_iPatrolDelayMin = parseInt($(xmlDoc).find("delay").eq(0).attr("min"), 10);
			g_iPatrolDelayMax = parseInt($(xmlDoc).find("delay").eq(0).attr("max"), 10);
		}
	});
}
/*************************************************
 Function:        GetPatrol
 Description:    获取一条路径
 Input:            iNo：序号
 Output:            无
 return:            无
 *************************************************/
function GetPatrol(iPatrolID) {
	$.ajax({
		type:"GET",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		async:true,
		timeout:15000,
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/patrols/" + iPatrolID,
		complete:function (xhr, textStatus) {
			$('#PatrolPresetList').empty();
			if (xhr.status == 200) {
				var xmlDoc = xhr.responseXML;
				var iPresetNum = 0;
				var szName = parent.translator.translateNode(g_lxdPreview, 'laPreset');
				iPresetNum = $(xmlDoc).find('PatrolSequence').length;
				for (i = 0; i < iPresetNum; i++) {
					var iPresetID = parseInt($(xmlDoc).find('presetID').eq(i).text(), 10);
					if (iPresetID <= 0) {
						break;
					}
					InsertPresetList(i + 1, iPresetID, $(xmlDoc).find('delay').eq(i).text(), $(xmlDoc).find('seqSpeed').eq(i).text())
				}
			}
		}
	});
}
/*************************************************
 Function:        StartPatrol
 Description:    开始一条路径
 Input:            iNo：序号
 Output:            无
 return:            无
 *************************************************/
function StartPatrol() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	var iPatternID = $('#selectPatrol').val();
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/patrols/" + iPatternID + "/start",
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        StopPatrol
 Description:    停止一条路径
 Input:            iNo：序号
 Output:            无
 return:            无
 *************************************************/
function StopPatrol() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	var iPatternID = $('#selectPatrol').val();
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/patrols/" + iPatternID + "/stop",
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        SavePatrol
 Description:    保存一条路径
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SavePatrol() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	var iPatternID = $('#selectPatrol').attr("value");
	var szXml = "";
	$("#PatrolPresetList").children("div").each(function () {
		var oChildren = $(this).children("span");
		var iPresetId = parseInt(oChildren.eq(2).attr("id"), 10);
		var iPatrolTime = parseInt(oChildren.eq(3).text().split("s")[0], 10);
		var iPatrolSpeed = oChildren.eq(4).text();
		szXml += "<PatrolSequence><presetID>" + iPresetId + "</presetID><delay>" + iPatrolTime + "</delay><seqSpeed>" + iPatrolSpeed + "</seqSpeed></PatrolSequence>";
	});
	szXml = ("<?xml version='1.0' encoding='UTF-8'?><PTZPatrol><enabled>true</enabled><id>" + iPatternID + "</id><patrolName>patrol " + (iPatternID > 9 ? iPatternID : ("0" + iPatternID)) + "</patrolName><PatrolSequenceList>" + szXml + "</PatrolSequenceList></PTZPatrol>");
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/patrols/" + iPatternID,
		processData:false,
		data:xmlDoc,
		complete:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        DeletePatrol
 Description:    删除一条路径
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function DeletePatrol() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	var iPatternID = $('#selectPatrol').attr("value");
	var szURL = m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/patrols/" + iPatternID;
	$.ajax({
		type:"DELETE",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:szURL,
		processData:false,
		success:function (xmlDoc, textStatus, xhr) {
			$('#PatrolPresetList').empty();
		}
	});
}
/*************************************************
 Function:        InitPattern
 Description:    初始化轨迹
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function InitPattern() {
	$.ajax({
		type:"GET",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		async:true,
		timeout:15000,
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/patterns",
		success:function (xmlDoc, textStatus, xhr) {
			var szName = parent.translator.translateNode(g_lxdPreview, 'Pattern');
			var iLen = $(xmlDoc).find('PTZPattern').length;
			if (0 == iLen) {
				m_oPtzTabs.hideTab(2);
				return;
			}
			for (var i = 1; i <= iLen; i++) {
				$("<div><span><label name='Pattern' class='fontnormal'>" + szName + "</label> " + i + "</span><span></span><span></span><span></span><span></span><span></span></div>").appendTo("#TrackArea").bind("click", {index:i},function (event) {
					if (!$(this).hasClass("select")) {
						$(this).siblings(".select").each(function () {
							$(this).removeClass("select");
							$(this).children("span").eq(1).removeClass("start").unbind();
							$(this).children("span").eq(2).removeClass("stop").unbind();
							$(this).children("span").eq(3).removeClass("startSave").unbind();
							$(this).children("span").eq(4).removeClass("stopSave").unbind();
							$(this).children("span").eq(5).removeClass("delete").unbind();
						});
						$(this).attr("class", "select");
						$(this).children("span").eq(1).addClass("start").attr("title", getNodeValue("Start")).bind("click", {index:event.data.index}, function (event) {
							StartPattern(event.data.index);
						});
						$(this).children("span").eq(2).addClass("stop").attr("title", getNodeValue("stop")).bind("click", {index:event.data.index}, function (event) {
							StopPattern(event.data.index);
						});
						$(this).children("span").eq(3).addClass("startSave").attr("title", getNodeValue("StartSave")).bind("click", {index:event.data.index}, function (event) {
							StartRecordPattern(event.data.index);
						});
						$(this).children("span").eq(4).addClass("stopSave").attr("title", getNodeValue("StopSave")).bind("click", {index:event.data.index}, function (event) {
							StopRecordPattern(event.data.index);
						});
						$(this).children("span").eq(5).addClass("delete").attr("title", getNodeValue("DelDigitalIpBtn")).bind("click", {index:event.data.index}, function (event) {
							DeletePattern(event.data.index);
						});
					}
				}).bind({
						mouseover:function () {
							if (!$(this).hasClass("select")) {
								$(this).addClass("enter");
							}
						},
						mouseout:function () {
							$(this).removeClass("enter");
						}
					}).children("span").eq(0).addClass("firstchild");
			}

		},
		error:function () {
			m_oPtzTabs.hideTab(2);
		}
	});
}

/*************************************************
 Function:        StartRecordPattern
 Description:    开始记录轨迹
 iPatternID : 轨迹ID
 Output:            无
 return:            无
 *************************************************/
function StartRecordPattern(iPatternID) {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		async:true,
		timeout:15000,
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/patterns/" + iPatternID + "/recordstart",
		processData:false,
		complete:function (xhr, textStatus) {
			if (xhr.status == 403) {
				if ("ptzOccupiedPriority" == $(xhr.responseXML).find("subStatusCode").eq(0).text()) {
					alert(getNodeValue("ptzOccupiedPriority"));
				} else {
					alert(getNodeValue('jsNoOperationRight'));
				}
			}
		}
	});
}
/*************************************************
 Function:        StopRecordPattern
 Description:    停止记录轨迹
 iPatternID : 轨迹ID
 Output:            无
 return:            无
 *************************************************/
function StopRecordPattern(iPatternID) {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	var szURL = m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/patterns/" + iPatternID + "/recordstop";
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		async:true,
		timeout:15000,
		url:szURL,
		processData:false,
		complete:function (xhr, textStatus) {
			if (xhr.status == 403) {
				if ("ptzOccupiedPriority" == $(xhr.responseXML).find("subStatusCode").eq(0).text()) {
					alert(getNodeValue("ptzOccupiedPriority"));
				} else {
					alert(getNodeValue('jsNoOperationRight'));
				}
			}
		}
	});
}
/*************************************************
 Function:        StartPattern
 Description:    开始轨迹
 iPatternID : 轨迹ID
 Output:            无
 return:            无
 *************************************************/
function StartPattern(iPatternID) {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		async:true,
		timeout:15000,
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/patterns/" + iPatternID + "/start",
		processData:false,
		complete:function (xhr, textStatus) {
			if (xhr.status == 403) {
				if ("ptzOccupiedPriority" == $(xhr.responseXML).find("subStatusCode").eq(0).text()) {
					alert(getNodeValue("ptzOccupiedPriority"));
				} else {
					alert(getNodeValue('jsNoOperationRight'));
				}
			}
		}
	});
}
/*************************************************
 Function:        StopPattern
 Description:    停止轨迹
 iPatternID : 轨迹ID
 Output:            无
 return:            无
 *************************************************/
function StopPattern(iPatternID) {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		async:true,
		timeout:15000,
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/patterns/" + iPatternID + "/stop",
		processData:false,
		complete:function (xhr, textStatus) {
			if (xhr.status == 403) {
				if ("ptzOccupiedPriority" == $(xhr.responseXML).find("subStatusCode").eq(0).text()) {
					alert(getNodeValue("ptzOccupiedPriority"));
				} else {
					alert(getNodeValue('jsNoOperationRight'));
				}
			}
		}
	});
}
/*************************************************
 Function:        DeletePattern
 Description:    删除轨迹
 iPatternID : 轨迹ID
 Output:            无
 return:            无
 *************************************************/
function DeletePattern(iPatternID) {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	$.ajax({
		type:"DELETE",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		async:true,
		timeout:15000,
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/patterns/" + iPatternID,
		processData:false,
		complete:function (xhr, textStatus) {
			if (xhr.status == 403) {
				if ("ptzOccupiedPriority" == $(xhr.responseXML).find("subStatusCode").eq(0).text()) {
					alert(getNodeValue("ptzOccupiedPriority"));
				} else {
					alert(getNodeValue('jsNoOperationRight'));
				}
			}
		}
	});
}
/*************************************************
 Function:        GetPatrolsCab
 Description:    获取巡航路径的能力
 input:          无
 Output:            无
 return:            无
 *************************************************/
function GetPatrolsCab() {
	$.ajax({
		type:"GET",
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/patrols",
		async:true,
		timeout:15000,
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		success:function (xmlDoc, textStatus, xhr) {
			var iLen = $(xmlDoc).find('PTZPatrol').length;
			if (0 == iLen) {
				m_oPtzTabs.hideTab(1);
				return;
			}
			$("#selectPatrol").empty();
			var szName = parent.translator.translateNode(g_lxdPreview, 'laTrack');
			for (var i = 0; i < iLen; i++) {
				if (i < 9) {
					$("<option value='" + (i + 1) + "'>" + szName + " 0" + (i + 1) + "</option>").appendTo("#selectPatrol");
				} else {
					$("<option value='" + (i + 1) + "'>" + szName + " " + (i + 1) + "</option>").appendTo("#selectPatrol");
				}
			}
			$("#selectPatrol").unbind().bind("change", function () {
				GetPatrol(this.value);
			});
			GetPatrolsDelayCab();
		},
		error:function (XMLHttpRequest, textStatus, errorThrown) {
			m_oPtzTabs.hideTab(1);
		}
	});
}
/*************************************************
 Function:        SetLight
 Description:    灯光设置
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetLight() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	if(!m_bLight) {
	    var szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZAux><id>1</id><type>LIGHT</type><status>on</status></PTZAux>"
	} else {
		var szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZAux><id>1</id><type>LIGHT</type><status>off</status></PTZAux>"
	}
	 var szURL = m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/auxcontrols/1";
	var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type: "PUT",
		beforeSend: function(xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url: szURL,
		processData: false,
		data: xmlDoc,
		success: function(xmlDoc, textStatus, xhr) {
			if(m_bLight) {
			    m_bLight = false;
				$("#light").removeClass("act");
			} else {
		        m_bLight = true;
				$("#light").addClass("act");
		    }
		},
		error:function (xhr, textStatus, errorThrown) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        SetWiper
 Description:    雨刷设置
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetWiper() {
	if (!HWP.wnds[0].isPlaying) {
		return;
	}
	if(!m_bWiper) {
		var szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZAux><id>1</id><type>WIPER</type><status>on</status></PTZAux>"
	} else {
		var szXml = "<?xml version='1.0' encoding='UTF-8'?><PTZAux><id>1</id><type>WIPER</type><status>off</status></PTZAux>"
	}
	 var szURL = m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/auxcontrols/1";
	 var xmlDoc = parseXmlFromStr(szXml);
	$.ajax({
		type: "PUT",
		beforeSend: function(xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url: szURL,
		processData: false,
		data: xmlDoc,
		success: function(xmlDoc, textStatus, xhr) {
			if (m_bWiper) {
				m_bWiper = false;
				if (g_bSupportWiperStatus) {
					$("#rain").removeClass("act");
				}
			} else {
				m_bWiper = true;
				if (g_bSupportWiperStatus) {
					$("#rain").addClass("act");
				}
			}
		},
		error:function (xhr, textStatus, errorThrown) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        SetOneKeyFocus
 Description:    一键聚焦
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetOneKeyFocus() {
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		async:true,
		timeout:40000,
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/onepushfoucs/start",
		processData:false,
		success:function (xmlDoc, textStatus, xhr) {
			//alert("success");
		},
		error:function (xhr, textStatus, errorThrown) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        SetInitCamera
 Description:    初始化镜头
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function SetInitCamera() {
	var szURL = m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/onepushfoucs/reset";
	
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		url:szURL,
		error:function (xhr, textStatus, errorThrown) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        GetTalkNum
 Description:    获取语音对讲通道数
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function GetTalkNum() {
	$.ajax({
		type:"GET",
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/System/TwoWayAudio/channels",
		async:false,
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		success:function (xmlDoc, textStatus, xhr) {
			m_iTalkNum = $(xmlDoc).find('TwoWayAudioChannel').length;
			if (m_iTalkNum > 0) {
				m_szaudioCompressionType = $(xmlDoc).find('audioCompressionType').eq(0).text();
			}
			if ($(xmlDoc).find('audioBitRate').length > 0) {
				g_iAudioBitRate = parseInt($(xmlDoc).find('audioBitRate').eq(0).text(), 10);
			}
		},
		error:function () {
			m_iTalkNum = 0;
		}
	});
}
/*************************************************
 Function:        Talk
 Description:    语言对讲
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function Talk(obj) {
	GetTalkNum();
	if (m_iTalkNum == 0) {
		return;
	}
	m_PreviewOCX = document.getElementById("PreviewActiveX");
	if (m_bTalk == 0) {
		if (m_iTalkNum <= 1) {
			var szOpenURL = m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/System/TwoWayAudio/channels/1/open";
			var szCloseURL = m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/System/TwoWayAudio/channels/1/close";
			var szDataUrl = m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/System/TwoWayAudio/channels/1/audioData";
			var iAudioType = 1;
			if (m_szaudioCompressionType == 'G.711ulaw') {
				iAudioType = 1;
			} else if (m_szaudioCompressionType == "G.711alaw") {
				iAudioType = 2;
			} else if (m_szaudioCompressionType == "G.726") {
				iAudioType = 3;
			} else if (m_szaudioCompressionType == "MP2L2" || m_szaudioCompressionType == "MPEL2") {
				iAudioType = 4;
			} else if (m_szaudioCompressionType == "G.722.1") {
				iAudioType = 0;
			}
			/*if (g_iAudioBitRate > 0) {
				var iTalk = m_PreviewOCX.HWP_StartVoiceTalkEx(szOpenURL, szCloseURL, szDataUrl, m_szUserPwdValue, parseInt(iAudioType), g_iAudioBitRate*1000, 0);
			} else */{
				var iTalk = m_PreviewOCX.HWP_StartVoiceTalk(szOpenURL, szCloseURL, szDataUrl, m_szUserPwdValue, parseInt(iAudioType));
			}
			
			if (iTalk == 0) {
				$("#voiceTalk").removeClass().addClass("voiceon").attr("title", parent.translator.translateNode(g_lxdPreview, 'StopvoiceTalk'));
				m_bTalk = 1;
			} else {
				var iError = m_PreviewOCX.HWP_GetLastError();
				if (403 == iError) {
					alert(parent.translator.translateNode(g_lxdPreview, 'jsNoOperationRight'));
				} else {
					alert(parent.translator.translateNode(g_lxdPreview, 'VoiceTalkFailed'));
				}
				return;
			}
		} else {
			$('#EditVoiceTalk').css('right', '2px');
			$('#EditVoiceTalk').css('top', $(obj).offset().top - $('#EditPatrolPreset').height() + 5);
			$('#EditVoiceTalk').modal();
		}
	} else {
		m_PreviewOCX.HWP_StopVoiceTalk();
		$("#voiceTalk").removeClass().addClass("voiceoff").attr("title", parent.translator.translateNode(g_lxdPreview, 'voiceTalk'));
		m_bTalk = 0;
	}
}
/*************************************************add: 2009-03-20
 Function:        SelectTalk
 Description:    选中语音通道
 Input:            num : 通道序号
 Output:            无
 return:            无
 *************************************************/
function SelectTalk(num) {
	if (document.getElementById("Num" + num).checked == false) {
		m_iTalkingNO = 0;
		return;
	}
	for (var i = 1; i < 3; i++) {
		if (i == num) {
			document.getElementById("Num" + i).checked = true;
		} else {
			document.getElementById("Num" + i).checked = false;
		}
	}
	m_iTalkingNO = num;
}
/*************************************************
 Function:        onVoiceTalkDlgOk
 Description:    确定选择进行对讲
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function onVoiceTalkDlgOk() {
	if (m_iTalkingNO == 0) {
		alert(parent.translator.translateNode(g_lxdPreview, 'ChooseTalkChan'));
		return;
	}
	var PlayOCX = document.getElementById("PreviewActiveX");
	var szOpenURL = m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/System/TwoWayAudio/channels/" + m_iTalkingNO + "/open";
	var szCloseURL = m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/System/TwoWayAudio/channels/" + m_iTalkingNO + "/close";
	var szDataUrl = m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/System/TwoWayAudio/channels/" + m_iTalkingNO + "/audioData";
	var iAudioType = 1;
	if (m_szaudioCompressionType == 'G.711ulaw') {
		iAudioType = 1;
	} else if (m_szaudioCompressionType == "G.711alaw") {
		iAudioType = 2;
	} else if (m_szaudioCompressionType == "G.726") {
		iAudioType = 3;
	} else if (m_szaudioCompressionType == "MP2L2" || m_szaudioCompressionType == "MPEL2") {
		iAudioType = 4;
	} else if (m_szaudioCompressionType == "G.722.1") {
		iAudioType = 0;
	}
	/*if (g_iAudioBitRate > 0) {
		var iTalk = m_PreviewOCX.HWP_StartVoiceTalkEx(szOpenURL, szCloseURL, szDataUrl, m_szUserPwdValue, parseInt(iAudioType), g_iAudioBitRate*1000, 0);
	} else */{
		var iTalk = m_PreviewOCX.HWP_StartVoiceTalk(szOpenURL, szCloseURL, szDataUrl, m_szUserPwdValue, parseInt(iAudioType));
	}
	if (iTalk == 0) {
		$("#voiceTalk").removeClass().addClass("voiceon").attr("title", parent.translator.translateNode(g_lxdPreview, 'StopvoiceTalk'));
		m_bTalk = 1;
	} else {
		var iError = m_PreviewOCX.HWP_GetLastError();
		if (403 == iError) {
			alert(parent.translator.translateNode(g_lxdPreview, 'jsNoOperationRight'));
		} else {
			alert(parent.translator.translateNode(g_lxdPreview, 'VoiceTalkFailed'));
		}
	}
	$.modal.impl.close();
}
/*************************************************
 Function:        size4to3
 Description:    插件按照4:3显示
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function size4to3() {
	m_iWndType = 1;
	var fRate = 4 / 3;
	if (g_bEnableCorridor) {
		fRate = 3 / 4;
	}
	var iBrowserHeight = parent.document.documentElement.clientHeight;
	var iPluginHeight = iBrowserHeight - 257;
	var iPluginWidth = parseInt(iPluginHeight * fRate, 10);
	//菜单
	parent.$('#header').width(974);
	parent.$('#nav').width(974);
	parent.$('#content').width(974).height(iBrowserHeight - 144);
	parent.$('#contentframe').width(938).height(iBrowserHeight - 180);
	//Plugin
	if (m_iPtzMode === 0) {
		$("#content").width(704);
		if (iPluginWidth > 704) {
			iPluginWidth = 704;
			iPluginHeight = parseInt(iPluginWidth / fRate, 10);
		}
	} else {
		$("#content").width(938);
		if (iPluginWidth > 938) {
			iPluginWidth = 938;
			iPluginHeight = parseInt(iPluginWidth / fRate, 10);
		}
	}
	$("#main_plugin").width(iPluginWidth).height(iPluginHeight);
	var iToolbarMinWidth = 10;
	$("#dvChangeSize").children("div:visible").each(function () {
		iToolbarMinWidth = iToolbarMinWidth + $(this).width();
	});
	if (iPluginWidth >= iToolbarMinWidth) {
		$("#dvChangeSize").width(iPluginWidth);
		$("#toolbar").width(iPluginWidth);
	} else {
		$("#dvChangeSize").width(iToolbarMinWidth);
		$("#toolbar").width(iToolbarMinWidth);
	}
	//PTZ
	$(".ptzpanes").height(iBrowserHeight - 374);
	$("#PatrolPresetList").height(iBrowserHeight - 433);

	$("#sp4to3").removeClass().addClass("size4to3over");
	$("#sp16to9").removeClass().addClass("size16to9out");
	$("#spOriginal").removeClass().addClass("originalout");
	$("#sizeauto").removeClass().addClass("sizeautoout");
}
/*************************************************
 Function:        size4to3
 Description:    插件按照4:3显示
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function size16to9() {
	m_iWndType = 2;
	var fRate = 16 / 9;
	if (g_bEnableCorridor) {
		fRate = 9 / 16;
	}
	var iBrowserHeight = parent.document.documentElement.clientHeight;
	var iPluginHeight = iBrowserHeight - 257;
	var iPluginWidth = parseInt(iPluginHeight * fRate, 10);
	//菜单
	parent.$('#header').width(974);
	parent.$('#nav').width(974);
	parent.$('#content').width(974).height(iBrowserHeight - 144);
	parent.$('#contentframe').width(938).height(iBrowserHeight - 180);
	//Plugin
	if (m_iPtzMode === 0) {
		$("#content").width(704);
		if (iPluginWidth > 704) {
			iPluginWidth = 704;
			iPluginHeight = parseInt(iPluginWidth / fRate, 10);
		}
	} else {
		$("#content").width(938);
		if (iPluginWidth > 938) {
			iPluginWidth = 938;
			iPluginHeight = parseInt(iPluginWidth / fRate, 10);
		}
	}
	$("#main_plugin").width(iPluginWidth).height(iPluginHeight);
	var iToolbarMinWidth = 10;
	$("#dvChangeSize").children("div:visible").each(function () {
		iToolbarMinWidth = iToolbarMinWidth + $(this).width();
	});
	if (iPluginWidth >= iToolbarMinWidth) {
		$("#dvChangeSize").width(iPluginWidth);
		$("#toolbar").width(iPluginWidth);
	} else {
		$("#dvChangeSize").width(iToolbarMinWidth);
		$("#toolbar").width(iToolbarMinWidth);
	}
	//PTZ
	$(".ptzpanes").height(iBrowserHeight - 374);
	$("#PatrolPresetList").height(iBrowserHeight - 433);

	$("#sp4to3").removeClass().addClass("size4to3out");
	$("#sp16to9").removeClass().addClass("size16to9over");
	$("#spOriginal").removeClass().addClass("originalout");
	$("#sizeauto").removeClass().addClass("sizeautoout");
}
/*************************************************
 Function:        setSize
 Description:    设置主页面框架大小适应
 Input:            iWidth : 插件的宽
 iHeight: 插件的高
 Output:            无
 return:            无
 *************************************************/
function setSize(iWidth, iHeight) {
	if (iHeight > 576) {
		parent.$('#content').height(iHeight + 79 + 34);
		parent.$('#contentframe').height(iHeight + 43 + 34);
	} else {
		parent.$('#content').height(689);
		parent.$('#contentframe').height(653);
	}
	if (iWidth > 774) {
		if (m_iPtzMode === 0) {
			parent.$('#content').width(iWidth + 270);
			parent.$('#header').width(iWidth + 270);
			parent.$('#nav').width(iWidth + 270);
			parent.$('#contentframe').width(iWidth + 234);
			$('#content').width(iWidth);
		} else {
			parent.$('#content').width(iWidth + 36);
			parent.$('#header').width(iWidth + 36);
			parent.$('#nav').width(iWidth + 36);
			parent.$('#contentframe').width(iWidth);
			$('#content').width(iWidth);
		}
	} else {
		var iSetWidth = 1044;
		if (iWidth <= 704) {
			iSetWidth = 974;
		}
		parent.$('#content').width(iSetWidth);
		parent.$('#header').width(iSetWidth);
		parent.$('#nav').width(iSetWidth);
		parent.$('#contentframe').width(iSetWidth - 36);
		if (m_iPtzMode === 0) {
			$('#content').width(iSetWidth - 270);
		} else {
			$('#content').width(iSetWidth - 36);
		}
	}
}
/*************************************************
 Function:        originSize
 Description:    原始尺寸
 Input:            iStreamType:0-主码流，1-子码流
 Output:            无
 return:            无
 *************************************************/
function originSize() {
	m_iWndType = 3;
	var xmlStreamDoc = $.ajax({
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/Streaming/channels",
		type:"GET",
		async:false,
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + ("YW5vbnltb3VzOn9/f39/fw==" === m_szUserPwdValue ? "" : m_szUserPwdValue));
		}
	}).responseXML;
	
	if (m_iStreamType === 0) {
		if (g_bEnableCorridor) {
			var iMainWndWidth = parseInt($(xmlStreamDoc).find("StreamingChannel").eq(0).find("videoResolutionHeight").eq(0).text(), 10);
			var iMainWndHeight = parseInt($(xmlStreamDoc).find("StreamingChannel").eq(0).find("videoResolutionWidth").eq(0).text(), 10);
		} else {
			var iMainWndWidth = parseInt($(xmlStreamDoc).find("StreamingChannel").eq(0).find("videoResolutionWidth").eq(0).text(), 10);
			var iMainWndHeight = parseInt($(xmlStreamDoc).find("StreamingChannel").eq(0).find("videoResolutionHeight").eq(0).text(), 10);
		}
		//给边框预留上下左右各1个像素
		if ("webcomponents" == $("#seSwitchPlugin").val()) {
			iMainWndWidth = iMainWndWidth + 2;
			iMainWndHeight = iMainWndHeight + 2;
		}

		setSize(iMainWndWidth, iMainWndHeight);
		$("#main_plugin").width(iMainWndWidth).height(iMainWndHeight);
		$("#dvChangeSize").width(iMainWndWidth);
		$("#toolbar").width(iMainWndWidth);
	} else {
		var xmlSubDoc = null;
		if (m_iStreamType === 1) {
			xmlSubDoc = $(xmlStreamDoc).find("StreamingChannel").eq(1);
		} else {
			xmlSubDoc = $(xmlStreamDoc).find("StreamingChannel").eq(2);
		}

		if (g_bEnableCorridor) {
			var iSubWndWidth = parseInt($(xmlSubDoc).find("videoResolutionHeight").eq(0).text(), 10);
			var iSubWndHeight = parseInt($(xmlSubDoc).find("videoResolutionWidth").eq(0).text(), 10);
		} else {
			var iSubWndWidth = parseInt($(xmlSubDoc).find("videoResolutionWidth").eq(0).text(), 10);
			var iSubWndHeight = parseInt($(xmlSubDoc).find("videoResolutionHeight").eq(0).text(), 10);
		}
		//给边框预留上下左右各1个像素
		if ("webcomponents" == $("#seSwitchPlugin").val()) {
			iSubWndWidth = iSubWndWidth + 2;
			iSubWndHeight = iSubWndHeight + 2;
		}

		var iToolbarMinWidth = 10;
		$("#dvChangeSize").children("div:visible").each(function () {
			iToolbarMinWidth = iToolbarMinWidth + $(this).width();
		});
		if (iSubWndWidth >= iToolbarMinWidth) {
			setSize(iSubWndWidth, iSubWndHeight);
			$("#main_plugin").width(iSubWndWidth).height(iSubWndHeight);
			$("#dvChangeSize").width(iSubWndWidth);
			$("#toolbar").width(iSubWndWidth);
		} else {
			setSize(iToolbarMinWidth, iSubWndHeight);
			$("#main_plugin").width(iSubWndWidth).height(iSubWndHeight);
			$("#dvChangeSize").width(iToolbarMinWidth);
			$("#toolbar").width(iToolbarMinWidth);
		}
	}

	$(".ptzpanes").height(458);
	$("#PatrolPresetList").height(399);
	$("#sp4to3").removeClass().addClass("size4to3out");
	$("#sp16to9").removeClass().addClass("size16to9out");
	$("#spOriginal").removeClass().addClass("originalover");
	$("#sizeauto").removeClass().addClass("sizeautoout");
}
/*************************************************
 Function:        autoSize
 Description:    高度自适应
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function autoSize() {
	m_iWndType = 0;
	var iBrowserHeight = parent.document.documentElement.clientHeight;
	parent.$('#header').width(974);
	parent.$('#nav').width(974);
	parent.$("#content").width(974).height(iBrowserHeight - 144);
	parent.$("#contentframe").width(938).height(iBrowserHeight - 144 - 36);
	if (m_iPtzMode === 0) {
		$("#content").width(704);
		$("#dvChangeSize").width(704);
		setTimeout(function () {
			$("#main_plugin").width(704).height(iBrowserHeight - 257);
		}, 10);
		$(".ptzpanes").height(iBrowserHeight - 374);
		$("#PatrolPresetList").height(iBrowserHeight - 433);
		$("#toolbar").width(704);
		if ($("#dvFishOSD").css("display") !== "none") {
			$("#dvFishOSD").width(704);
		}
	} else {
		$("#content").width(938);
		$("#dvChangeSize").width(938);
		setTimeout(function () {
			$("#main_plugin").width(938).height(iBrowserHeight - 257);
		}, 10);
		$(".ptzpanes").height(iBrowserHeight - 374);
		$("#PatrolPresetList").height(iBrowserHeight - 433);
		$("#toolbar").width(938);
		if ($("#dvFishOSD").css("display") !== "none") {
			$("#dvFishOSD").width(938);
		}
	}
	$("#sp4to3").removeClass().addClass("size4to3out");
	$("#sp16to9").removeClass().addClass("size16to9out");
	$("#spOriginal").removeClass().addClass("originalout");
	$("#sizeauto").removeClass().addClass("sizeautoover");
}
/*************************************************
 Function:        streamChoose
 Description:    主子码流选择
 Input:            iStreamType:0-主码流，1-子码流,2-三码流
 Output:            无
 return:            无
 *************************************************/
function streamChoose(iStreamType) {
	if (m_iStreamType !== iStreamType) {
		m_iStreamType = iStreamType;
		if (HWP.wnds[0].isPlaying) {
			StopRealPlay();
			if ("webcomponents" == $("#seSwitchPlugin").val()) {
				StartRealPlay();
			} else {
				switchVideoPlugin();
			}
		}
		if (m_iWndType === 3) {
			originSize();
		}
	}
	if (m_iStreamType === 0) {
		if (window.parent.g_bIsSupportThreeStream) {
			$("#threestream").removeClass().addClass("substreamout");
			$("#substream").removeClass().addClass("thirdstreamout");
			$("#mainstream").removeClass().addClass("mainstreamover");
		} else {
			$("#substream").removeClass().addClass("substreamout");
			$("#mainstream").removeClass().addClass("mainstreamover");
		}
	} else if (m_iStreamType === 1) {
		if (window.parent.g_bIsSupportThreeStream) {
			$("#threestream").removeClass().addClass("substreamout");
			$("#substream").removeClass().addClass("thirdstreamover");
			$("#mainstream").removeClass().addClass("mainstreamout");
		} else {
			$("#substream").removeClass().addClass("substreamover");
			$("#mainstream").removeClass().addClass("mainstreamout");
		}
	} else {
		$("#threestream").removeClass().addClass("substreamover");
		$("#substream").removeClass().addClass("thirdstreamout");
		$("#mainstream").removeClass().addClass("mainstreamout");
	}
}
/*************************************************
 Function:        ptzShow
 Description:    ptz显示隐藏
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function ptzShow() {
	if (m_iPtzMode === 0) {
		m_iPtzMode = 1;
		$("#contentRight").hide();
		$("#ptzshow").removeClass().addClass("ptzshowout");
	} else {
		m_iPtzMode = 0;
		$("#contentRight").show();
		$("#ptzshow").removeClass().addClass("ptzhideout");
		if (m_iPtzSpeed === 60) {
			sliderPtzSpd.wsetValue(4);
		}
	}
	switch (m_iWndType) {
		case 0:
			autoSize();
			break;
		case 1:
			size4to3();
			break;
		case 2:
			size16to9();
			break;
		case 3:
			originSize();
			break;
		default:
			break;
	}
}
/*************************************************
 Function:        ptzAdd
 Description:    ptz速度调大
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function ptzAdd() {
	var spd = sliderPtzSpd.getValue();
	if (spd < 7) {
		sliderPtzSpd.wsetValue(spd + 1);
		if (spd === 6) {
			m_iPtzSpeed = 100;
		} else {
			m_iPtzSpeed = (spd + 1) * 15;
		}
		sliderPtzSpd.setTitle(parent.translator.translateNode(g_lxdPreview, 'ptzSpeed') + ':' + (spd + 1));
	}
}
/*************************************************
 Function:        ptzReduce
 Description:    ptz速度调小
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function ptzReduce() {
	var spd = sliderPtzSpd.getValue();
	if (spd > 1) {
		sliderPtzSpd.wsetValue(spd - 1);
		m_iPtzSpeed = (spd - 1) * 15;
		sliderPtzSpd.setTitle(parent.translator.translateNode(g_lxdPreview, 'ptzSpeed') + ':' + (spd - 1));
	}
}
/*************************************************
 Function:        set3DZoom
 Description:    设置3D定位
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function set3DZoom() {
	if (HWP.wnds[0].isPlaying) {
		if (!g_bEnable3DZoom) {
			if (!g_bEnableManualTrack) {
				if (m_PreviewOCX.HWP_EnableZoom(0, 1) != 0) {
					return;
				}
			}
			$("#Start3DZoom").attr("title", getNodeValue("Stop3DZoom")).attr("class", "Stop3DZoom");
			g_bEnable3DZoom = true;

			$("#btnManualTrack").attr("title", getNodeValue("StartManualTrack")).attr("class", "StartMTrack");
			g_bEnableManualTrack = false;
		} else {
			m_PreviewOCX.HWP_DisableZoom(0);
			$("#Start3DZoom").attr("title", getNodeValue("Start3DZoom")).attr("class", "Start3DZoom");
			g_bEnable3DZoom = false;
		}
	}
}
/*************************************************
 Function:        setManualTrack
 Description:    设置手动跟踪
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function setManualTrack() {
	if (HWP.wnds[0].isPlaying) {
		if (!g_bEnableManualTrack) {
			if (!g_bEnable3DZoom) {
				if (m_PreviewOCX.HWP_EnableZoom(0, 1) != 0) {
					return;
				}
			}
			$("#btnManualTrack").attr("title", getNodeValue("StopManualTrack")).attr("class", "StopMTrack");
			g_bEnableManualTrack = true;

			$("#Start3DZoom").attr("title", getNodeValue("Start3DZoom")).attr("class", "Start3DZoom");
			g_bEnable3DZoom = false;
		} else {
			m_PreviewOCX.HWP_DisableZoom(0);
			$("#btnManualTrack").attr("title", getNodeValue("StartManualTrack")).attr("class", "StartMTrack");
			g_bEnableManualTrack = false;
		}
	}
}
/*************************************************
 Function:        ZoomInfoCallback
 Description:    区域信息回调
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function ZoomInfoCallback(szZoomInfo) {
	var xmlDoc = parseXmlFromStr(szZoomInfo);

	if (g_bEnableManualTrack) {
		var szXml = "<?xml version='1.0' encoding='UTF-8'?><ManualTrace><positionX>" + $(xmlDoc).find("StartPoint").eq(0).find("positionX").eq(0).text() + "</positionX><positionY>" + (255-parseInt($(xmlDoc).find("StartPoint").eq(0).find("positionY").eq(0).text(), 10)) + "</positionY></ManualTrace>";
		xmlDoc = parseXmlFromStr(szXml);
		var szURL = m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/ManualTrace";
	} else {
		var szXml = "<?xml version='1.0' encoding='UTF-8'?><position3D><StartPoint><positionX>" + $(xmlDoc).find("StartPoint").eq(0).find("positionX").eq(0).text() + "</positionX><positionY>" + (255-parseInt($(xmlDoc).find("StartPoint").eq(0).find("positionY").eq(0).text(), 10)) + "</positionY></StartPoint><EndPoint><positionX>" + $(xmlDoc).find("EndPoint").eq(0).find("positionX").eq(0).text() + "</positionX><positionY>" + (255-parseInt($(xmlDoc).find("EndPoint").eq(0).find("positionY").eq(0).text(), 10)) + "</positionY></EndPoint></position3D>";
		xmlDoc = parseXmlFromStr(szXml);
		var szURL = m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/position3D";
	}
	$.ajax({
		type:"PUT",
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		async:true,
		url:szURL,
		processData:false,
		data:xmlDoc,
		success:function (xmlDoc, textStatus, xhr) {
			//alert("success");
		},
		error:function (xhr, textStatus) {
			SetPTZCallback(xhr);
		}
	});
}
/*************************************************
 Function:        setEZoom
 Description:    设置电子
 Input:            无
 Output:            无
 return:            无
 *************************************************/
function setEZoom() {
	if (HWP.wnds[0].isPlaying) {
		if (!g_bEnableEZoom) {
			if (m_PreviewOCX.HWP_EnableZoom(0, 0) != 0) {
				return;
			}
			$("#dvEZoomBtn").attr("title", getNodeValue("laDisableZoom")).attr("class", "StopEZoom");
			g_bEnableEZoom = true;
		} else {
			m_PreviewOCX.HWP_DisableZoom(0);
			$("#dvEZoomBtn").attr("title", getNodeValue("laEnableZoom")).attr("class", "StartEZoom");
			g_bEnableEZoom = false;
		}
	}
}
/*************************************************
 Function:       getPTZCab
 Description:    获取云台能力
 Input:          无
 Output:         无
 return:         无
 *************************************************/
function getPTZCab() {
	$.ajax({
		url:m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/PTZCtrl/channels/1/capabilities",
		type:"GET",
		async:false,
		beforeSend:function (xhr) {
			xhr.setRequestHeader("If-Modified-Since", "0");
			xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
		},
		success:function (xmlDoc, textStatus, xhr) {
			var oSpecialPresets = $(xmlDoc).find("PTZChanelCap").eq(0).find("specialNo[opt]");
			if (oSpecialPresets.length > 0) {
				g_aSpecialPresets.length = 0;
				var aSpecialPresetOpt = oSpecialPresets.eq(0).attr("opt").split(",");
				for (var i = 0; i < aSpecialPresetOpt.length; i++) {
					g_aSpecialPresets.push(parseInt(aSpecialPresetOpt[i], 10));
				}
			}
			if ($(xmlDoc).find("PresetNameCap").eq(0).find("presetNameSupport").length > 0) {
				g_bSupportPresetName = true;
			} else {
				g_bSupportPresetName = false;
			}
			//雨刷状态能力
			if ($(xmlDoc).find("PTZChanelCap").eq(0).find("wiperStatusSupport").length > 0) {
				g_bSupportWiperStatus = !($(xmlDoc).find("wiperStatusSupport").eq(0).text() == "false");
			}
		}
	});
}
/*************************************************
 Function:       switchVideoPlugin
 Description:    切换视频插件
 input:          无
 Output:         无
 return:         无
 *************************************************/
function switchVideoPlugin() {
	var szPluginType = $("#seSwitchPlugin").val();
	var szURL = "";
	if (m_iStreamType == 0) {
		szURL = "rtsp://" + m_szHostName + ":" + m_lRtspPort + "/ISAPI/streaming/channels/101";
	} else if (m_iStreamType == 1) {
		szURL = "rtsp://" + m_szHostName + ":" + m_lRtspPort + "/ISAPI/streaming/channels/102";
	} else {
		szURL = "rtsp://" + m_szHostName + ":" + m_lRtspPort + "/ISAPI/streaming/channels/103";
	}
	szURL += "?auth=" + ("YW5vbnltb3VzOn9/f39/fw==" === m_szUserPwdValue ? "" : m_szUserPwdValue);
	StopRealPlay();  //关闭预览
	HWP.wnds[0].isPlaying = false;
	$("#main_plugin").html("");
	$("#dvSelectStream").show();
	if (!g_bIsIE) {
		var bInstalled = false;
		if ($.inArray(szPluginType, g_aPlugins) != -1) {
			bInstalled = true;
			if ("webcomponents" == szPluginType) {
				$("#main_plugin").html("<embed type='application/hwp-webvideo-plugin' id='PreviewActiveX' width='100%' height='100%' name='PreviewActiveX' align='center' wndtype='1' playmode='normal'>");
				$("#toolbar").show();
				setTimeout("StartRealPlay()", 10); //开启预览
			} else {
				if ("quicktime" == szPluginType) {
					$("#main_plugin").html('<embed src="main.asp" type="video/quicktime" width="100%" height="100%" autoplay="true" qtsrc="'+szURL+'" target="myself" scale="tofit" controller="false" pluginspage="http://www.apple.com/quicktime/download/" loop="false">');
					//$("#main_plugin").append('<div style="width:100%; height:100%; -moz-opacity:.01; opacity:.01; filter:alpha(opacity=1); position:absolute; z-index:1000; top:0;left:0;" oncontextmenu="return false"></div>');
					$("#toolbar").hide();
					HWP.wnds[0].isPlaying = true;
				} else if ("vlc" == szPluginType) {
					$("#main_plugin").html("<embed id='PreviewActiveX' type='application/x-vlc-plugin' width='100%' height='100%' target='"+szURL+"' autoplay='yes' controller='false' loop='no' volume='50' toolbar='false'>");
					//$("#PreviewActiveX").css({'width':'100%', 'height':'100%'});
					$("#toolbar").hide();
					HWP.wnds[0].isPlaying = true;
				} else if ("mjpeg" == szPluginType) {
					$("#main_plugin").html("<img src='/Streaming/channels/1/preview' width='100%' height='100%'>");
					$("#toolbar").hide();
					$("#dvSelectStream").hide();
					HWP.wnds[0].isPlaying = true;
				}
			}
		}
		m_PreviewOCX = null;
		if (!bInstalled) {
			if (navigator.platform == "Win32" && "webcomponents" == szPluginType) {
				var szInfo = getNodeValue('laPlugin');
				$("#main_plugin").html("<label name='laPlugin' onclick='window.open(\"../../codebase/WebComponents.exe\",\"_self\")' class='pluginLink' onMouseOver='this.className =\"pluginLinkSel\"' onMouseOut='this.className =\"pluginLink\"'>" + szInfo + "</label>");
			} else {
				var szInfo = getNodeValue('laNotWin32Plugin');
				$("#main_plugin").html("<label name='laNotWin32Plugin' onclick='' class='pluginLink' style='cursor:default; text-decoration:none;'>" + szInfo + "</label>");
			}
			$('#main_plugin').attr("style", "text-align:center;background-color:#343434;");
			$(".pluginLink").attr("style", "display:inline-block;margin-top:" + 280 + "px;");
		} else {
			if ("webcomponents" == szPluginType) {
				m_PreviewOCX = document.getElementById("PreviewActiveX");;
			}
		}
	} else {
		if ("webcomponents" == szPluginType) {
			$("#main_plugin").html("<object classid='clsid:E7EF736D-B4E6-4A5A-BA94-732D71107808' codebase='' id='PreviewActiveX' width='100%' height='100%' align='center'></object>");
			$("#toolbar").show();
			setTimeout("StartRealPlay()", 10); //开启预览
		} else {
			if ("quicktime" == szPluginType) {
				$("#main_plugin").html('<object id="PreviewActiveX" classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B" width="100%" height="100%" codebase="http://www.apple.com/qtactivex/qtplugin.cab"><param name="src" value="main.asp"/><param name="loop" value="false"><param name="autoplay" value="true"><param name="qtsrc" value="'+szURL+'"><param name="scale" value="tofit"><param name="controller" value="false"></object>');
				$("#toolbar").hide();
				HWP.wnds[0].isPlaying = true;
			}
		}
		m_PreviewOCX = null;
		var previewOCX = document.getElementById("PreviewActiveX");
		if (previewOCX == null || previewOCX.object == null) {
			if ((navigator.platform == "Win32") && "webcomponents" == szPluginType) {
				var szInfo = getNodeValue('laPlugin');
				$("#main_plugin").html("<label name='laPlugin' onclick='window.open(\"../../codebase/WebComponents.exe\",\"_self\")' class='pluginLink' onMouseOver='this.className =\"pluginLinkSel\"' onMouseOut='this.className =\"pluginLink\"'>" + szInfo + "<label>");
			} else {
				var szInfo = getNodeValue('laNotWin32Plugin');
				$("#main_plugin").html("<label name='laNotWin32Plugin' onclick='' class='pluginLink' style='cursor:default; text-decoration:none;'>" + szInfo + "<label>");
			}
			$('#main_plugin').attr("style", "text-align:center;background-color:#343434;");
			$(".pluginLink").attr("style", "display:inline-block;margin-top:" + 280 + "px;");
		} else {
			if ("webcomponents" == szPluginType) {
				m_PreviewOCX = previewOCX;
			}
		}
	}
	autoSize();
}
/*************************************************
 Function:       checkExistPlugins
 Description:    检测视频插件
 input:          无
 Output:         无
 return:         插件列表
 *************************************************/
function checkExistPlugins() {
	var aPlugins = [];
	if (g_bIsIE) {
		var obj = null;
		try {
			obj = new ActiveXObject("WebVideoActiveX.WebVideoActiveXCtrl.1");
			aPlugins.push("webcomponents");
		} catch(e) {
		}
		try {
			obj = new ActiveXObject("QuickTimeCheckObject.QuickTimeCheck.1");
			aPlugins.push("quicktime");
		} catch(e) {
		}
		//IE 下VLC会崩溃
		/*try {
			var obj = new ActiveXObject("VideoLAN.VLCPlugin.2");
			aPlugins.push("vlc");
		} catch(e) {
		}*/
	} else {
		for (var i = 0, len = navigator.mimeTypes.length; i < len; i++) {
			if (navigator.mimeTypes[i].type.toLowerCase() == "application/hwp-webvideo-plugin") {
				aPlugins.push("webcomponents");
			}
			if (navigator.mimeTypes[i].type.toLowerCase() == "application/x-vlc-plugin") {
				aPlugins.push("vlc");
			}
			if (navigator.mimeTypes[i].type.toLowerCase() == "video/quicktime") {
				aPlugins.push("quicktime");
			}
		}
		aPlugins.push("mjpeg");
	}
	return aPlugins;
}