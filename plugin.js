(function() {
    // 常量定义
    const CONSTANTS = {
        qrSize: 200,
        margin: 20,
        downloadLogoSize: 40,
        displayLogoSize: 40,
        logoPadding: 5
    };
    CONSTANTS.totalSize = CONSTANTS.qrSize + 2 * CONSTANTS.margin;

    // 创建插件图标
    function createPluginIcon() {
        const pluginIcon = document.createElement('div');
        pluginIcon.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            background-color: #4285f4;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            z-index: 9998;
            transition: transform 0.1s ease;
        `;

        // 加载SVG图标
        fetch(chrome.runtime.getURL('icons/icon-fg.svg'))
            .then(response => response.text())
            .then(svgContent => {
                pluginIcon.innerHTML = svgContent;
            })
            .catch(error => {
                console.error('加载图标失败:', error);
            });

        // 添加鼠标事件监听器
        pluginIcon.addEventListener('mousedown', () => pluginIcon.style.transform = 'scale(0.9)');
        pluginIcon.addEventListener('mouseup', () => pluginIcon.style.transform = 'scale(1)');
        pluginIcon.addEventListener('mouseleave', () => pluginIcon.style.transform = 'scale(1)');

        return pluginIcon;
    }

    // 创建二维码容器
    function createQRContainer() {
        const qrContainer = document.createElement('div');
        qrContainer.style.cssText = `
            position: fixed;
            bottom: 70px;
            right: 20px;
            z-index: 9999;
            background-color: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 5px 25px rgba(0,0,0,0.3);
            display: none;
            flex-direction: column;
            align-items: center;
            opacity: 0;
            transform: scale(0.5);
            transform-origin: bottom right;
            transition: opacity 0.2s ease, transform 0.2s ease;
        `;
        return qrContainer;
    }

    // 创建二维码包装器
    function createQRWrapper() {
        const qrWrapper = document.createElement('div');
        qrWrapper.style.cssText = `
            position: relative;
            width: ${CONSTANTS.qrSize}px;
            height: ${CONSTANTS.qrSize}px;
        `;
        return qrWrapper;
    }

    // 创建二维码图像
    function createQRCode(url) {
        const qrCode = new Image();
        qrCode.crossOrigin = "Anonymous";
        qrCode.src = url;
        qrCode.style.cssText = `
            width: 100%;
            height: 100%;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
        `;
        return qrCode;
    }

    // 创建网站名称元素
    function createSiteName() {
        const siteName = document.createElement('div');
        siteName.textContent = document.title || window.location.hostname;
        siteName.style.cssText = `
            margin-top: 12px;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            max-width: ${CONSTANTS.qrSize}px;
            word-wrap: break-word;
            overflow-wrap: break-word;
        `;
        return siteName;
    }

    // 创建上下文菜单
    function createContextMenu() {
        const contextMenu = document.createElement('div');
        contextMenu.style.cssText = `
            position: absolute;
            background-color: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 5px 0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            display: none;
            z-index: 10000;
        `;

        const downloadOption = document.createElement('div');
        downloadOption.textContent = '下载二维码';
        downloadOption.style.cssText = `
            padding: 5px 20px;
            cursor: pointer;
            &:hover {
                background-color: #f0f0f0;
            }
        `;

        contextMenu.appendChild(downloadOption);
        return { contextMenu, downloadOption };
    }

    // 切换二维码显示状态
    function toggleQRContainer(qrContainer) {
        if (qrContainer.style.display === 'none') {
            qrContainer.style.display = 'flex';
            requestAnimationFrame(() => {
                qrContainer.style.opacity = '1';
                qrContainer.style.transform = 'scale(1)';
            });
        } else {
            qrContainer.style.opacity = '0';
            qrContainer.style.transform = 'scale(0.5)';
            setTimeout(() => {
                qrContainer.style.display = 'none';
            }, 200);
        }
    }

    // 获取网站favicon的URL
    async function getFaviconUrl() {
        const favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
        if (favicon) {
            return await checkImageValidity(favicon.href);
        }
        return await checkImageValidity(`${window.location.origin}/favicon.ico`);
    }

    // 检查图片是否有效
    function checkImageValidity(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(url);
            img.onerror = () => resolve(null);
            img.src = url;
        });
    }

    // 创建下载链接
    function createDownloadLink(canvas) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'qrcode.png';
                resolve(link);
            });
        });
    }

    // 主函数
    async function main() {
        const pluginIcon = createPluginIcon();
        const qrContainer = createQRContainer();
        const qrWrapper = createQRWrapper();
        const currentUrl = encodeURIComponent(window.location.href);
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${CONSTANTS.qrSize}x${CONSTANTS.qrSize}&data=${currentUrl}`;
        const qrCode = createQRCode(qrCodeUrl);
        const siteName = createSiteName();
        const { contextMenu, downloadOption } = createContextMenu();

        qrWrapper.appendChild(qrCode);
        qrContainer.appendChild(qrWrapper);
        qrContainer.appendChild(siteName);
        document.body.appendChild(contextMenu);
        document.body.appendChild(pluginIcon);
        document.body.appendChild(qrContainer);

        pluginIcon.addEventListener('click', () => toggleQRContainer(qrContainer));

        const faviconUrl = await getFaviconUrl();
        let logo = null;

        if (faviconUrl) {
            logo = await createLogo(faviconUrl);
            if (logo) {
                const logoWrapper = createLogoWrapper(logo);
                qrWrapper.appendChild(logoWrapper);
            }
        }

        qrWrapper.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            contextMenu.style.display = 'block';
            contextMenu.style.left = `${e.clientX}px`;
            contextMenu.style.top = `${e.clientY}px`;
        });

        downloadOption.addEventListener('click', () => handleDownload(qrCode, siteName.textContent, logo));

        document.addEventListener('click', () => {
            contextMenu.style.display = 'none';
        });
    }

    // 创建Logo
    async function createLogo(faviconUrl) {
        const logo = new Image();
        logo.crossOrigin = "Anonymous";
        logo.src = faviconUrl;
        logo.style.cssText = `
            width: 100%;
            height: 100%;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
        `;
        return new Promise((resolve) => {
            logo.onload = () => resolve(logo);
            logo.onerror = () => resolve(null);
        });
    }

    // 创建Logo包装器
    function createLogoWrapper(logo) {
        const wrapperSize = CONSTANTS.displayLogoSize;
        const logoSize = wrapperSize - 2 * CONSTANTS.logoPadding;

        const logoWrapper = document.createElement('div');
        logoWrapper.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: ${wrapperSize}px;
            height: ${wrapperSize}px;
            border-radius: 50%;
            background-color: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        `;
        
        const logoContainer = document.createElement('div');
        logoContainer.style.cssText = `
            width: ${logoSize}px;
            height: ${logoSize}px;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const logoImg = document.createElement('img');
        logoImg.src = logo.src;
        logoImg.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        `;
        
        logoContainer.appendChild(logoImg);
        logoWrapper.appendChild(logoContainer);
        return logoWrapper;
    }

    // 绘制圆角Logo
    function drawRoundedLogo(ctx, logo, width, height, x = 0, y = 0) {
        const radius = 8;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logo, x, y, width, height);
    }

    // 处理下载
    async function handleDownload(qrCode, siteNameText, logo) {
        const bottomMargin = 20;
        const titleMaxWidth = CONSTANTS.qrSize;
        const lineHeight = 20;
        const titlePadding = 5;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = CONSTANTS.totalSize;
        
        ctx.font = 'bold 16px Arial';
        const lines = getLines(ctx, siteNameText, titleMaxWidth);
        const titleHeight = lines.length * lineHeight + 2 * titlePadding;
        
        canvas.height = CONSTANTS.totalSize + bottomMargin + titleHeight;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(qrCode, CONSTANTS.margin, CONSTANTS.margin, CONSTANTS.qrSize, CONSTANTS.qrSize);

        if (logo) {
            drawLogoOnCanvas(ctx, logo);
        }

        drawSiteNameOnCanvas(ctx, lines, titlePadding, lineHeight);

        try {
            const link = await createDownloadLink(canvas);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('创建下载链接时出错:', error);
        }
    }

    // 在画布上绘制Logo
    function drawLogoOnCanvas(ctx, logo) {
        const qrCodeCenter = CONSTANTS.margin + CONSTANTS.qrSize / 2;
        const logoSize = CONSTANTS.downloadLogoSize;
        const logoX = qrCodeCenter - logoSize / 2;
        const logoY = qrCodeCenter - logoSize / 2;
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = logoSize;
        tempCanvas.height = logoSize;
        
        // 绘制白色圆形背景
        tempCtx.beginPath();
        tempCtx.arc(logoSize / 2, logoSize / 2, logoSize / 2, 0, Math.PI * 2, true);
        tempCtx.fillStyle = 'white';
        tempCtx.fill();
        
        // 在临时画布上绘制logo
        const logoDrawSize = logoSize - 2 * CONSTANTS.logoPadding;
        const logoDrawX = CONSTANTS.logoPadding;
        const logoDrawY = CONSTANTS.logoPadding;
        
        tempCtx.save();
        tempCtx.beginPath();
        tempCtx.moveTo(logoDrawX + 8, logoDrawY);
        tempCtx.lineTo(logoDrawX + logoDrawSize - 8, logoDrawY);
        tempCtx.quadraticCurveTo(logoDrawX + logoDrawSize, logoDrawY, logoDrawX + logoDrawSize, logoDrawY + 8);
        tempCtx.lineTo(logoDrawX + logoDrawSize, logoDrawY + logoDrawSize - 8);
        tempCtx.quadraticCurveTo(logoDrawX + logoDrawSize, logoDrawY + logoDrawSize, logoDrawX + logoDrawSize - 8, logoDrawY + logoDrawSize);
        tempCtx.lineTo(logoDrawX + 8, logoDrawY + logoDrawSize);
        tempCtx.quadraticCurveTo(logoDrawX, logoDrawY + logoDrawSize, logoDrawX, logoDrawY + logoDrawSize - 8);
        tempCtx.lineTo(logoDrawX, logoDrawY + 8);
        tempCtx.quadraticCurveTo(logoDrawX, logoDrawY, logoDrawX + 8, logoDrawY);
        tempCtx.closePath();
        tempCtx.clip();
        tempCtx.drawImage(logo, logoDrawX, logoDrawY, logoDrawSize, logoDrawSize);
        tempCtx.restore();
        
        // 将临时画布的内容绘制到主画布上
        ctx.drawImage(tempCanvas, logoX, logoY, logoSize, logoSize);
    }

    // 在画布上绘制网站名称
    function drawSiteNameOnCanvas(ctx, lines, titlePadding, lineHeight) {
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        lines.forEach((line, index) => {
            const y = CONSTANTS.totalSize + titlePadding + (index * lineHeight) + (lineHeight / 2);
            ctx.fillText(line, CONSTANTS.totalSize / 2, y);
        });
    }

    // 获取文本行
    function getLines(ctx, text, maxWidth) {
        const lines = [];
        let currentLine = '';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const testLine = currentLine + char;
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = char;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }

    // 执行主函数
    main();
})();