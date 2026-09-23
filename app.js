/**
 * ==========================================================================
 * app.js - 全局中枢控制、动效绘制与音视频导出引擎
 * ==========================================================================
 */

// 1. 全局 Toast 浮动提示通知函数 (挂载到 window 供所有模块调用)
window.showToast = function (msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 260);
    }, 2800);
};

// 2. 右侧面板选项卡切换函数 (挂载到 window 供 player.js 模式切换调用)
window.switchRightTab = function (mode) {
    const tabWeb = document.getElementById('tab-btn-web');
    const tabDy = document.getElementById('tab-btn-dy');
    const tabDm = document.getElementById('tab-btn-dm');
    const panelWeb = document.getElementById('panel-web-settings');
    const panelDy = document.getElementById('panel-dy-settings');
    const panelDm = document.getElementById('panel-dm-settings');

    [tabWeb, tabDy, tabDm].forEach(b => b && b.classList.remove('active'));
    [panelWeb, panelDy, panelDm].forEach(p => p && p.classList.remove('active'));

    if (mode === 'web') {
        if (tabWeb) tabWeb.classList.add('active');
        if (panelWeb) panelWeb.classList.add('active');
    } else if (mode === 'dy') {
        if (tabDy) tabDy.classList.add('active');
        if (panelDy) panelDy.classList.add('active');
    } else if (mode === 'dm') {
        if (tabDm) tabDm.classList.add('active');
        if (panelDm) panelDm.classList.add('active');
    }
};

(function () {
    /* ==========================================================================
       A. 选项卡点击事件绑定
       ========================================================================== */
    const tabWeb = document.getElementById('tab-btn-web');
    const tabDy = document.getElementById('tab-btn-dy');
    const tabDm = document.getElementById('tab-btn-dm');

    if (tabWeb) tabWeb.addEventListener('click', () => window.switchRightTab('web'));
    if (tabDy) tabDy.addEventListener('click', () => window.switchRightTab('dy'));
    if (tabDm) tabDm.addEventListener('click', () => window.switchRightTab('dm'));

    /* ==========================================================================
       B. 高能热度波浪曲线 (Canvas 贝塞尔平滑绘制引擎)
       ========================================================================== */
    const waveCanvas = document.getElementById('waveform-canvas');
    const wrapWaveform = document.getElementById('wrap-waveform');
    const swWaveform = document.getElementById('sw-waveform');
    const selWavePreset = document.getElementById('sel-waveform-preset');
    const inWaveHeight = document.getElementById('in-wave-height');
    const txtWaveHeight = document.getElementById('txt-wave-height');
    const inCustomWave = document.getElementById('in-custom-wave');
    const wrapCustomWave = document.getElementById('wrap-custom-wave');

    window.drawWaveform = function () {
        if (!swWaveform || !wrapWaveform || !waveCanvas) return;
        if (!swWaveform.checked) {
            wrapWaveform.style.display = 'none';
            return;
        }
        wrapWaveform.style.display = 'block';

        const ctx = waveCanvas.getContext('2d');
        const w = (waveCanvas.width = waveCanvas.offsetWidth || 800);
        const h = (waveCanvas.height = parseInt(inWaveHeight.value) || 32);

        ctx.clearRect(0, 0, w, h);

        // 获取波形控制点数据
        let points = [15, 25, 60, 40, 85, 95, 45, 75, 30, 10]; // 默认双高峰
        if (selWavePreset.value === 'climax') {
            points = [10, 15, 20, 25, 40, 50, 70, 85, 100, 90];
        } else if (selWavePreset.value === 'dense') {
            points = [30, 80, 45, 90, 35, 85, 40, 95, 50, 70, 30];
        } else if (selWavePreset.value === 'custom') {
            points = inCustomWave.value.split(',').map(n => Math.min(100, Math.max(0, parseInt(n.trim()) || 0)));
            if (points.length < 2) points = [10, 80, 20];
        }

        // 绘制三阶贝塞尔平滑曲面
        ctx.beginPath();
        ctx.moveTo(0, h);
        const step = w / (points.length - 1);
        for (let i = 0; i < points.length; i++) {
            const x = i * step;
            const y = h - (points[i] / 100) * (h - 4);
            if (i === 0) {
                ctx.lineTo(x, y);
            } else {
                const prevX = (i - 1) * step;
                const prevY = h - (points[i - 1] / 100) * (h - 4);
                const cx = (prevX + x) / 2;
                ctx.bezierCurveTo(cx, prevY, cx, y, x, y);
            }
        }
        ctx.lineTo(w, h);
        ctx.closePath();

        // 渐变填充与描边
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    };

    if (selWavePreset) {
        selWavePreset.addEventListener('change', () => {
            if (wrapCustomWave) {
                wrapCustomWave.style.display = selWavePreset.value === 'custom' ? 'flex' : 'none';
            }
            window.drawWaveform();
        });
    }

    if (inWaveHeight && txtWaveHeight && wrapWaveform) {
        inWaveHeight.addEventListener('input', (e) => {
            txtWaveHeight.textContent = e.target.value + 'px';
            wrapWaveform.style.height = e.target.value + 'px';
            window.drawWaveform();
        });
    }

    if (inCustomWave) inCustomWave.addEventListener('input', window.drawWaveform);
    window.addEventListener('resize', window.drawWaveform);
    setTimeout(window.drawWaveform, 200);

    /* ==========================================================================
       C. 全站控件显隐开关矩阵绑定
       ========================================================================== */
    const bindToggleSwitch = (switchId, targetId) => {
        const sw = document.getElementById(switchId);
        const target = document.getElementById(targetId);
        if (sw && target) {
            sw.addEventListener('change', (e) => {
                target.style.display = e.target.checked ? '' : 'none';
                if (switchId === 'sw-waveform') window.drawWaveform();
            });
        }
    };

    // Web 控件开关
    bindToggleSwitch('sw-danmaku', 'danmaku-container');
    bindToggleSwitch('sw-bot-dm-group', 'wrap-bot-dm-group');
    bindToggleSwitch('sw-viewer', 'wrap-viewer-pill');
    bindToggleSwitch('sw-banner', 'wrap-banner');
    bindToggleSwitch('sw-free-pill', 'wrap-free-pill');
    bindToggleSwitch('sw-laya-badge', 'wrap-laya-badge');
    bindToggleSwitch('sw-vip-tag', 'wrap-vip-tag');
    bindToggleSwitch('sw-back-btn', 'wrap-back-btn');
    bindToggleSwitch('sw-top-right', 'wrap-top-right');
    bindToggleSwitch('sw-bottom-bar', 'wrap-bottom-bar');
    bindToggleSwitch('sw-waveform', 'wrap-waveform');

    // 抖音短视频控件开关
    bindToggleSwitch('sw-dy-gold', 'dy-wrap-gold');
    bindToggleSwitch('sw-dy-campaign', 'dy-wrap-campaign');
    bindToggleSwitch('sw-dy-right-bar', 'dy-wrap-right-bar');
    bindToggleSwitch('sw-dy-top-nav', 'dy-wrap-top-nav');
    bindToggleSwitch('sw-dy-purple-mask', 'dy-wrap-bottom-bar');

    /* ==========================================================================
       D. 文案与骚话双向实时数据绑定
       ========================================================================== */
    const bindTextSync = (inputId, outputId) => {
        const inp = document.getElementById(inputId);
        const out = document.getElementById(outputId);
        if (inp && out) {
            inp.addEventListener('input', (e) => {
                out.textContent = e.target.value;
            });
        }
    };

    // Web 文案绑定
    bindTextSync('in-title', 'disp-title');
    bindTextSync('in-banner-body', 'disp-banner-body');
    bindTextSync('in-dm-placeholder', 'disp-dm-placeholder');

    // 抖音互动数据与文案绑定
    bindTextSync('in-dy-likes', 'dy-val-likes');
    bindTextSync('in-dy-comments', 'dy-val-comments');
    bindTextSync('in-dy-stars', 'dy-val-stars');
    bindTextSync('in-dy-shares', 'dy-val-shares');
    bindTextSync('in-dy-author', 'dy-disp-author');
    bindTextSync('in-dy-desc', 'dy-disp-desc');
    bindTextSync('in-dy-tags', 'dy-disp-tags');
    bindTextSync('in-dy-campaign', 'dy-disp-campaign');
    bindTextSync('in-dy-gold-title', 'dy-disp-gold-title');
    bindTextSync('in-dy-gold-views', 'dy-disp-gold-views');

    // 底部弹幕骚话预设下拉框选择联动
    const selDmPreset = document.getElementById('sel-dm-preset');
    const inDmPlaceholder = document.getElementById('in-dm-placeholder');
    const dispDmPlaceholder = document.getElementById('disp-dm-placeholder');
    if (selDmPreset && inDmPlaceholder && dispDmPlaceholder) {
        selDmPreset.addEventListener('change', (e) => {
            if (e.target.value !== 'custom') {
                inDmPlaceholder.value = e.target.value;
                dispDmPlaceholder.textContent = e.target.value;
            } else {
                inDmPlaceholder.focus();
                inDmPlaceholder.select();
            }
        });
    }

    // 抖音头像自定义上传
    const dyAvatarUploader = document.getElementById('dy-avatar-uploader');
    const dyAvatarImg = document.getElementById('dy-avatar-img');
    if (dyAvatarUploader && dyAvatarImg) {
        dyAvatarUploader.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                dyAvatarImg.src = evt.target.result;
                window.showToast('頭像已成功更新！');
            };
            reader.readAsDataURL(file);
        });
    }

    /* ==========================================================================
       E. 录制时长控制联动 (5s / 10s / 15s / 自定义)
       ========================================================================== */
    const selRecordSec = document.getElementById('sel-record-sec');
    const inCustomSec = document.getElementById('in-custom-sec');
    if (selRecordSec && inCustomSec) {
        selRecordSec.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                inCustomSec.style.display = 'inline-block';
                inCustomSec.focus();
            } else {
                inCustomSec.style.display = 'none';
            }
        });
    }

    /* ==========================================================================
       F. 全局繁简一键智能互转总引擎
       ========================================================================== */
    let isTraditional = true;
    const s2tDict = {
        '视频': '視頻', '暗号': '暗號', '独家': '獨家', '私密': '私密', '免费': '免費',
        '通道': '通道', '正在观看': '正在觀看', '原画': '原畫', '原画质连线': '原畫質連線',
        '音轨': '音軌', '设置': '設置', '限时特权': '限時特權',
        '已解锁完整无码未删减版，点击任意处播放': '已解鎖完整無碼未刪減版，點擊任意處播放',
        '特权生效中': '特權生效中', '点击继续播放': '點擊繼續播放', '弹幕': '彈幕',
        '倍速': '倍速', '精选': '精選', '热点': '熱點', '关注': '關注', '全屏观看': '全屏觀看',
        '心动匹配': '心動匹配', '来Laya 语音厅，亲自演给你看 >': '來Laya 語音廳，親自演給你看 >',
        '视频榜单：最让你心动的女优评选大赛': '視頻榜單：最讓你心動的女優評選大賽',
        '万人在看 >': '萬人在看 >', '首页': '首頁', '瞬间': '瞬間', '派对': '派對', '我的': '我的'
    };
    const t2sDict = Object.fromEntries(Object.entries(s2tDict).map(([k, v]) => [v, k]));

    const btnToggleLang = document.getElementById('btn-toggle-lang');
    if (btnToggleLang) {
        btnToggleLang.addEventListener('click', () => {
            isTraditional = !isTraditional;
            const dict = isTraditional ? s2tDict : t2sDict;

            const renderTarget = document.getElementById('render-target');
            if (!renderTarget) return;

            // 递归替换纯文本叶子节点
            const walker = document.createTreeWalker(renderTarget, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while ((node = walker.nextNode())) {
                let txt = node.nodeValue;
                if (!txt || !txt.trim()) continue;
                for (const [sourceWord, targetWord] of Object.entries(dict)) {
                    txt = txt.replaceAll(sourceWord, targetWord);
                }
                node.nodeValue = txt;
            }

            window.showToast(isTraditional ? '已切換為：繁體中文' : '已切换为：简体中文');
        });
    }

    /* ==========================================================================
       G. 高清截图导出引擎 (html2canvas 修复错位与颜色黑化)
       ========================================================================== */
    const btnSaveImg = document.getElementById('btn-save-img');
    if (btnSaveImg) {
        btnSaveImg.addEventListener('click', () => {
            const renderTarget = document.getElementById('render-target');
            if (!renderTarget) return;

            window.showToast('📸 正在渲染超高清圖片...');

            html2canvas(renderTarget, {
                scale: 2.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#000000',
                onclone: (clonedDoc) => {
                    // 深度冻结弹幕实时坐标，防止截图中弹幕闪烁或消失
                    const origBox = renderTarget.getBoundingClientRect();
                    const origItems = renderTarget.querySelectorAll('.danmaku-item');
                    const clonedContainer = clonedDoc.getElementById('danmaku-container');
                    const clonedItems = clonedContainer ? clonedContainer.querySelectorAll('.danmaku-item') : [];

                    origItems.forEach((orig, idx) => {
                        if (clonedItems[idx]) {
                            const r = orig.getBoundingClientRect();
                            clonedItems[idx].style.animation = 'none';
                            clonedItems[idx].style.transform = 'none';
                            clonedItems[idx].style.left = (r.left - origBox.left) + 'px';
                            clonedItems[idx].style.top = (r.top - origBox.top) + 'px';
                        }
                    });
                }
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `Laya_${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png', 1.0);
                link.click();
                window.showToast('✅ 高清圖片已成功保存！');
            }).catch(err => {
                window.showToast(`❌ 導出失敗: ${err.message}`);
                console.error(err);
            });
        });
    }

    /* ==========================================================================
       H. 实时合成带框短视频 (保留原声 + 自定义录制时长 + 真实时间码走动)
       ========================================================================== */
    const btnSaveVid = document.getElementById('btn-save-vid');
    if (btnSaveVid) {
        btnSaveVid.addEventListener('click', async () => {
            const previewVideo = document.getElementById('preview-video');
            const renderTarget = document.getElementById('render-target');
            const inMediaScale = document.getElementById('in-media-scale');
            const inPosY = document.getElementById('in-pos-y');

            if (!window.PlayerEngine || !window.PlayerEngine.isVideoMode || !previewVideo) {
                window.showToast('提示：請先上傳一段 MP4/WebM 視頻素材！');
                return;
            }

            // 计算录制时长
            let recordSeconds = parseInt(selRecordSec.value);
            if (selRecordSec.value === 'custom') {
                recordSeconds = Math.max(1, parseInt(inCustomSec.value) || 8);
            }

            btnSaveVid.textContent = `⏳ 錄製合成中 (${recordSeconds}s)...`;
            btnSaveVid.disabled = true;

            try {
                const isDouyin = renderTarget.classList.contains('mode-mobile-port');
                const outW = isDouyin ? 720 : 1280;
                const outH = isDouyin ? 1280 : 720;

                const offCanvas = document.createElement('canvas');
                offCanvas.width = outW;
                offCanvas.height = outH;
                const ctx = offCanvas.getContext('2d');

                // 1. Web Audio 原声捕获管线
                let audioTracks = [];
                try {
                    if (!window._audioCtx) {
                        window._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                        window._audioSrc = window._audioCtx.createMediaElementSource(previewVideo);
                        window._audioDst = window._audioCtx.createMediaStreamDestination();
                        window._audioSrc.connect(window._audioDst);
                        window._audioSrc.connect(window._audioCtx.destination);
                    }
                    audioTracks = window._audioDst.stream.getAudioTracks();
                } catch (audioErr) {
                    console.warn('Web Audio capture pipeline:', audioErr);
                }

                // 2. 画布流与音轨合并
                const canvasStream = offCanvas.captureStream(30);
                const combinedStream = new MediaStream([
                    ...canvasStream.getVideoTracks(),
                    ...audioTracks
                ]);

                // 智能容器与编码嗅探
                const mime = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') ? 'video/mp4' : 'video/webm';
                const recorder = new MediaRecorder(combinedStream, { mimeType: mime });
                const chunks = [];

                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) chunks.push(e.data);
                };

                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: mime });
                    const a = document.createElement('a');
                    a.download = `Laya_${isDouyin ? 'ShortVideo' : 'Player'}_${Date.now()}.${mime.includes('mp4') ? 'mp4' : 'webm'}`;
                    a.href = URL.createObjectURL(blob);
                    a.click();

                    btnSaveVid.textContent = '合成下載視頻 (帶原聲)';
                    btnSaveVid.disabled = false;
                    window.showToast('🎉 帶框視頻已成功導出！');
                };

                // 3. 准备弹幕粒子
                const danmakuParticles = (window.DanmakuEngine ? window.DanmakuEngine.getActiveList() : []).map((dm, idx) => ({
                    text: dm.text,
                    color: isDouyin ? '#ffffff' : dm.color,
                    y: (outH * (isDouyin ? (10 + (idx % 4) * 8) : dm.top)) / 100,
                    x: outW + (idx * 180),
                    speed: (dm.speed ? (22 - dm.speed) : 9) * 0.95
                }));

                // 重置播放位置并启动录制
                previewVideo.currentTime = 0;
                previewVideo.play();
                if (window.PlayerEngine.updatePlayStateUI) window.PlayerEngine.updatePlayStateUI(true);
                recorder.start();

                let isRecording = true;
                const drawVideoFrame = () => {
                    if (!isRecording) return;

                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, outW, outH);

                    // A. 视频帧位移与缩放精准绘制
                    const vw = previewVideo.videoWidth || 1280;
                    const vh = previewVideo.videoHeight || 720;
                    const mAspect = vw / vh;
                    const cAspect = outW / outH;
                    const zoom = (parseFloat(inMediaScale.value) || 100) / 100;

                    let rw, rh;
                    if (mAspect > cAspect) {
                        rh = outH * zoom;
                        rw = rh * mAspect;
                    } else {
                        rw = outW * zoom;
                        rh = rw / mAspect;
                    }

                    const posY = (parseFloat(inPosY.value) || 50) / 100;
                    const offY = (outH - rh) * posY;
                    const offX = (outW - rw) * 0.5;

                    ctx.drawImage(previewVideo, offX, offY, rw, rh);

                    // B. 动态弹幕图层
                    const swDm = document.getElementById('sw-danmaku');
                    if (swDm && swDm.checked) {
                        const fontSize = (parseInt(document.getElementById('in-danmaku-size').value) || 16) * (outW / 960);
                        ctx.font = `bold ${fontSize}px sans-serif`;
                        ctx.lineWidth = 3;
                        ctx.strokeStyle = '#000000';

                        danmakuParticles.forEach(p => {
                            p.x -= p.speed;
                            if (p.x < -ctx.measureText(p.text).width - 60) {
                                p.x = outW + Math.random() * 120;
                            }
                            ctx.strokeText(p.text, p.x, p.y);
                            ctx.fillStyle = p.color;
                            ctx.fillText(p.text, p.x, p.y);
                        });
                    }

                    // C. Web 模式控件叠层渲染 (带秒数实时递增走动)
                    if (!isDouyin) {
                        // 顶部遮罩渐变
                        const topGrad = ctx.createLinearGradient(0, 0, 0, 110);
                        topGrad.addColorStop(0, 'rgba(0,0,0,0.88)');
                        topGrad.addColorStop(0.7, 'rgba(0,0,0,0.4)');
                        topGrad.addColorStop(1, 'transparent');
                        ctx.fillStyle = topGrad;
                        ctx.fillRect(0, 0, outW, 110);

                        // 底部遮罩渐变
                        const botGrad = ctx.createLinearGradient(0, outH - 90, 0, outH);
                        botGrad.addColorStop(0, 'transparent');
                        botGrad.addColorStop(1, 'rgba(0,0,0,0.92)');
                        ctx.fillStyle = botGrad;
                        ctx.fillRect(0, outH - 90, outW, 90);

                        // 绘制进度条与实时累加时间码
                        const baseStart = window.PlayerEngine.timeToSec(document.getElementById('in-start-time').value);
                        const totalSec = window.PlayerEngine.timeToSec(document.getElementById('in-total-time').value) || 5325;
                        const curSec = baseStart + Math.floor(previewVideo.currentTime);
                        const progressPct = Math.min(1, curSec / totalSec);

                        const barY = outH - 42;
                        const barW = outW - 48;

                        // 底轨
                        ctx.fillStyle = 'rgba(255,255,255,0.2)';
                        ctx.fillRect(24, barY, barW, 4);

                        // 播放进度
                        ctx.fillStyle = '#1877F2';
                        ctx.fillRect(24, barY, barW * progressPct, 4);

                        // 发光圆钮
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(24 + barW * progressPct, barY + 2, 5, 0, Math.PI * 2);
                        ctx.fill();

                        // 动态递增时间文字
                        ctx.font = '12px monospace';
                        ctx.fillStyle = '#d0d4dc';
                        ctx.fillText(`${window.PlayerEngine.secToTime(curSec)} / ${window.PlayerEngine.secToTime(totalSec)}`, 24, outH - 16);
                    }

                    requestAnimationFrame(drawVideoFrame);
                };

                drawVideoFrame();

                // 录制到期停止
                setTimeout(() => {
                    isRecording = false;
                    recorder.stop();
                }, recordSeconds * 1000);

            } catch (err) {
                console.error(err);
                btnSaveVid.textContent = '合成下載視頻 (帶原聲)';
                btnSaveVid.disabled = false;
                window.showToast(`導出異常: ${err.message}`);
            }
        });
    }
})();
