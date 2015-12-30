/*****************************************************
 FileName: Plugin.js
 Description: 插件管理类
 Author: wuyang
 Date: 2011.12.27
 *****************************************************/

function Plugin(iWndNum, szIP, szHttpPort, szRtspPort) {
	this.iWndNum = iWndNum; // 子窗体个数
	this.iProtocolType = 0; // 取流方式，默认为RTSP
	this.wnds = new Array(this.iWndNum);
	var that = this;
	$.each(this.wnds, function (iWndNo) {
		that.wnds[iWndNo] = {
			isPlaying:false
		};
	});
	this.isPlaying = function () {
		var ret = false;
		$.each(this.wnds, function (iWndNo, wnd) {
			if (wnd.isPlaying) {
				ret = true;
				return false;
			}
		});
		return ret;
	};
	this.destory = function () {
		this.Stop();
		$("#main_plugin").empty();
	};
	this.ArrangeWindow = function (iWndType) {
		try {
			$("#PreviewActiveX")[0].HWP_ArrangeFECWindow(iWndType);
		} catch (e) {
		}
	}
	this.Play = function (iWndNo) {
		if (arguments.length === 0) {
			iWndNo = 0;
		}
		if (this.wnds[iWndNo].isPlaying) {
			return 0;
		}
		try {
			var previewOCX = $("#PreviewActiveX")[0];
			try {
				var szLocalCfg = previewOCX.HWP_GetLocalConfig();
			} catch (e) {
				var szLocalCfg = previewOCX.GetLocalConfig();
			}
			var xmlDoc = parseXmlFromStr(szLocalCfg);
			m_iProtocolType = this.iProtocolType = parseInt(xmlDoc.documentElement.childNodes[0].childNodes[0].nodeValue); // 此全局变量暂时保留，wuyang
			var szURL = "";
			//若支持私有协议且本地协议选择为RTP OVER RTSP -TCP
			//if (window.parent.g_bSupportSHTTP && 0 == m_iProtocolType) {
            if ( 0 == m_iProtocolType) {
				szURL = "http://" + m_szHostName + ":" + szHttpPort + "/SDK/play/100/004";  //[能力可以得到支持那种封装]这里最后以为暂时使用RTP包
			} else {
				szURL = "rtsp://" + szIP + ":" + ((this.iProtocolType === 4) ? szHttpPort : szRtspPort) + "/ISAPI/streaming/channels/" + (101 + iWndNo);
			}

			var iRet = previewOCX.HWP_Play(szURL, m_szUserPwdValue, iWndNo, "", "");
			if (iRet === 0) {
				this.wnds[iWndNo].isPlaying = true;
				//强制I帧
				$.ajax({
					type: "PUT",
					url: m_lHttp + m_szHostName + ":" + m_lHttpPort + "/ISAPI/Streaming/channels/101/requestKeyFrame",
					async: false,
					beforeSend: function (xhr) {
						xhr.setRequestHeader("If-Modified-Since", "0");
						xhr.setRequestHeader("Authorization", "Basic " + m_szUserPwdValue);
					}
				});
			}
			return iRet;
		} catch (e) {
			return -1;
		}
	};
	this.Stop = function (iWndNo) {
		function Stop(iWndNo) {
			if (!that.wnds[iWndNo].isPlaying) {
				return 0;
			}
			that.wnds[iWndNo].isPlaying = false;
			try {
				return $("#PreviewActiveX")[0].HWP_Stop(iWndNo);
			} catch (e) {
				return -1;
			}
		}

		if (arguments.length === 0) {
			var iRet = 0;
			$.each(this.wnds, function (iWndNo, wnd) {
				if (Stop(iWndNo) !== 0) {
					iRet = -1;
				}
			});
			return iRet;
		} else {
			return Stop(iWndNo);
		}
	};
	this.SetDrawStatus = function (bStartDraw) {
		try {
			return $("#PreviewActiveX")[0].HWP_SetDrawStatus(bStartDraw);
		} catch (e) {
			return -1;
		}
	};
	this.GetRegionInfo = function () {
		try {
			return $("#PreviewActiveX")[0].HWP_GetRegionInfo();
		} catch (e) {
			return "";
		}
	};
	this.SetRegionInfo = function (szRegionInfo) {
		try {
			return $("#PreviewActiveX")[0].HWP_SetRegionInfo(szRegionInfo);
		} catch (e) {
			return -1;
		}
	};
	this.ClearRegion = function () {
		try {
			return $("#PreviewActiveX")[0].HWP_ClearRegion();
		} catch (e) {
			return -1;
		}
	};
	this.GetTextOverlay = function () {
		try {
			return $("#PreviewActiveX")[0].HWP_GetTextOverlay();
		} catch (e) {
			return "";
		}
	};
	this.SetTextOverlay = function (szTextOverlay) {
		try {
			return $("#PreviewActiveX")[0].HWP_SetTextOverlay(szTextOverlay);
		} catch (e) {
			return -1;
		}
	};
	this.SetPlayModeType = function (iPlayMode) {
		try {
			return $("#PreviewActiveX")[0].HWP_SetPlayModeType(iPlayMode);
		} catch (e) {
			return -1;
		}
	};
	this.SetCanFullScreen = function (iMode) {
		try {
			return $("#PreviewActiveX")[0].HWP_SetCanFullScreen(iMode);
		} catch (e) {
			return -1;
		}
	};
	//添加原本抓拍机设置线和获取线接口，这里复用到越界侦测
	this.SetSnapLineInfo = function (szInfo) {
		try {
			return $("#PreviewActiveX")[0].HWP_SetSnapLineInfo(szInfo);
		} catch (e) {
			return -1;
		}
	};
	this.SetSnapPolygonInfo = function (szInfo) {
		try {
			return $("#PreviewActiveX")[0].HWP_SetSnapPolygonInfo(szInfo);
		} catch (e) {
			return -1;
		}
	};
	this.GetGetSnapPolygonInfo = function () {
		try {
			return $("#PreviewActiveX")[0].HWP_GetSnapPolygonInfo();
		} catch (e) {
			return "";
		}
	};
	this.GetSnapLineInfo = function () {
		try {
			return $("#PreviewActiveX")[0].HWP_GetSnapLineInfo();
		} catch (e) {
			return "";
		}
	};
	this.ClearSnapInfo = function (iMode) {
		try {
			return $("#PreviewActiveX")[0].HWP_ClearSnapInfo(iMode);
		} catch (e) {
			return -1;
		}
	};
	this.SetSnapDrawMode = function (iType) {
		try {
			return $("#PreviewActiveX")[0].HWP_SetSnapDrawMode(0, iType); //模式-1:不绘图，0-编辑线 1-矩形 2-多边形
		} catch (e) {
			return -1;
		}
	};

	var bOpenFileBrowsing = false; // 解决Linux下Firefox的非模态
	this.OpenFileBrowser = function (iMode, szReserve) { // iMode: 0-文件夹, 1-文件
		if (bOpenFileBrowsing) {
			return;
		}
		bOpenFileBrowsing = true;
		var szPath = null;
		try {
			szPath = $("#PreviewActiveX")[0].HWP_OpenFileBrowser(iMode, szReserve);
		} catch (e) {
		}
		setTimeout(function () {
			bOpenFileBrowsing = false;
		}, 10); // 解决Linux下Chrome的click记忆
		return szPath;
	};
}