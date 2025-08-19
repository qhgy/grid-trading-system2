// 网格交易管理系统 2.0 - 主应用文件
class GridTradingApp {
    constructor() {
        this.grids = [];
        this.trades = [];
        this.currentGrid = null;
        this.chart = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.bindEvents();
        this.updateDisplay();
        this.requestNotificationPermission();
    }

    // 绑定事件
    bindEvents() {
        // 网格表单提交
        document.getElementById('grid-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createGrid();
        });

        // 网格版本切换
        document.getElementById('gridVersion').addEventListener('change', (e) => {
            this.toggleGridParams(e.target.value);
        });

        // 实时计算压力测试
        ['startPrice', 'gridSize', 'gridAmount', 'gridCount', 'totalFunds'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.updateStressTest();
                });
            }
        });

        // 初始化显示2.1版本参数
        this.toggleGridParams('2.1');
    }

    // 切换网格参数显示
    toggleGridParams(version) {
        // 隐藏所有参数区域
        document.getElementById('basic-params').style.display = 'block';
        document.getElementById('profit-retention-params').style.display = 'none';
        document.getElementById('progressive-params').style.display = 'none';
        document.getElementById('multi-grid-params').style.display = 'none';

        // 根据版本显示对应参数
        switch(version) {
            case '2.1':
                document.getElementById('profit-retention-params').style.display = 'block';
                break;
            case '2.2':
                document.getElementById('progressive-params').style.display = 'block';
                break;
            case '2.3':
                document.getElementById('multi-grid-params').style.display = 'block';
                document.getElementById('basic-params').style.display = 'none';
                break;
            case '1.0':
                // 只显示基础参数
                break;
        }
        
        // 更新压力测试
        this.updateStressTest();
    }

    // 创建网格
    createGrid() {
        const gridVersion = document.getElementById('gridVersion').value;
        let symbol = document.getElementById('symbol').value;
        const customSymbol = document.getElementById('customSymbol').value;
        const startPrice = parseFloat(document.getElementById('startPrice').value);
        const gridSize = parseFloat(document.getElementById('gridSize').value);

        // 处理自定义品种
        if (symbol === 'custom' || customSymbol) {
            if (!customSymbol) {
                alert('请输入自定义品种名称');
                return;
            }
            symbol = customSymbol;
        }

        if (!symbol || !startPrice || !gridSize) {
            alert('请填写完整的基础参数');
            return;
        }

        let grid;

        switch(gridVersion) {
            case '2.1':
                grid = this.createProfitRetentionGrid(symbol, startPrice, gridSize);
                break;
            case '2.2':
                grid = this.createProgressiveGrid(symbol, startPrice, gridSize);
                break;
            case '2.3':
                grid = this.createMultiGrid(symbol, startPrice, gridSize);
                break;
            case '1.0':
                grid = this.createBasicGrid(symbol, startPrice, gridSize);
                break;
            default:
                alert('请选择网格策略版本');
                return;
        }

        if (grid) {
            this.grids.push(grid);
            this.currentGrid = grid;
            this.saveData();
            this.updateDisplay();
            
            alert(`${gridVersion}版网格创建成功！`);
        }
    }

    // 创建2.1留利润版网格
    createProfitRetentionGrid(symbol, startPrice, gridSize) {
        const gridAmount = parseFloat(document.getElementById('gridAmount').value);
        const gridCount = parseInt(document.getElementById('gridCount').value);
        const retentionType = document.getElementById('retentionType').value;

        if (!gridAmount || !gridCount) {
            alert('请填写完整的留利润版参数');
            return null;
        }

        const grid = {
            id: Date.now(),
            version: '2.1',
            symbol: symbol,
            symbolName: this.getSymbolName(symbol),
            startPrice: startPrice,
            gridSize: gridSize / 100,
            gridAmount: gridAmount,
            gridCount: gridCount,
            retentionType: retentionType,
            grids: [],
            retainedShares: 0,
            createdAt: new Date().toISOString()
        };

        // 生成网格点
        for (let i = 0; i < gridCount; i++) {
            const buyPrice = startPrice * Math.pow(1 - grid.gridSize, i);
            const sellPrice = i === 0 ? startPrice * (1 + grid.gridSize) : startPrice * Math.pow(1 - grid.gridSize, i - 1);
            
            grid.grids.push({
                index: i + 1,
                buyPrice: buyPrice,
                sellPrice: sellPrice,
                amount: gridAmount,
                status: 'waiting',
                buyDate: null,
                sellDate: null,
                profit: 0,
                retainedShares: 0
            });
        }

        return grid;
    }

    // 创建基础版网格
    createBasicGrid(symbol, startPrice, gridSize) {
        const gridAmount = parseFloat(document.getElementById('gridAmount').value);
        const gridCount = parseInt(document.getElementById('gridCount').value);

        if (!gridAmount || !gridCount) {
            alert('请填写完整的基础版参数');
            return null;
        }

        const grid = {
            id: Date.now(),
            version: '1.0',
            symbol: symbol,
            symbolName: this.getSymbolName(symbol),
            startPrice: startPrice,
            gridSize: gridSize / 100,
            gridAmount: gridAmount,
            gridCount: gridCount,
            grids: [],
            createdAt: new Date().toISOString()
        };

        // 生成网格点
        for (let i = 0; i < gridCount; i++) {
            const buyPrice = startPrice * Math.pow(1 - grid.gridSize, i);
            const sellPrice = i === 0 ? startPrice * (1 + grid.gridSize) : startPrice * Math.pow(1 - grid.gridSize, i - 1);
            
            grid.grids.push({
                index: i + 1,
                buyPrice: buyPrice,
                sellPrice: sellPrice,
                amount: gridAmount,
                status: 'waiting',
                buyDate: null,
                sellDate: null,
                profit: 0
            });
        }

        return grid;
    }

    // 获取品种名称
    getSymbolName(symbol) {
        const names = {
            // 指数ETF
            '510500': '中证500ETF',
            '510300': '沪深300ETF',
            '159915': '创业板ETF',
            '588000': '科创50ETF',
            // 行业ETF
            '515000': '科技ETF',
            '512880': '券商ETF',
            '512800': '银行ETF',
            '512120': '医药ETF',
            '159928': '消费ETF',
            // 商品ETF
            '518880': '黄金ETF',
            '518290': '白银ETF',
            '159930': '原油ETF',
            // 海外ETF
            '513100': '纳指ETF',
            '513500': '标普500ETF'
        };
        return names[symbol] || symbol;
    }

    // 更新压力测试
    updateStressTest() {
        const gridVersion = document.getElementById('gridVersion').value;
        const startPrice = parseFloat(document.getElementById('startPrice').value) || 0;
        const gridSize = parseFloat(document.getElementById('gridSize').value) || 0;

        if (!startPrice || !gridSize) {
            return;
        }

        let result = '';

        switch(gridVersion) {
            case '2.1':
                result = this.calculateProfitRetentionStress(startPrice, gridSize);
                break;
            case '1.0':
                result = this.calculateBasicStress(startPrice, gridSize);
                break;
            default:
                result = this.calculateBasicStress(startPrice, gridSize);
        }

        const stressTestElement = document.getElementById('stress-test-result');
        if (stressTestElement) {
            stressTestElement.innerHTML = result;
        }
    }

    // 计算基础版压力测试
    calculateBasicStress(startPrice, gridSize) {
        const gridAmount = parseFloat(document.getElementById('gridAmount').value) || 0;
        const gridCount = parseInt(document.getElementById('gridCount').value) || 0;

        if (!gridAmount || !gridCount) return '<p class="text-muted">请填写完整参数</p>';

        const totalAmount = gridAmount * gridCount;
        const maxDrop = gridCount * gridSize;
        const lowestPrice = startPrice * (1 - maxDrop / 100);

        return this.formatStressTestResult(totalAmount, maxDrop, lowestPrice, '基础版');
    }

    // 计算留利润版压力测试
    calculateProfitRetentionStress(startPrice, gridSize) {
        const gridAmount = parseFloat(document.getElementById('gridAmount').value) || 0;
        const gridCount = parseInt(document.getElementById('gridCount').value) || 0;
        const retentionType = document.getElementById('retentionType').value;

        if (!gridAmount || !gridCount) return '<p class="text-muted">请填写完整参数</p>';

        const totalAmount = gridAmount * gridCount;
        const maxDrop = gridCount * gridSize;
        const lowestPrice = startPrice * (1 - maxDrop / 100);

        const avgProfitRate = gridSize;
        const expectedRetention = retentionType === 'basic' ? avgProfitRate : 
                                 retentionType === 'double' ? avgProfitRate * 2 : avgProfitRate * 3;

        return this.formatStressTestResult(totalAmount, maxDrop, lowestPrice, '留利润版', {
            retentionType: this.getRetentionTypeName(retentionType),
            expectedRetention: expectedRetention.toFixed(2) + '%'
        });
    }

    // 格式化压力测试结果
    formatStressTestResult(totalAmount, maxDrop, lowestPrice, version, extra = {}) {
        const riskLevel = maxDrop > 50 ? '高风险' : maxDrop > 30 ? '中风险' : '低风险';
        const riskClass = maxDrop > 50 ? 'text-danger' : maxDrop > 30 ? 'text-warning' : 'text-success';

        let result = `
            <div class="mb-2">
                <strong class="text-primary">${version} 压力测试结果</strong>
            </div>
            <div class="row text-center">
                <div class="col-6">
                    <small class="text-muted">总资金需求</small>
                    <div class="fw-bold text-primary">¥${totalAmount.toLocaleString()}</div>
                </div>
                <div class="col-6">
                    <small class="text-muted">最大跌幅</small>
                    <div class="fw-bold text-warning">${maxDrop.toFixed(1)}%</div>
                </div>
            </div>
            <div class="row text-center mt-2">
                <div class="col-6">
                    <small class="text-muted">最低价格</small>
                    <div class="fw-bold">${lowestPrice.toFixed(3)}</div>
                </div>
                <div class="col-6">
                    <small class="text-muted">风险评估</small>
                    <div class="fw-bold ${riskClass}">${riskLevel}</div>
                </div>
            </div>
        `;

        if (Object.keys(extra).length > 0) {
            result += '<div class="mt-2 pt-2 border-top">';
            Object.entries(extra).forEach(([key, value]) => {
                const label = key === 'retentionType' ? '留存策略' : 
                             key === 'expectedRetention' ? '预期留存' : key;
                result += `<div class="d-flex justify-content-between"><small>${label}:</small><small class="fw-bold">${value}</small></div>`;
            });
            result += '</div>';
        }

        return result;
    }

    // 获取留利润策略名称
    getRetentionTypeName(type) {
        const names = {
            'basic': '基础留利润',
            'double': '留双份利润',
            'triple': '留三份利润'
        };
        return names[type] || type;
    }

    // 更新显示
    updateDisplay() {
        this.updateGridDisplay();
        this.updateTradesDisplay();
        this.updateStatsDisplay();
        this.updateSystemInfo();
    }

    // 更新系统信息
    updateSystemInfo() {
        // 更新云端备份状态
        const cloudStatus = document.getElementById('cloud-status');
        if (cloudStatus) {
            cloudStatus.textContent = this.checkCloudBackupStatus();
            cloudStatus.className = 'fw-bold ' + (localStorage.getItem('githubToken') ? 'text-success' : 'text-warning');
        }

        // 更新系统统计
        const gridCountElement = document.getElementById('grid-count');
        const tradeRecordsElement = document.getElementById('trade-records');
        const dataSizeElement = document.getElementById('data-size');

        if (gridCountElement) {
            gridCountElement.textContent = this.grids.length;
        }
        if (tradeRecordsElement) {
            tradeRecordsElement.textContent = this.trades.length;
        }
        if (dataSizeElement) {
            const dataSize = JSON.stringify({grids: this.grids, trades: this.trades}).length;
            dataSizeElement.textContent = (dataSize / 1024).toFixed(1) + ' KB';
        }
    }

    // 更新网格显示
    updateGridDisplay() {
        const container = document.getElementById('grid-display');
        
        if (!this.currentGrid) {
            container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="bi bi-grid-3x3 display-1"></i>
                    <p>暂无网格，请创建新的网格交易</p>
                </div>
            `;
            return;
        }

        const grid = this.currentGrid;
        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h6>${grid.symbolName} (${grid.symbol}) - ${grid.version}版</h6>
                    ${grid.version === '2.1' ? `<small class="text-info">留利润策略: ${this.getRetentionTypeName(grid.retentionType)}</small>` : ''}
                </div>
                <small class="text-muted">创建时间: ${new Date(grid.createdAt).toLocaleDateString()}</small>
            </div>
            
            ${grid.version === '2.1' && grid.retainedShares > 0 ? 
                `<div class="alert alert-success">
                    <i class="bi bi-piggy-bank"></i> 累计留存份额: ${grid.retainedShares.toFixed(0)}份
                </div>` : ''
            }
            
            <div class="row">
        `;

        grid.grids.forEach(item => {
            const statusClass = item.status === 'waiting' ? 'status-waiting' : 
                               item.status === 'bought' ? 'status-bought' : 'status-sold';
            const statusText = item.status === 'waiting' ? '待买入' : 
                              item.status === 'bought' ? '已买入' : '已卖出';
            
            html += `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card grid-item ${statusClass}">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="mb-0">网格 ${item.index}</h6>
                                <span class="badge bg-secondary">${statusText}</span>
                            </div>
                            <div class="row text-center">
                                <div class="col-6">
                                    <small class="text-muted">买入价</small>
                                    <div class="fw-bold">${item.buyPrice.toFixed(3)}</div>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">卖出价</small>
                                    <div class="fw-bold">${item.sellPrice.toFixed(3)}</div>
                                </div>
                            </div>
                            <div class="text-center mt-2">
                                <small class="text-muted">金额: ¥${item.amount.toLocaleString()}</small>
                                ${item.profit !== 0 ? `<div class="profit-${item.profit > 0 ? 'positive' : 'negative'}">收益: ¥${item.profit.toFixed(2)}</div>` : ''}
                                ${item.retainedShares ? `<div class="text-success"><small>留存: ${item.retainedShares.toFixed(0)}份</small></div>` : ''}
                            </div>
                            <div class="mt-2">
                                ${item.status === 'waiting' ? 
                                    `<button class="btn btn-sm btn-success w-100" onclick="app.executeTrade(${item.index}, 'buy')">
                                        <i class="bi bi-cart-plus"></i> 买入
                                    </button>` : 
                                  item.status === 'bought' ? 
                                    `<button class="btn btn-sm btn-primary w-100" onclick="app.executeTrade(${item.index}, 'sell')">
                                        <i class="bi bi-cart-dash"></i> 卖出
                                    </button>` : 
                                    `<small class="text-muted">已完成交易</small>`
                                }
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    // 执行交易
    executeTrade(gridIndex, type) {
        if (!this.currentGrid) return;

        const gridItem = this.currentGrid.grids.find(g => g.index === gridIndex);
        if (!gridItem) return;

        const now = new Date().toISOString();
        const price = type === 'buy' ? gridItem.buyPrice : gridItem.sellPrice;

        if (type === 'buy' && gridItem.status === 'waiting') {
            this.executeBuy(gridItem, gridIndex, price, now);
        } else if (type === 'sell' && gridItem.status === 'bought') {
            this.executeSell(gridItem, gridIndex, price, now);
        }

        this.saveData();
        this.updateDisplay();
    }

    // 执行买入
    executeBuy(gridItem, gridIndex, price, now) {
        gridItem.status = 'bought';
        gridItem.buyDate = now;
        
        this.trades.push({
            id: Date.now(),
            date: now,
            type: 'buy',
            symbol: this.currentGrid.symbol,
            symbolName: this.currentGrid.symbolName,
            price: price,
            amount: gridItem.amount,
            quantity: gridItem.amount / price,
            gridIndex: gridIndex,
            gridVersion: this.currentGrid.version,
            profit: 0
        });

        this.showNotification('买入成功', `${this.currentGrid.symbolName} 网格${gridIndex} 买入成功`);
    }

    // 执行卖出
    executeSell(gridItem, gridIndex, price, now) {
        gridItem.status = 'sold';
        gridItem.sellDate = now;
        
        const profit = gridItem.amount * (price - gridItem.buyPrice) / gridItem.buyPrice;
        gridItem.profit = profit;

        // 2.1版本留利润逻辑
        if (this.currentGrid.version === '2.1') {
            this.handleProfitRetention(gridItem, profit, price);
        }

        this.trades.push({
            id: Date.now(),
            date: now,
            type: 'sell',
            symbol: this.currentGrid.symbol,
            symbolName: this.currentGrid.symbolName,
            price: price,
            amount: gridItem.amount,
            quantity: gridItem.amount / price,
            gridIndex: gridIndex,
            gridVersion: this.currentGrid.version,
            profit: profit,
            retainedShares: gridItem.retainedShares || 0
        });

        this.showNotification('卖出成功', `${this.currentGrid.symbolName} 网格${gridIndex} 卖出成功，收益¥${profit.toFixed(2)}`);
    }

    // 处理留利润逻辑
    handleProfitRetention(gridItem, profit, sellPrice) {
        const grid = this.currentGrid;
        const retentionType = grid.retentionType;
        
        let retainedShares = 0;
        
        switch(retentionType) {
            case 'basic':
                retainedShares = profit / sellPrice;
                break;
            case 'double':
                retainedShares = (profit * 2) / sellPrice;
                break;
            case 'triple':
                retainedShares = (profit * 3) / sellPrice;
                break;
        }
        
        gridItem.retainedShares = retainedShares;
        grid.retainedShares = (grid.retainedShares || 0) + retainedShares;
        
        this.showNotification('留利润成功', `留存${retainedShares.toFixed(0)}份，累计留存${grid.retainedShares.toFixed(0)}份`);
    }

    // 更新交易记录显示
    updateTradesDisplay() {
        const tbody = document.getElementById('trades-table');
        
        if (this.trades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">暂无交易记录</td></tr>';
            return;
        }

        const html = this.trades.slice().reverse().map(trade => `
            <tr>
                <td>${new Date(trade.date).toLocaleDateString()}</td>
                <td>
                    <span class="badge ${trade.type === 'buy' ? 'bg-success' : 'bg-primary'}">
                        ${trade.type === 'buy' ? '买入' : '卖出'}
                    </span>
                </td>
                <td>${trade.symbolName}</td>
                <td>${trade.price.toFixed(3)}</td>
                <td>${trade.quantity.toFixed(0)}</td>
                <td>¥${trade.amount.toLocaleString()}</td>
                <td class="${trade.profit > 0 ? 'profit-positive' : trade.profit < 0 ? 'profit-negative' : ''}">
                    ${trade.profit !== 0 ? `¥${trade.profit.toFixed(2)}` : '-'}
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;
    }

    // 更新统计显示
    updateStatsDisplay() {
        const totalProfit = this.trades.reduce((sum, trade) => sum + trade.profit, 0);
        const totalInvestment = this.trades.filter(t => t.type === 'buy').reduce((sum, trade) => sum + trade.amount, 0);
        const profitRate = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;
        const tradeCount = this.trades.length;
        const winTrades = this.trades.filter(t => t.profit > 0).length;
        const winRate = tradeCount > 0 ? (winTrades / tradeCount) * 100 : 0;

        document.getElementById('total-profit').textContent = `¥${totalProfit.toFixed(2)}`;
        document.getElementById('profit-rate').textContent = `${profitRate.toFixed(2)}%`;
        document.getElementById('trade-count').textContent = tradeCount;
        document.getElementById('win-rate').textContent = `${winRate.toFixed(2)}%`;
    }

    // 显示通知
    showNotification(title, body) {
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/favicon.ico'
            });
        }
    }

    // 请求通知权限
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    // 数据持久化
    saveData() {
        const data = {
            grids: this.grids,
            trades: this.trades,
            currentGridId: this.currentGrid ? this.currentGrid.id : null
        };
        localStorage.setItem('gridTradingData', JSON.stringify(data));
    }

    loadData() {
        const data = localStorage.getItem('gridTradingData');
        if (data) {
            const parsed = JSON.parse(data);
            this.grids = parsed.grids || [];
            this.trades = parsed.trades || [];
            if (parsed.currentGridId) {
                this.currentGrid = this.grids.find(g => g.id === parsed.currentGridId);
            }
        }
    }

    // 导出数据
    exportData() {
        const data = {
            grids: this.grids,
            trades: this.trades,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grid-trading-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // 备份数据到云端
    async backupToCloud() {
        const token = localStorage.getItem('githubToken');
        if (!token) {
            this.showCloudSetup();
            return;
        }

        try {
            const data = {
                grids: this.grids,
                trades: this.trades,
                settings: this.getSettings(),
                backupDate: new Date().toISOString(),
                version: '2.0'
            };

            const gistData = {
                description: `网格交易系统数据备份 - ${new Date().toLocaleDateString()}`,
                public: false,
                files: {
                    'grid-trading-backup.json': {
                        content: JSON.stringify(data, null, 2)
                    }
                }
            };

            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gistData)
            });

            if (response.ok) {
                const result = await response.json();
                localStorage.setItem('cloudBackupId', result.id);
                localStorage.setItem('lastCloudBackup', new Date().toISOString());
                alert('数据已成功备份到云端！\n备份ID: ' + result.id.substring(0, 8) + '...');
            } else {
                throw new Error('备份失败: ' + response.statusText);
            }
        } catch (error) {
            console.error('云端备份失败:', error);
            alert('云端备份失败: ' + error.message);
        }
    }

    // 从云端恢复数据
    async restoreFromCloud() {
        const token = localStorage.getItem('githubToken');
        if (!token) {
            this.showCloudSetup();
            return;
        }

        const backupId = localStorage.getItem('cloudBackupId');
        if (!backupId) {
            alert('未找到云端备份记录，请先进行云端备份');
            return;
        }

        try {
            const response = await fetch(`https://api.github.com/gists/${backupId}`, {
                headers: {
                    'Authorization': `token ${token}`
                }
            });

            if (response.ok) {
                const gist = await response.json();
                const backupContent = gist.files['grid-trading-backup.json'].content;
                const data = JSON.parse(backupContent);

                if (confirm(`确定要恢复云端数据吗？\n备份时间: ${new Date(data.backupDate).toLocaleString()}\n当前本地数据将被覆盖！`)) {
                    this.grids = data.grids || [];
                    this.trades = data.trades || [];
                    this.currentGrid = this.grids[0] || null;

                    // 恢复设置
                    if (data.settings) {
                        this.restoreSettings(data.settings);
                    }

                    this.saveData();
                    this.updateDisplay();
                    alert('云端数据恢复成功！');
                }
            } else {
                throw new Error('获取云端数据失败: ' + response.statusText);
            }
        } catch (error) {
            console.error('云端恢复失败:', error);
            alert('云端恢复失败: ' + error.message);
        }
    }

    // 显示云端设置界面
    showCloudSetup() {
        const modal = document.createElement('div');
        modal.className = 'modal fade show';
        modal.style.display = 'block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="bi bi-cloud-upload"></i> 云端存储设置
                        </h5>
                        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <h6><i class="bi bi-info-circle"></i> 使用GitHub Gist存储数据</h6>
                            <p class="mb-0">我们使用GitHub Gist来安全存储您的数据，完全免费且隐私保护。</p>
                        </div>

                        <div class="mb-3">
                            <label class="form-label">GitHub Personal Access Token</label>
                            <input type="password" class="form-control" id="githubToken"
                                   placeholder="请输入您的GitHub Token">
                            <div class="form-text">
                                <a href="https://github.com/settings/tokens/new?scopes=gist&description=Grid%20Trading%20System"
                                   target="_blank" class="text-decoration-none">
                                    <i class="bi bi-box-arrow-up-right"></i> 点击这里生成Token
                                </a>
                                （只需要gist权限）
                            </div>
                        </div>

                        <div class="mb-3">
                            <h6>设置步骤：</h6>
                            <ol class="small">
                                <li>点击上方链接访问GitHub</li>
                                <li>输入Token名称：Grid Trading System</li>
                                <li>确保勾选"gist"权限</li>
                                <li>点击"Generate token"</li>
                                <li>复制生成的Token并粘贴到上方输入框</li>
                            </ol>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                            取消
                        </button>
                        <button type="button" class="btn btn-primary" onclick="app.saveCloudSettings()">
                            保存设置
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // 保存云端设置
    saveCloudSettings() {
        const token = document.getElementById('githubToken').value.trim();
        if (!token) {
            alert('请输入GitHub Token');
            return;
        }

        localStorage.setItem('githubToken', token);
        document.querySelector('.modal').remove();
        alert('云端设置保存成功！现在可以使用云端备份功能了。');
    }

    // 获取用户设置
    getSettings() {
        return {
            notifications: document.getElementById('enableNotifications')?.checked || false,
            lastGridVersion: this.currentGrid?.version || '2.1',
            preferences: {
                defaultGridSize: 5,
                defaultGridAmount: 10000,
                defaultGridCount: 10
            }
        };
    }

    // 恢复用户设置
    restoreSettings(settings) {
        if (settings.notifications !== undefined) {
            const notificationCheckbox = document.getElementById('enableNotifications');
            if (notificationCheckbox) {
                notificationCheckbox.checked = settings.notifications;
            }
        }
    }

    // 本地文件备份（保留原功能）
    backupData() {
        this.exportData();
        alert('数据备份成功！');
    }

    // 本地文件恢复（保留原功能）
    restoreData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        this.grids = data.grids || [];
                        this.trades = data.trades || [];
                        this.currentGrid = this.grids[0] || null;
                        this.saveData();
                        this.updateDisplay();
                        alert('数据恢复成功！');
                    } catch (error) {
                        alert('数据格式错误！');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    // 检查云端备份状态
    checkCloudBackupStatus() {
        const lastBackup = localStorage.getItem('lastCloudBackup');
        const token = localStorage.getItem('githubToken');

        if (!token) {
            return '未设置云端存储';
        }

        if (!lastBackup) {
            return '未进行云端备份';
        }

        const backupDate = new Date(lastBackup);
        const now = new Date();
        const daysDiff = Math.floor((now - backupDate) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
            return '今天已备份';
        } else if (daysDiff === 1) {
            return '昨天备份';
        } else {
            return `${daysDiff}天前备份`;
        }
    }

    // 清空数据
    clearData() {
        if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
            this.grids = [];
            this.trades = [];
            this.currentGrid = null;
            this.saveData();
            this.updateDisplay();
            alert('数据已清空！');
        }
    }
}

// 页面切换
function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    document.getElementById(sectionName + '-section').style.display = 'block';
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
}

// 刷新价格（模拟功能）
function refreshPrices() {
    alert('价格刷新功能需要接入实时数据API');
}

// 备份数据
function backupData() {
    app.backupData();
}

// 恢复数据
function restoreData() {
    app.restoreData();
}

// 清空数据
function clearData() {
    app.clearData();
}

// 处理品种选择变化
function handleSymbolChange() {
    const symbol = document.getElementById('symbol').value;
    const customInput = document.getElementById('customSymbol');

    if (symbol === 'custom') {
        customInput.style.display = 'block';
        customInput.focus();
        customInput.setAttribute('required', 'required');
    } else {
        customInput.style.display = 'none';
        customInput.value = '';
        customInput.removeAttribute('required');
    }
}

// 显示自定义输入框
function showCustomInput() {
    document.getElementById('symbol').value = 'custom';
    handleSymbolChange();
}

// 初始化应用
const app = new GridTradingApp();
