/**
 * ==========================================================================
 * app.js - 全局中枢控制、全图层视频合成引擎与原生互动中心
 * ==========================================================================
 */

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
    const tabWeb = document.getElementById('tab-btn-web');
    const tabDy = document.getElementById('tab-btn-dy');
    const tabDm = document.getElementById('tab-btn-dm');

    if (tabWeb) tabWeb.addEventListener('click', () => window.switchRightTab('web'));
    if (tabDy) tabDy.addEventListener('click', () => window.switchRightTab('dy'));
    if (tabDm) tabDm.addEventListener('click', () => window.switchRightTab('dm'));

    /* ==========================================================================
       A. 高能热度波浪曲线 (Canvas 贝塞尔平滑绘制)
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

        let points = [15, 25, 60, 40, 85, 95, 45, 75, 30, 10];
        if (selWavePreset.value === 'climax') {
            points = [10, 15, 20, 25, 40, 50, 70, 85, 100, 90];
        } else if (selWavePreset.value === 'dense') {
            points = [30, 80, 45, 90, 35, 85, 40, 95, 50, 70, 30];
        } else if (selWavePreset.value === 'custom') {
            points = inCustomWave.value.split(',').map(n => Math.min(100, Math.max(0, parseInt(n.trim()) || 0)));
            if (points.length < 2) points = [10, 80, 20];
        }

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
            if (wrapCustomWave) wrapCustomWave.style.display = selWavePreset.value === 'custom' ? 'flex' : 'none';
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
       B. 播放器内部控件原生交互
       ========================================================================== */
    const btnCycleSpeed = document.getElementById('btn-cycle-speed');
    const dispSpeedVal = document.getElementById('disp-speed-val');
    const speeds = ['1.0X', '1.25X', '1.5X', '2.0X', '0.75X'];
    let speedIdx = 0;
    if (btnCycleSpeed && dispSpeedVal) {
        btnCycleSpeed.addEventListener('click', () => {
            speedIdx = (speedIdx + 1) % speeds.length;
            dispSpeedVal.textContent = speeds[speedIdx];
            const previewVideo = document.getElementById('preview-video');
            if (previewVideo) previewVideo.playbackRate = parseFloat(speeds[speedIdx]);
            window.showToast(`已切换倍速为：${speeds[speedIdx]}`);
        });
    }

    const dispBotRes = document.getElementById('disp-bot-res');
    const resOptions = ['原畫 1080P 60幀 ▾', 'Laya 藍光 4K ▾', '4K 120P 極致 ▾', '超清 720P ▾'];
    let resIdx = 0;
    if (dispBotRes) {
        dispBotRes.addEventListener('click', () => {
            resIdx = (resIdx + 1) % resOptions.length;
            dispBotRes.textContent = resOptions[resIdx];
            window.showToast(`已切换清晰度：${resOptions[resIdx].replace(' ▾', '')}`);
        });
    }

    const dyBtnLike = document.getElementById('dy-btn-like');
    const dySvgLike = document.getElementById('dy-svg-like');
    let isLiked = false;
    if (dyBtnLike && dySvgLike) {
        dyBtnLike.addEventListener('click', () => {
            isLiked = !isLiked;
            dySvgLike.setAttribute('fill', isLiked ? '#fe2c55' : '#ffffff');
            dyBtnLike.style.transform = 'scale(1.2)';
            setTimeout(() => { dyBtnLike.style.transform = 'scale(1)'; }, 150);
            window.showToast(isLiked ? '❤️ 点赞成功！' : '已取消点赞');
        });
    }

    const dyBtnStar = document.getElementById('dy-btn-star');
    const dySvgStar = document.getElementById('dy-svg-star');
    let isStarred = false;
    if (dyBtnStar && dySvgStar) {
        dyBtnStar.addEventListener('click', () => {
            isStarred = !isStarred;
            dySvgStar.setAttribute('fill', isStarred ? '#f1c40f' : '#ffffff');
            dyBtnStar.style.transform = 'scale(1.2)';
            setTimeout(() => { dyBtnStar.style.transform = 'scale(1)'; }, 150);
            window.showToast(isStarred ? '⭐ 已加入收藏！' : '已取消收藏');
        });
    }

    const dyBtnFollow = document.getElementById('dy-btn-follow');
    if (dyBtnFollow) {
        dyBtnFollow.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dyBtnFollow.textContent === '+') {
                dyBtnFollow.textContent = '✓';
                dyBtnFollow.classList.add('followed');
                window.showToast('已成功关注作者！');
            } else {
                dyBtnFollow.textContent = '+';
                dyBtnFollow.classList.remove('followed');
                window.showToast('已取消关注');
            }
        });
    }

    /* ==========================================================================
       C. 全站显隐开关与文案绑定 (包含中央圆钮与文字开关)
       ========================================================================== */
    const bindToggle = (switchId, targetId) => {
        const sw = document.getElementById(switchId);
        const target = document.getElementById(targetId);
        if (sw && target) {
            sw.addEventListener('change', (e) => {
                target.style.display = e.target.checked ? '' : 'none';
                if (switchId === 'sw-waveform') window.drawWaveform();
            });
        }
    };

    bindToggle('sw-danmaku', 'danmaku-container');
    // 关键更新：绑定中央圆钮与文字开关
    bindToggle('sw-center-btn', 'btn-toggle-playback');
    bindToggle('sw-center-pill', 'disp-center-pill');
    bindToggle('sw-bot-dm-group', 'wrap-bot-dm-group');
    bindToggle('sw-viewer', 'wrap-viewer-pill');
    bindToggle('sw-banner', 'wrap-banner');
    bindToggle('sw-free-pill', 'wrap-free-pill');
    bindToggle('sw-laya-badge', 'wrap-laya-badge');
    bindToggle('sw-vip-tag', 'wrap-vip-tag');
    bindToggle('sw-back-btn', 'wrap-back-btn');
    bindToggle('sw-top-right', 'wrap-top-right');
    bindToggle('sw-bottom-bar', 'wrap-bottom-bar');
    bindToggle('sw-waveform', 'wrap-waveform');
    bindToggle('sw-dy-gold', 'dy-wrap-gold');
    bindToggle('sw-dy-campaign', 'dy-wrap-campaign');
    bindToggle('sw-dy-right-bar', 'dy-wrap-right-bar');
    bindToggle('sw-dy-top-nav', 'dy-wrap-top-nav');
    bindToggle('sw-dy-purple-mask', 'dy-wrap-bottom-bar');

    const bindText = (inputId, outputId) => {
        const inp = document.getElementById(inputId);
        const out = document.getElementById(outputId);
        if (inp && out) {
            inp.addEventListener('input', (e) => { out.textContent = e.target.value; });
        }
    };
    bindText('in-title', 'disp-title');
    bindText('in-banner-body', 'disp-banner-body');
    bindText('in-dm-placeholder', 'disp-dm-placeholder');
    bindText('in-dy-likes', 'dy-val-likes');
    bindText('in-dy-comments', 'dy-val-comments');
    bindText('in-dy-stars', 'dy-val-stars');
    bindText('in-dy-shares', 'dy-val-shares');
    bindText('in-dy-author', 'dy-disp-author');
    bindText('in-dy-desc', 'dy-disp-desc');
    bindText('in-dy-tags', 'dy-disp-tags');
    bindText('in-dy-campaign', 'dy-disp-campaign');
    bindText('in-dy-gold-title', 'dy-disp-gold-title');
    bindText('in-dy-gold-views', 'dy-disp-gold-views');

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

    const dyAvatarUploader = document.getElementById('dy-avatar-uploader');
    const dyAvatarImg = document.getElementById('dy-avatar-img');
    if (dyAvatarUploader && dyAvatarImg) {
        dyAvatarUploader.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                dyAvatarImg.src = evt.target.result;
                window.showToast('头像已成功更新！');
            };
            reader.readAsDataURL(file);
        });
    }

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
       D. 全局繁简一键智能互转 (严格只作用于左侧播放器画面内，绝不影响右侧控制台)
       ========================================================================== */
    let isTraditional = true;
    const s2tDict = {
        '视频': '視頻', '暗号': '暗號', '独家': '獨家', '私密': '私密', '免费': '免費',
        '通道': '通道', '正在观看': '正在觀看', '原画': '原畫', '原画质连线': '原畫質連線',
        '音轨': '音軌', '设置': '設置', '限时特权': '限時特權',
        '已解锁完整无码未删减版，点击任意处播放': '已解鎖完整無碼未刪減版，點擊任意處播放',
        '特权生效中': '特權生效中', '点击继续播放': '點擊繼續播放', '点击暂停播放': '點擊暫停播放', '弹幕': '彈幕',
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

            // 仅对 #render-target 内部遍历，严格保护右侧控制面板永远保持简体
            const walker = document.createTreeWalker(renderTarget, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while ((node = walker.nextNode())) {
                let txt = node.nodeValue;
                if (!txt || !txt.trim()) continue;
                for (const [s, t] of Object.entries(dict)) {
                    txt = txt.replaceAll(s, t);
                }
                node.nodeValue = txt;
            }
            window.showToast(isTraditional ? '画面已切换为：繁体中文' : '画面已切换为：简体中文');
        });
    }

    /* ==========================================================================
       E. 超高清截图导出
       ========================================================================== */
    const btnSaveImg = document.getElementById('btn-save-img');
    if (btnSaveImg) {
        btnSaveImg.addEventListener('click', () => {
            const renderTarget = document.getElementById('render-target');
            if (!renderTarget) return;

            window.showToast('📸 正在渲染超高清图片 (包含全套边框与UI)...');

            html2canvas(renderTarget, {
                scale: 2.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#000000',
                onclone: (clonedDoc) => {
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
                window.showToast('✅ 高清图片已成功保存！');
            }).catch(err => {
                window.showToast(`❌ 导出失败: ${err.message}`);
            });
        });
    }

    /* ==========================================================================
       F. 全图层视频合成引擎
       ========================================================================== */
    const btnSaveVid = document.getElementById('btn-save-vid');
    if (btnSaveVid) {
        btnSaveVid.addEventListener('click', async () => {
            const previewVideo = document.getElementById('preview-video');
            const renderTarget = document.getElementById('render-target');
            const inMediaScale = document.getElementById('in-media-scale');
            const inPosY = document.getElementById('in-pos-y');

            if (!window.PlayerEngine || !window.PlayerEngine.isVideoMode || !previewVideo) {
                window.showToast('提示：请先上传一段 MP4/WebM 视频素材！');
                return;
            }

            let recordSeconds = parseInt(selRecordSec.value);
            if (selRecordSec.value === 'custom') {
                recordSeconds = Math.max(1, parseInt(inCustomSec.value) || 8);
            }

            btnSaveVid.textContent = `⏳ 正在预处理 UI 边框图层...`;
            btnSaveVid.disabled = true;

            try {
                const isDouyin = renderTarget.classList.contains('mode-mobile-port');
                const outW = isDouyin ? 720 : 1280;
                const outH = isDouyin ? 1280 : 720;

                const uiSnapshotCanvas = await html2canvas(renderTarget, {
                    backgroundColor: null,
                    scale: outW / renderTarget.offsetWidth,
                    useCORS: true,
                    allowTaint: true,
                    onclone: (clonedDoc) => {
                        const media = clonedDoc.getElementById('player-media-wrap');
                        if (media) media.style.visibility = 'hidden';
                        const dm = clonedDoc.getElementById('danmaku-container');
                        if (dm) dm.style.visibility = 'hidden';
                    }
                });

                btnSaveVid.textContent = `⏳ 录制合成中 (${recordSeconds}s)...`;

                const offCanvas = document.createElement('canvas');
                offCanvas.width = outW;
                offCanvas.height = outH;
                const ctx = offCanvas.getContext('2d');

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
                    console.warn('Web Audio capture:', audioErr);
                }

                const canvasStream = offCanvas.captureStream(30);
                const combinedStream = new MediaStream([
                    ...canvasStream.getVideoTracks(),
                    ...audioTracks
                ]);

                const mime = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') ? 'video/mp4' : 'video/webm';
                const recorder = new MediaRecorder(combinedStream, { mimeType: mime });
                const chunks = [];

                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) chunks.push(e.data);
                };

                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: mime });
                    const a = document.createElement('a');
                    a.download = `Laya_${isDouyin ? 'TikTok' : 'WebPlayer'}_${Date.now()}.${mime.includes('mp4') ? 'mp4' : 'webm'}`;
                    a.href = URL.createObjectURL(blob);
                    a.click();

                    btnSaveVid.textContent = '合成下载视频 (带边框与原声)';
                    btnSaveVid.disabled = false;
                    window.showToast('🎉 带边框、控制栏与原声的视频已导出完成！');
                };

                const danmakuParticles = (window.DanmakuEngine ? window.DanmakuEngine.getActiveList() : []).map((dm, idx) => ({
                    text: dm.text,
                    color: isDouyin ? '#ffffff' : dm.color,
                    y: (outH * (isDouyin ? (12 + (idx % 5) * 8) : dm.top)) / 100,
                    x: outW + (idx * 190),
                    speed: (dm.speed ? (22 - dm.speed) : 9) * 0.95
                }));

                previewVideo.currentTime = 0;
                previewVideo.play();
                if (window.PlayerEngine && window.PlayerEngine.updatePlayStateUI) {
                    window.PlayerEngine.updatePlayStateUI(true);
                }
                recorder.start();

                let isRecording = true;
                const drawVideoFrame = () => {
                    if (!isRecording) return;

                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, outW, outH);

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
                    ctx.drawImage(uiSnapshotCanvas, 0, 0, outW, outH);

                    const swDm = document.getElementById('sw-danmaku');
                    if (swDm && swDm.checked) {
                        const fontSize = (parseInt(document.getElementById('in-danmaku-size').value) || 16) * (outW / 960);
                        ctx.font = `bold ${fontSize}px sans-serif`;
                        ctx.lineWidth = 3.5;
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

                    requestAnimationFrame(drawVideoFrame);
                };

                drawVideoFrame();

                setTimeout(() => {
                    isRecording = false;
                    recorder.stop();
                }, recordSeconds * 1000);

            } catch (err) {
                console.error(err);
                btnSaveVid.textContent = '合成下载视频 (带边框与原声)';
                btnSaveVid.disabled = false;
                window.showToast(`导出异常: ${err.message}`);
            }
        });
    }
})();
