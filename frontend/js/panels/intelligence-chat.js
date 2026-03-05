// Speak to Binance — AI Market Assistant with live Binance data
// Interactive chat interface with token sidebar, 14 commands, and natural language routing
import { BasePanel } from '../components/base-panel.js';

// Chat translations per language
const chatLang = {
  en: { title: 'Speak to Binance', sub: 'AI Market Intelligence powered by real time Binance data', desc: 'I analyze <b>6 Binance exclusive data streams</b> that no other exchange provides: institutional positioning, retail sentiment, taker pressure, funding rates, open interest, and microstructure health.', analysis: 'Analysis', strategy: 'Strategy', intelligence: 'Intelligence', education: 'Education', markets: 'Markets', filter: 'Filter tokens...', placeholder: 'Ask anything... analyze BTC, portfolio, dca ETH, learn funding', ask: 'Ask', analyzing: 'Analyzing live Binance data...', price: 'Price', change24h: '24h Change', high_low: '24h High/Low', volume: 'Volume', smart_money: 'Smart Money Analysis', top_traders: 'Top Traders', retail: 'Retail', divergence_label: 'Divergence', factors: 'Factors Aligned', regime: 'Regime', derivatives: 'Derivatives', funding_rate: 'Funding Rate', taker_ratio: 'Taker Ratio', oi_change: 'OI Change', oi_value: 'OI Value', microstructure: 'Microstructure', spread: 'Spread', sf_gap: 'Spot/Futures Gap', anomalies: 'Active Anomalies', verdict: 'AI Verdict', deep_analysis: 'Deep Analysis', overview: 'Overview', market_bias: 'Market Bias', avg_score: 'Avg Smart Score', bullish: 'Bullish', bearish: 'Bearish', strongest: 'Strongest Signals', high_risk: 'High Risk', safe: 'Safe', no_risk: 'No high risk assets detected. Market structure is healthy.', top_opps: 'Top Opportunities', no_opps: 'No strong signals right now. Market is indecisive. Wait for factor alignment.', funding_overview: 'Funding Rate Overview', funding_sort: 'Sorted by Funding Rate (lowest = contrarian bullish)', health_title: 'Microstructure Health', portfolio_title: 'AI Portfolio Builder', allocation: 'Recommended Allocation', portfolio_metrics: 'Portfolio Metrics', risk_level: 'Risk Level', diversification: 'Diversification', avg_health: 'Avg Health', bull_assets: 'Bullish Assets', dca_title: 'DCA Analysis', dca_range: '24h Range', range_pos: 'Range Position', dca_factors: 'DCA Factors', dca_strategy: 'Strategy', whale_title: 'Whale Activity Scanner', whale_sub: 'Highest Institutional Activity', oi_surges: 'OI Surges (Position Building)', momentum_title: 'Momentum Scanner', bull_momentum: 'Strongest Bullish', bear_momentum: 'Strongest Bearish', div_title: 'Smart vs Retail Divergence', div_sub: 'Biggest Disagreements', div_desc: 'When top traders and retail disagree, top traders historically win. Large gaps = high conviction.', academy: 'Crypto Academy', lessons: 'Available Lessons', lesson_desc: 'Each lesson explains the concept and shows you how to apply it with live data.', all_commands: 'All Commands', summary_cmd: 'Market Summary', risk_check: 'Risk Check', strong_buy: 'STRONG BUY ZONE', acceptable: 'ACCEPTABLE ENTRY', wait: 'WAIT IF POSSIBLE', avoid: 'AVOID FOR NOW', buyers_dom: 'buyers dominant', sellers_dom: 'sellers dominant', balanced: 'balanced', near_low: 'near low', near_high: 'near high', mid_range: 'mid range', long: 'Long', short: 'Short', risk_assessment: 'Risk Assessment', no_data: 'Could not find data for', smart_score: 'Smart Score', signal_label: 'Signal', error_retry: 'Please try again.', try_symbols: 'Try: BTC, ETH, SOL, BNB...', type_any: 'Or just type any symbol name for analysis. You can also click any token in the sidebar.', health: 'Health', dca_buy_verdict: 'Multiple factors align for a favorable entry. Consider adding to your position.', dca_ok_verdict: 'Conditions are acceptable but not ideal. A smaller position with reserves for dips would be prudent.', dca_wait_verdict: 'Warning signals active. Use smaller than normal size if you must enter. Better entries may come soon.', dca_avoid_verdict: 'Conditions unfavorable. Smart money, funding, and/or microstructure suggest elevated risk. Wait for improvement.', compare_verdict: 'shows stronger institutional interest with a Smart Score of', v_strong: 'Strong', v_moderate: 'Moderate', v_no_signal: 'No clear signal: factors are mixed. Wait for better alignment before positioning.', v_not_high: 'Not high conviction yet.', v_smart_lead: 'Top traders are more bullish than retail. Smart money is leading.', v_neg_fund: 'Negative funding means longs are getting paid to hold.', v_rising_oi: 'Rising OI confirms new positions with conviction.', v_bear_lead: 'Top traders are more bearish than retail. Potential squeeze incoming.', v_crowded: 'Elevated funding suggests crowded longs.', v_exec_good: 'Execution environment is excellent', v_exec_poor: 'Caution: poor microstructure. Use smaller size.', v_anomalies: 'anomaly signals active. Elevated market activity.', btn_analyze: 'Analyze BTC', btn_dca: 'DCA Bitcoin', cat_analysis: 'analyze, compare, summary', cat_strategy: 'portfolio, dca, momentum', cat_intelligence: 'whale, divergence, risk', cat_education: 'learn funding, learn oi' },
  tr: { title: 'Binance ile Konus', sub: 'Gercek zamanli Binance verisiyle yapay zeka piyasa analizi', desc: '<b>6 Binance\'a ozel veri akisi</b> ile analiz yapiyorum: kurumsal pozisyonlama, perakende duyarlilik, alici baskisi, fonlama oranlari, acik pozisyon ve mikroyapi sagligi.', analysis: 'Analiz', strategy: 'Strateji', intelligence: 'Istihbarat', education: 'Egitim', markets: 'Piyasalar', filter: 'Token ara...', placeholder: 'Herhangi bir sey sorun... analyze BTC, portfolio, dca ETH, learn funding', ask: 'Sor', analyzing: 'Canli Binance verileri analiz ediliyor...', price: 'Fiyat', change24h: '24s Degisim', high_low: '24s Yuksek/Dusuk', volume: 'Hacim', smart_money: 'Akilli Para Analizi', top_traders: 'Ust Traderlar', retail: 'Perakende', divergence_label: 'Sapma', factors: 'Faktor Uyumu', regime: 'Rejim', derivatives: 'Turevler', funding_rate: 'Fonlama Orani', taker_ratio: 'Alici Orani', oi_change: 'OI Degisim', oi_value: 'OI Deger', microstructure: 'Mikroyapi', spread: 'Spread', sf_gap: 'Spot/Vadeli Farki', anomalies: 'Aktif Anomaliler', verdict: 'Yapay Zeka Yorumu', deep_analysis: 'Derin Analiz', overview: 'Genel Bakis', market_bias: 'Piyasa Yonelimi', avg_score: 'Ort. Akilli Para Skoru', bullish: 'Yukselis', bearish: 'Dusus', strongest: 'En Guclu Sinyaller', high_risk: 'Yuksek Risk', safe: 'Guvenli', no_risk: 'Yuksek riskli varlik tespit edilmedi. Piyasa yapisi saglikli.', top_opps: 'En Iyi Firsatlar', no_opps: 'Su an guclu sinyal yok. Piyasa kararsiz. Faktor uyumu bekleyin.', funding_overview: 'Fonlama Orani Tablosu', funding_sort: 'Fonlama oranina gore sirali (en dusuk = kontrarian yukselis)', health_title: 'Mikroyapi Sagligi', portfolio_title: 'Yapay Zeka Portfoy Olusturucu', allocation: 'Onerilen Dagilim', portfolio_metrics: 'Portfoy Metrikleri', risk_level: 'Risk Seviyesi', diversification: 'Cesitlendirme', avg_health: 'Ort. Saglik', bull_assets: 'Yukselis Varliklari', dca_title: 'DCA Analizi', dca_range: '24s Aralik', range_pos: 'Aralik Pozisyonu', dca_factors: 'DCA Faktorleri', dca_strategy: 'Strateji', whale_title: 'Balina Aktivite Tarayicisi', whale_sub: 'En Yuksek Kurumsal Aktivite', oi_surges: 'OI Artislari (Pozisyon Olusturma)', momentum_title: 'Momentum Tarayici', bull_momentum: 'En Guclu Yukselis', bear_momentum: 'En Guclu Dusus', div_title: 'Akilli Para vs Perakende Sapmasi', div_sub: 'En Buyuk Uyumsuzluklar', div_desc: 'Ust traderlar ve perakende ayrildiginda, ust traderlar tarihsel olarak kazanir. Buyuk farklar = yuksek guven.', academy: 'Kripto Akademi', lessons: 'Mevcut Dersler', lesson_desc: 'Her ders konuyu aciklar ve canli verilerle nasil uygulanacagini gosterir.', all_commands: 'Tum Komutlar', summary_cmd: 'Piyasa Ozeti', risk_check: 'Risk Kontrolu', strong_buy: 'GUCLU ALIS BOLGESI', acceptable: 'KABUL EDILEBILIR GIRIS', wait: 'MUMKUNSE BEKLEYIN', avoid: 'SIMDILIK KAÇININ', buyers_dom: 'alicilar baskin', sellers_dom: 'saticilar baskin', balanced: 'dengeli', near_low: 'dusuge yakin', near_high: 'yuksege yakin', mid_range: 'orta aralik', long: 'Uzun', short: 'Kisa', risk_assessment: 'Risk Degerlendirmesi', no_data: 'Veri bulunamadi', smart_score: 'Akilli Skor', signal_label: 'Sinyal', error_retry: 'Tekrar deneyin.', try_symbols: 'Deneyin: BTC, ETH, SOL, BNB...', type_any: 'Herhangi bir sembol yazarak analiz yapabilirsiniz. Yan panelden token secebilirsiniz.', health: 'Saglik', dca_buy_verdict: 'Birden fazla faktor olumlu girise isaret ediyor. Pozisyon eklemeyi dusunebilirsiniz.', dca_ok_verdict: 'Kosullar kabul edilebilir ama ideal degil. Dususler icin rezerv birakarak kucuk pozisyon almak akillica olur.', dca_wait_verdict: 'Uyari sinyalleri aktif. Giris yapmak zorundaysaniz normalden kucuk boy kullanin.', dca_avoid_verdict: 'Kosullar olumsuz. Akilli para, fonlama ve/veya mikroyapi yuksek risk isaret ediyor. Iyilesme bekleyin.', compare_verdict: 'daha guclu kurumsal ilgi gosteriyor, Akilli Skor:', v_strong: 'Guclu', v_moderate: 'Orta', v_no_signal: 'Net sinyal yok: faktorler karisik. Pozisyon almadan once daha iyi uyum bekleyin.', v_not_high: 'Henuz yuksek guvenilirlik yok.', v_smart_lead: 'Ust traderlar perakendeden daha yukselisci. Akilli para liderlik ediyor.', v_neg_fund: 'Negatif fonlama long pozisyonlarin odeme aldigini gosteriyor.', v_rising_oi: 'Artan OI yeni pozisyonlarin guvenle acildigini dogruluyor.', v_bear_lead: 'Ust traderlar perakendeden daha dususcu. Potansiyel sikistirma riski.', v_crowded: 'Yuksek fonlama kalabalik long pozisyon oldugunu gosteriyor.', v_exec_good: 'Islem ortami mukemmel', v_exec_poor: 'Dikkat: zayif mikroyapi. Daha kucuk boyut kullanin.', v_anomalies: 'anomali sinyali aktif. Yuksek piyasa aktivitesi.', btn_analyze: 'BTC Analiz Et', btn_dca: 'DCA Bitcoin', cat_analysis: 'analiz, karsilastir, ozet', cat_strategy: 'portfoy, dca, momentum', cat_intelligence: 'balina, sapma, risk', cat_education: 'ogren fonlama, ogren oi' },
  zh: { title: '币安智能对话', sub: '由实时币安数据驱动的AI市场情报', desc: '我分析<b>6种币安独有数据流</b>：机构持仓、散户情绪、主动买卖、资金费率、未平仓合约和微观结构健康度。', analysis: '分析', strategy: '策略', intelligence: '情报', education: '教育', markets: '市场', filter: '搜索代币...', placeholder: '输入任何问题... analyze BTC, portfolio, dca ETH, learn funding', ask: '发送', analyzing: '正在分析实时币安数据...', price: '价格', change24h: '24小时变化', high_low: '24小时最高/最低', volume: '成交量', smart_money: '聪明钱分析', top_traders: '顶级交易者', retail: '散户', divergence_label: '背离', factors: '因子对齐', regime: '市场状态', derivatives: '衍生品', funding_rate: '资金费率', taker_ratio: '主动买卖比', oi_change: 'OI变化', oi_value: 'OI总值', microstructure: '微观结构', spread: '价差', sf_gap: '现货/期货差', anomalies: '活跃异常', verdict: 'AI判断', deep_analysis: '深度分析', overview: '概览', market_bias: '市场偏向', avg_score: '平均聪明钱评分', bullish: '看涨', bearish: '看跌', strongest: '最强信号', high_risk: '高风险', safe: '安全', no_risk: '未检测到高风险资产。市场结构健康。', top_opps: '最佳机会', no_opps: '目前没有强信号。市场犹豫不决。等待因子对齐。', funding_overview: '资金费率概览', funding_sort: '按资金费率排序（最低=逆向看涨）', health_title: '微观结构健康度', portfolio_title: 'AI投资组合', allocation: '推荐配置', portfolio_metrics: '组合指标', risk_level: '风险等级', diversification: '分散度', avg_health: '平均健康度', bull_assets: '看涨资产', dca_title: 'DCA分析', dca_range: '24小时区间', range_pos: '区间位置', dca_factors: 'DCA因子', dca_strategy: '策略', whale_title: '巨鲸活动扫描', whale_sub: '最高机构活动', oi_surges: 'OI激增（建仓中）', momentum_title: '动量扫描', bull_momentum: '最强看涨', bear_momentum: '最强看跌', div_title: '聪明钱 vs 散户背离', div_sub: '最大分歧', div_desc: '当顶级交易者与散户意见不同时，顶级交易者历史上胜率更高。差距越大=信念越强。', academy: '加密学院', lessons: '可用课程', lesson_desc: '每节课解释概念并展示如何结合实时数据应用。', all_commands: '所有命令', summary_cmd: '市场概要', risk_check: '风险检查', strong_buy: '强力买入区', acceptable: '可接受入场', wait: '建议等待', avoid: '暂时回避', buyers_dom: '买方主导', sellers_dom: '卖方主导', balanced: '均衡', near_low: '接近低点', near_high: '接近高点', mid_range: '区间中部', long: '做多', short: '做空', risk_assessment: '风险评估', no_data: '未找到数据', smart_score: '聪明钱评分', signal_label: '信号', error_retry: '请重试。', try_symbols: '试试: BTC, ETH, SOL, BNB...', type_any: '输入任何代币名称进行分析，也可以点击侧边栏中的代币。', health: '健康度', dca_buy_verdict: '多个因子指向有利入场。可以考虑加仓。', dca_ok_verdict: '条件可接受但不理想。建议小仓位并保留资金等待回调。', dca_wait_verdict: '警告信号活跃。如必须入场请使用小仓位。更好的入场点可能即将出现。', dca_avoid_verdict: '条件不利。聪明钱、资金费率和/或微观结构显示风险升高。等待改善。', compare_verdict: '展现更强的机构兴趣，聪明钱评分', v_strong: '强烈', v_moderate: '中等', v_no_signal: '无明确信号：因子混合。等待更好的对齐再建仓。', v_not_high: '尚未达到高确信度。', v_smart_lead: '顶级交易者比散户更看涨。聪明钱在引领。', v_neg_fund: '负资金费率意味着多头持有获得支付。', v_rising_oi: 'OI上升确认新仓位有信念支撑。', v_bear_lead: '顶级交易者比散户更看跌。潜在逼空风险。', v_crowded: '高资金费率暗示多头拥挤。', v_exec_good: '执行环境优秀', v_exec_poor: '注意：微观结构较差。使用更小仓位。', v_anomalies: '异常信号活跃。市场活动升高。', btn_analyze: '分析 BTC', btn_dca: 'DCA Bitcoin', cat_analysis: '分析, 对比, 概要', cat_strategy: '组合, 定投, 动量', cat_intelligence: '巨鲸, 背离, 风险', cat_education: '学习资金费率, 学习OI' },
};
// Fallback getter
function _cl(key) {
  const lang = window.mefaiI18n?.getLang?.() || 'en';
  return chatLang[lang]?.[key] || chatLang.en[key] || key;
}

export class IntelligenceChatPanel extends BasePanel {
  static skill = 'Skill 47';
  static defaultTitle = 'Speak to Binance';

  constructor() {
    super();
    this._refreshRate = 0;
    this._messages = [];
    this._isThinking = false;
    this._tokenList = [];
    this._tokenFilter = '';
    this._allSymbols = [
      'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT',
      'ADAUSDT','AVAXUSDT','LINKUSDT','LTCUSDT','APTUSDT','ARBUSDT',
      'OPUSDT','SUIUSDT','INJUSDT','NEARUSDT','MATICUSDT','DOTUSDT',
      'AAVEUSDT','UNIUSDT',
    ];
    this._addWelcome();
  }

  _addWelcome() {
    this._messages.push({
      role: 'ai',
      text: `<div class="ic-welcome">
<div class="ic-welcome-title">${_cl('title')}</div>
<div class="ic-welcome-sub">${_cl('sub')}</div>
<div class="ic-welcome-desc">${_cl('desc')}</div>
<div class="ic-welcome-cats">
<div class="ic-cat"><div class="ic-cat-title">${_cl('analysis')}</div><div class="ic-cat-items">${_cl('cat_analysis')}</div></div>
<div class="ic-cat"><div class="ic-cat-title">${_cl('strategy')}</div><div class="ic-cat-items">${_cl('cat_strategy')}</div></div>
<div class="ic-cat"><div class="ic-cat-title">${_cl('intelligence')}</div><div class="ic-cat-items">${_cl('cat_intelligence')}</div></div>
<div class="ic-cat"><div class="ic-cat-title">${_cl('education')}</div><div class="ic-cat-items">${_cl('cat_education')}</div></div>
</div>
</div>`,
      actions: [
        { label: _cl('btn_analyze'), cmd: 'analyze BTC' },
        { label: _cl('summary_cmd'), cmd: 'summary' },
        { label: _cl('portfolio_title'), cmd: 'portfolio' },
        { label: _cl('btn_dca'), cmd: 'dca BTC' },
        { label: _cl('whale_title'), cmd: 'whale' },
        { label: _cl('academy'), cmd: 'learn' },
      ],
    });
  }

  async fetchData() {
    try {
      const tickers = await window.mefaiApi.futures.ticker24hr();
      if (Array.isArray(tickers)) {
        this._tokenList = tickers
          .filter(t => t.symbol.endsWith('USDT'))
          .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
          .slice(0, 150);
      }
    } catch (e) { /* silent */ }
    return null;
  }

  // ─── Data fetchers ───
  async _fetchSymbolData(symbols) {
    const syms = symbols.map(s => s.toUpperCase().endsWith('USDT') ? s.toUpperCase() : s.toUpperCase() + 'USDT');
    const [tickers, premium, fBook, sBook, ...perSym] = await Promise.all([
      window.mefaiApi.futures.ticker24hr(),
      window.mefaiApi.futures.premiumIndex(),
      window.mefaiApi.futures.bookTicker(),
      window.mefaiApi.spot.bookTicker(),
      ...syms.flatMap(sym => [
        window.mefaiApi.futures.longShortRatio(sym, '1h', 1),
        window.mefaiApi.futures.topLongShortAccount(sym, '1h', 1),
        window.mefaiApi.futures.topLongShortPosition(sym, '1h', 1),
        window.mefaiApi.futures.takerBuySellRatio(sym, '1h'),
        window.mefaiApi.futures.openInterestHist(sym, '1h', 3),
      ]),
    ]);
    const tkMap = {}, pmMap = {}, fbMap = {}, sbMap = {};
    if (Array.isArray(tickers)) tickers.forEach(t => { tkMap[t.symbol] = t; });
    if (Array.isArray(premium)) premium.forEach(p => { pmMap[p.symbol] = p; });
    if (Array.isArray(fBook)) fBook.forEach(b => { fbMap[b.symbol] = b; });
    if (Array.isArray(sBook)) sBook.forEach(b => { sbMap[b.symbol] = b; });
    return syms.map((sym, i) => this._computeMetrics(sym, {
      ticker: tkMap[sym] || {}, premium: pmMap[sym] || {},
      fBook: fbMap[sym] || {}, sBook: sbMap[sym] || {},
      retailLS: perSym[i * 5], topAccount: perSym[i * 5 + 1],
      topPosition: perSym[i * 5 + 2], taker: perSym[i * 5 + 3],
      oiHist: perSym[i * 5 + 4],
    }));
  }

  _computeMetrics(sym, item) {
    const name = sym.replace('USDT', '');
    const tk = item.ticker;
    const pm = item.premium;
    const fb = item.fBook;
    const sb = item.sBook;
    const retailRaw = Array.isArray(item.retailLS) ? item.retailLS[0] : item.retailLS;
    const topAcctRaw = Array.isArray(item.topAccount) ? item.topAccount[0] : item.topAccount;
    const topPosRaw = Array.isArray(item.topPosition) ? item.topPosition[0] : item.topPosition;
    const takerRaw = Array.isArray(item.taker) ? item.taker[0] : item.taker;
    const oiArr = Array.isArray(item.oiHist) ? item.oiHist : [];
    const retailRatio = parseFloat(retailRaw?.longShortRatio || 1);
    const topAcctRatio = parseFloat(topAcctRaw?.longShortRatio || 1);
    const topPosRatio = parseFloat(topPosRaw?.longShortRatio || 1);
    const takerRatio = parseFloat(takerRaw?.buySellRatio || 1);
    const fundingRate = parseFloat(pm.lastFundingRate || 0);
    const fundingBps = fundingRate * 10000;
    const change24h = parseFloat(tk.priceChangePercent || 0);
    const price = parseFloat(tk.lastPrice || 0);
    const vwap = parseFloat(tk.weightedAvgPrice || price);
    const volume = parseFloat(tk.quoteVolume || 0);
    const high = parseFloat(tk.highPrice || 0);
    const low = parseFloat(tk.lowPrice || 0);
    let oiChange = 0, oiValue = 0;
    if (oiArr.length >= 2) {
      const latest = parseFloat(oiArr[oiArr.length - 1]?.sumOpenInterestValue || 0);
      const prev = parseFloat(oiArr[0]?.sumOpenInterestValue || 0);
      oiValue = latest;
      if (prev > 0) oiChange = ((latest - prev) / prev) * 100;
    }
    const fBid = parseFloat(fb.bidPrice || 0), fAsk = parseFloat(fb.askPrice || 0);
    const fMid = (fBid + fAsk) / 2;
    const spreadBps = fMid > 0 ? ((fAsk - fBid) / fMid) * 10000 : 0;
    const sBid = parseFloat(sb.bidPrice || 0), sAsk = parseFloat(sb.askPrice || 0);
    const sMid = (sBid + sAsk) / 2;
    const sfGap = sMid > 0 ? ((fMid - sMid) / sMid) * 10000 : 0;
    const factors = {
      smartDir: Math.max(-1, Math.min(1, (topPosRatio - 1) * 5)),
      retailContra: Math.max(-1, Math.min(1, (1 - retailRatio) * 5)),
      divergence: Math.max(-1, Math.min(1, (topPosRatio - retailRatio) * 3)),
      takerPressure: Math.max(-1, Math.min(1, (takerRatio - 1) * 5)),
      fundingSignal: Math.max(-1, Math.min(1, -fundingBps * 0.1)),
      oiMomentum: Math.max(-1, Math.min(1, oiChange * 0.3)),
    };
    const vals = Object.values(factors);
    const avgSignal = vals.reduce((s, v) => s + v, 0) / vals.length;
    const agreeing = vals.filter(v => Math.sign(v) === Math.sign(avgSignal) && Math.abs(v) > 0.1).length;
    const confluence = agreeing / 6;
    const smartScore = Math.min(100, Math.round(Math.abs(avgSignal) * confluence * 250));
    const direction = avgSignal > 0.08 ? 'LONG' : avgSignal < -0.08 ? 'SHORT' : 'NEUTRAL';
    let healthScore = 100;
    healthScore -= Math.min(30, spreadBps * 3);
    healthScore -= Math.min(20, Math.abs(sfGap) * 0.5);
    healthScore -= Math.min(20, Math.abs(fundingBps) * 1.5);
    healthScore -= Math.min(15, Math.abs(takerRatio - 1) * 30);
    let oiVol = 0;
    if (oiArr.length >= 2) {
      const ov = oiArr.map(o => parseFloat(o?.sumOpenInterestValue || 0));
      for (let j = 1; j < ov.length; j++) if (ov[j-1] > 0) oiVol += Math.abs((ov[j] - ov[j-1]) / ov[j-1]) * 100;
      oiVol /= (ov.length - 1);
    }
    healthScore -= Math.min(15, oiVol * 3);
    healthScore = Math.max(0, Math.round(healthScore));
    const grade = healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : healthScore >= 20 ? 'D' : 'F';
    let regime = 'NEUTRAL';
    if (smartScore >= 60 && direction === 'LONG' && oiChange > 0) regime = 'ACCUMULATION';
    else if (smartScore >= 60 && direction === 'SHORT' && oiChange > 0) regime = 'DISTRIBUTION';
    else if (smartScore >= 40 && Math.abs(oiChange) < 1) regime = 'POSITIONING';
    const anomalies = [];
    const vwapDev = vwap > 0 ? ((price - vwap) / vwap) * 100 : 0;
    if (Math.abs(vwapDev) > 1.5) anomalies.push(`VWAP ${vwapDev > 0 ? '+' : ''}${vwapDev.toFixed(1)}%`);
    if (Math.abs(change24h) > 8) anomalies.push(`24h ${change24h > 0 ? '+' : ''}${change24h.toFixed(1)}%`);
    if (Math.abs(fundingBps) > 10) anomalies.push(`Funding ${fundingBps > 0 ? '+' : ''}${fundingBps.toFixed(1)}bps`);
    if (Math.abs(oiChange) > 3) anomalies.push(`OI ${oiChange > 0 ? '+' : ''}${oiChange.toFixed(1)}%`);
    if (takerRatio > 1.4 || takerRatio < 0.7) anomalies.push(`Taker ${takerRatio.toFixed(2)}`);
    return {
      symbol: sym, name, price, change24h, volume, high, low, vwap, vwapDev,
      retailRatio, topAcctRatio, topPosRatio, takerRatio, fundingBps, oiChange, oiValue,
      spreadBps, sfGap, smartScore, direction, healthScore, grade, regime, agreeing,
      factors, anomalies,
    };
  }

  // ─── Command router ───
  async _handleCommand(input) {
    const raw = input.trim();
    if (!raw) return;
    this._messages.push({ role: 'user', text: raw });
    this._isThinking = true;
    this._render();

    try {
      const lower = raw.toLowerCase();
      let response;

      if (lower.startsWith('analyze ') || lower.startsWith('analyse ') || lower.startsWith('analiz ')) {
        response = await this._cmdAnalyze(raw.split(/\s+/)[1]);
      } else if (lower.startsWith('compare ') || lower.startsWith('vs ')) {
        const parts = raw.split(/\s+/).slice(1);
        response = await this._cmdCompare(parts[0], parts[1]);
      } else if (lower === 'summary' || lower === 'market' || lower === 'overview') {
        response = await this._cmdSummary();
      } else if (lower === 'risk' || lower === 'risk check') {
        response = await this._cmdRisk();
      } else if (lower === 'opportunities' || lower === 'best' || lower === 'top') {
        response = await this._cmdOpportunities();
      } else if (lower === 'funding') {
        response = await this._cmdFunding();
      } else if (lower === 'health' || lower === 'microstructure') {
        response = await this._cmdHealth();
      } else if (lower.startsWith('portfolio') || lower.startsWith('sepet')) {
        response = await this._cmdPortfolio();
      } else if (lower.startsWith('dca ')) {
        response = await this._cmdDca(raw.split(/\s+/)[1]);
      } else if (lower === 'whale' || lower === 'whales' || lower === 'balina') {
        response = await this._cmdWhale();
      } else if (lower === 'momentum') {
        response = await this._cmdMomentum();
      } else if (lower === 'divergence' || lower === 'div') {
        response = await this._cmdDivergence();
      } else if (lower.startsWith('learn') || lower.startsWith('academy') || lower.startsWith('edu')) {
        response = this._cmdLearn(raw.split(/\s+/).slice(1).join(' '));
      } else if (lower === 'help') {
        response = this._cmdHelp();
      // Natural language routing
      } else if (lower.includes('what should i buy') || lower.includes('ne almalı') || lower.includes('best setup')) {
        response = await this._cmdOpportunities();
      } else if (lower.includes('teach') || lower.includes('explain') || lower.includes('what is') || lower.includes('nedir')) {
        response = this._cmdLearn(lower.replace(/teach me about|explain|what is|nedir/g, '').trim());
      } else if (lower.includes('portfolio') || lower.includes('allocation')) {
        response = await this._cmdPortfolio();
      } else if (lower.includes('whale') || lower.includes('institutional') || lower.includes('big money')) {
        response = await this._cmdWhale();
      } else if (lower.includes('safe') || lower.includes('danger') || lower.includes('risk')) {
        response = await this._cmdRisk();
      } else {
        const maybeSym = raw.replace(/[^a-zA-Z]/g, '').toUpperCase();
        if (maybeSym.length >= 2 && maybeSym.length <= 10) {
          response = await this._cmdAnalyze(maybeSym);
        } else {
          response = this._cmdHelp();
        }
      }

      this._messages.push(response);
    } catch (e) {
      this._messages.push({ role: 'ai', text: `Error: ${e.message}. ${_cl('error_retry')}` });
    }

    this._isThinking = false;
    this._render();
  }

  // ─── Original Commands ───
  async _cmdAnalyze(sym) {
    const data = await this._fetchSymbolData([sym]);
    const d = data[0];
    if (!d || !d.price) return { role: 'ai', text: `${_cl('no_data')} <b>${sym.toUpperCase()}</b>. ${_cl('try_symbols')}` };

    const scoreColor = d.smartScore >= 60 ? '#0ecb81' : d.smartScore >= 40 ? '#3b82f6' : d.smartScore >= 25 ? '#f0b90b' : '#f6465d';
    const scoreBar = '█'.repeat(Math.round(d.smartScore / 10)) + '░'.repeat(10 - Math.round(d.smartScore / 10));

    let t = `<div class="ic-analysis">`;
    t += `<div class="ic-title">${d.name}/USDT ${_cl('deep_analysis')} <span class="ic-live">LIVE</span></div>`;

    t += `<div class="ic-section"><div class="ic-section-title">${_cl('price')}</div>`;
    t += `<div class="ic-grid">`;
    t += `<span>${_cl('price')}:</span><span><b>$${d.price.toLocaleString()}</b></span>`;
    t += `<span>${_cl('change24h')}:</span><span class="${d.change24h >= 0 ? 'val-up' : 'val-down'}"><b>${d.change24h >= 0 ? '+' : ''}${d.change24h.toFixed(2)}%</b></span>`;
    t += `<span>${_cl('high_low')}:</span><span>$${d.high.toLocaleString()} / $${d.low.toLocaleString()}</span>`;
    t += `<span>VWAP:</span><span>$${d.vwap.toLocaleString()} (${d.vwapDev >= 0 ? '+' : ''}${d.vwapDev.toFixed(2)}%)</span>`;
    t += `<span>${_cl('volume')}:</span><span>$${(d.volume / 1e6).toFixed(1)}M</span>`;
    t += `</div></div>`;

    t += `<div class="ic-section"><div class="ic-section-title">${_cl('smart_money')}</div>`;
    t += `<div class="ic-score"><span style="color:${scoreColor}">${scoreBar} ${d.smartScore}/100</span> <b>${d.direction}</b></div>`;
    t += `<div class="ic-grid">`;
    t += `<span>${_cl('top_traders')}:</span><span>${d.topPosRatio > 1 ? _cl('long') : _cl('short')} (${d.topPosRatio.toFixed(3)})</span>`;
    t += `<span>${_cl('retail')}:</span><span>${d.retailRatio > 1 ? _cl('long') : _cl('short')} (${d.retailRatio.toFixed(3)})</span>`;
    t += `<span>${_cl('divergence_label')}:</span><span>${(d.topPosRatio - d.retailRatio).toFixed(3)} gap</span>`;
    t += `<span>${_cl('factors')}:</span><span>${d.agreeing}/6</span>`;
    t += `<span>${_cl('regime')}:</span><span><b>${d.regime}</b></span>`;
    t += `</div></div>`;

    t += `<div class="ic-section"><div class="ic-section-title">${_cl('derivatives')}</div>`;
    t += `<div class="ic-grid">`;
    t += `<span>${_cl('funding_rate')}:</span><span>${d.fundingBps >= 0 ? '+' : ''}${d.fundingBps.toFixed(2)} bps</span>`;
    t += `<span>${_cl('taker_ratio')}:</span><span>${d.takerRatio.toFixed(3)} (${d.takerRatio > 1.1 ? _cl('buyers_dom') : d.takerRatio < 0.9 ? _cl('sellers_dom') : _cl('balanced')})</span>`;
    t += `<span>${_cl('oi_change')}:</span><span>${d.oiChange >= 0 ? '+' : ''}${d.oiChange.toFixed(2)}%</span>`;
    t += `<span>${_cl('oi_value')}:</span><span>$${(d.oiValue / 1e6).toFixed(0)}M</span>`;
    t += `</div></div>`;

    const hColor = d.healthScore >= 80 ? '#0ecb81' : d.healthScore >= 60 ? '#3b82f6' : d.healthScore >= 40 ? '#f0b90b' : '#f6465d';
    t += `<div class="ic-section"><div class="ic-section-title">${_cl('microstructure')}</div>`;
    t += `<div class="ic-score"><span style="color:${hColor}">Grade ${d.grade} (${d.healthScore}/100)</span></div>`;
    t += `<div class="ic-grid">`;
    t += `<span>${_cl('spread')}:</span><span>${d.spreadBps.toFixed(2)} bps</span>`;
    t += `<span>${_cl('sf_gap')}:</span><span>${d.sfGap.toFixed(1)} bps</span>`;
    t += `</div></div>`;

    if (d.anomalies.length > 0) {
      t += `<div class="ic-section ic-alert"><div class="ic-section-title">${_cl('anomalies')} (${d.anomalies.length}/5)</div>`;
      t += `<div>${d.anomalies.join(' &middot; ')}</div></div>`;
    }

    t += `<div class="ic-section ic-verdict"><div class="ic-section-title">${_cl('verdict')}</div>`;
    t += `<div>${this._generateVerdict(d)}</div></div></div>`;

    return { role: 'ai', text: t, actions: [
      { label: `DCA ${d.name}`, cmd: `dca ${d.name}` },
      { label: _cl('summary_cmd'), cmd: 'summary' },
      { label: _cl('risk_check'), cmd: 'risk' },
    ]};
  }

  _generateVerdict(d) {
    const parts = [];
    if (d.smartScore >= 70) {
      parts.push(`<b>${_cl('v_strong')} ${d.direction} signal</b>: ${d.agreeing}/6 ${_cl('factors').toLowerCase()}.`);
      if (d.direction === 'LONG') {
        if (d.topPosRatio > d.retailRatio + 0.2) parts.push(_cl('v_smart_lead'));
        if (d.fundingBps < -2) parts.push(_cl('v_neg_fund'));
        if (d.oiChange > 2) parts.push(_cl('v_rising_oi'));
      } else {
        if (d.topPosRatio < d.retailRatio - 0.2) parts.push(_cl('v_bear_lead'));
        if (d.fundingBps > 5) parts.push(_cl('v_crowded'));
      }
    } else if (d.smartScore >= 40) {
      parts.push(`<b>${_cl('v_moderate')} ${d.direction}</b>: ${d.agreeing}/6 ${_cl('factors').toLowerCase()}. ${_cl('v_not_high')}`);
    } else {
      parts.push(`<b>${_cl('v_no_signal')}</b>`);
    }
    if (d.healthScore >= 80) parts.push(`${_cl('v_exec_good')} (Grade ${d.grade}).`);
    else if (d.healthScore < 40) parts.push(`${_cl('v_exec_poor')} (Grade ${d.grade}).`);
    if (d.anomalies.length >= 3) parts.push(`${d.anomalies.length} ${_cl('v_anomalies')}`);
    return parts.join(' ');
  }

  async _cmdCompare(sym1, sym2) {
    if (!sym1 || !sym2) return { role: 'ai', text: 'Usage: <b>compare BTC ETH</b>' };
    const data = await this._fetchSymbolData([sym1, sym2]);
    const a = data[0], b = data[1];
    if (!a?.price || !b?.price) return { role: 'ai', text: `Could not fetch data for one or both symbols.` };
    const better = a.smartScore > b.smartScore ? a : b;
    const aColor = a.smartScore >= 60 ? '#0ecb81' : a.smartScore >= 40 ? '#3b82f6' : '#f0b90b';
    const bColor = b.smartScore >= 60 ? '#0ecb81' : b.smartScore >= 40 ? '#3b82f6' : '#f0b90b';

    let t = `<div class="ic-analysis"><div class="ic-title">${a.name} vs ${b.name} <span class="ic-live">LIVE</span></div>`;
    t += `<table class="ic-compare"><thead><tr><th></th><th>${a.name}</th><th>${b.name}</th></tr></thead><tbody>`;
    t += `<tr><td>${_cl('price')}</td><td>$${a.price.toLocaleString()}</td><td>$${b.price.toLocaleString()}</td></tr>`;
    t += `<tr><td>${_cl('change24h')}</td><td class="${a.change24h >= 0 ? 'val-up' : 'val-down'}">${a.change24h >= 0 ? '+' : ''}${a.change24h.toFixed(2)}%</td><td class="${b.change24h >= 0 ? 'val-up' : 'val-down'}">${b.change24h >= 0 ? '+' : ''}${b.change24h.toFixed(2)}%</td></tr>`;
    t += `<tr><td>${_cl('smart_score')}</td><td style="color:${aColor}"><b>${a.smartScore}</b></td><td style="color:${bColor}"><b>${b.smartScore}</b></td></tr>`;
    t += `<tr><td>${_cl('signal_label')}</td><td><b>${a.direction}</b></td><td><b>${b.direction}</b></td></tr>`;
    t += `<tr><td>${_cl('top_traders')}</td><td>${a.topPosRatio.toFixed(3)}</td><td>${b.topPosRatio.toFixed(3)}</td></tr>`;
    t += `<tr><td>${_cl('retail')}</td><td>${a.retailRatio.toFixed(3)}</td><td>${b.retailRatio.toFixed(3)}</td></tr>`;
    t += `<tr><td>${_cl('funding_rate')}</td><td>${a.fundingBps.toFixed(1)}bps</td><td>${b.fundingBps.toFixed(1)}bps</td></tr>`;
    t += `<tr><td>${_cl('taker_ratio')}</td><td>${a.takerRatio.toFixed(3)}</td><td>${b.takerRatio.toFixed(3)}</td></tr>`;
    t += `<tr><td>${_cl('oi_change')}</td><td>${a.oiChange >= 0 ? '+' : ''}${a.oiChange.toFixed(2)}%</td><td>${b.oiChange >= 0 ? '+' : ''}${b.oiChange.toFixed(2)}%</td></tr>`;
    t += `<tr><td>${_cl('health')}</td><td>Grade ${a.grade} (${a.healthScore})</td><td>Grade ${b.grade} (${b.healthScore})</td></tr>`;
    t += `</tbody></table>`;
    t += `<div class="ic-section ic-verdict"><div class="ic-section-title">${_cl('verdict')}</div>`;
    t += `<div><b>${better.name}</b> ${_cl('compare_verdict')} ${better.smartScore}/100 (${better.direction}).`;
    if (better.fundingBps < -2) t += ` ${_cl('v_neg_fund')}`;
    if (better.oiChange > 2) t += ` ${_cl('v_rising_oi')}`;
    t += `</div></div></div>`;
    return { role: 'ai', text: t };
  }

  async _cmdSummary() {
    const data = await this._fetchSymbolData(this._allSymbols.slice(0, 12));
    const bullish = data.filter(d => d.direction === 'LONG');
    const bearish = data.filter(d => d.direction === 'SHORT');
    const avgScore = Math.round(data.reduce((s, d) => s + d.smartScore, 0) / data.length);
    const bias = bullish.length > bearish.length + 2 ? 'BULLISH' : bearish.length > bullish.length + 2 ? 'BEARISH' : 'MIXED';

    let t = `<div class="ic-analysis"><div class="ic-title">${_cl('summary_cmd')} <span class="ic-live">LIVE</span></div>`;
    t += `<div class="ic-section"><div class="ic-section-title">${_cl('overview')}</div>`;
    t += `<div class="ic-grid">`;
    t += `<span>${_cl('market_bias')}:</span><span><b>${bias}</b></span>`;
    t += `<span>${_cl('avg_score')}:</span><span>${avgScore}/100</span>`;
    t += `<span>${_cl('bullish')}:</span><span class="val-up">${bullish.length}</span>`;
    t += `<span>${_cl('bearish')}:</span><span class="val-down">${bearish.length}</span>`;
    t += `</div></div>`;

    const sorted = [...data].sort((a, b) => b.smartScore - a.smartScore);
    t += `<div class="ic-section"><div class="ic-section-title">${_cl('strongest')}</div>`;
    for (const d of sorted.slice(0, 6)) {
      const c = d.smartScore >= 60 ? '#0ecb81' : d.smartScore >= 40 ? '#3b82f6' : '#f0b90b';
      t += `<div class="ic-row"><span class="ic-sym">${d.name}</span> <span class="ic-dir ic-dir-${d.direction}">${d.direction}</span> <span style="color:${c};font-weight:700">${d.smartScore}</span> <span class="ic-regime">${d.regime}</span> <span class="${d.change24h >= 0 ? 'val-up' : 'val-down'}">${d.change24h >= 0 ? '+' : ''}${d.change24h.toFixed(1)}%</span></div>`;
    }
    t += `</div></div>`;
    return { role: 'ai', text: t, actions: [
      { label: `Analyze ${sorted[0].name}`, cmd: `analyze ${sorted[0].name}` },
      { label: _cl('risk_check'), cmd: 'risk' },
      { label: _cl('top_opps'), cmd: 'opportunities' },
    ]};
  }

  async _cmdRisk() {
    const data = await this._fetchSymbolData(this._allSymbols.slice(0, 12));
    const risky = data.filter(d => d.healthScore < 50 || d.anomalies.length >= 3).sort((a, b) => a.healthScore - b.healthScore);
    const safe = data.filter(d => d.healthScore >= 80 && d.anomalies.length === 0).sort((a, b) => b.healthScore - a.healthScore);

    let t = `<div class="ic-analysis"><div class="ic-title">${_cl('risk_assessment')} <span class="ic-live">LIVE</span></div>`;
    t += `<div class="ic-section"><div class="ic-section-title">${_cl('high_risk')} (${risky.length})</div>`;
    if (risky.length === 0) t += `<div>${_cl('no_risk')}</div>`;
    for (const d of risky) {
      t += `<div class="ic-row"><span class="ic-sym">${d.name}</span> Grade ${d.grade} (${d.healthScore}/100)`;
      if (d.anomalies.length > 0) t += ` &middot; ${d.anomalies.length} anomalies`;
      t += `</div>`;
    }
    t += `</div>`;
    t += `<div class="ic-section"><div class="ic-section-title">${_cl('safe')} (${safe.length})</div>`;
    for (const d of safe.slice(0, 5)) {
      t += `<div class="ic-row"><span class="ic-sym">${d.name}</span> Grade ${d.grade} (${d.healthScore}/100) &middot; Score ${d.smartScore} ${d.direction}</div>`;
    }
    t += `</div></div>`;
    return { role: 'ai', text: t };
  }

  async _cmdOpportunities() {
    const data = await this._fetchSymbolData(this._allSymbols.slice(0, 12));
    const sorted = [...data].filter(d => d.smartScore >= 40).sort((a, b) => b.smartScore - a.smartScore);
    let t = `<div class="ic-analysis"><div class="ic-title">${_cl('top_opps')} <span class="ic-live">LIVE</span></div>`;
    if (sorted.length === 0) {
      t += `<div class="ic-section">${_cl('no_opps')}</div>`;
    } else {
      for (const d of sorted.slice(0, 5)) {
        const c = d.smartScore >= 60 ? '#0ecb81' : '#3b82f6';
        t += `<div class="ic-section"><div class="ic-section-title" style="color:${c}">${d.name} ${d.direction} (${_cl('smart_score')}: ${d.smartScore}/100)</div>`;
        t += `<div class="ic-grid"><span>${_cl('price')}:</span><span>$${d.price.toLocaleString()} (${d.change24h >= 0 ? '+' : ''}${d.change24h.toFixed(2)}%)</span>`;
        t += `<span>${_cl('factors')}:</span><span>${d.agreeing}/6</span><span>${_cl('regime')}:</span><span>${d.regime}</span><span>${_cl('health')}:</span><span>Grade ${d.grade}</span></div></div>`;
      }
    }
    t += `</div>`;
    return { role: 'ai', text: t, actions: sorted.length > 0 ? [{ label: `Analyze ${sorted[0].name}`, cmd: `analyze ${sorted[0].name}` }] : [] };
  }

  async _cmdFunding() {
    const data = await this._fetchSymbolData(this._allSymbols.slice(0, 12));
    const sorted = [...data].sort((a, b) => a.fundingBps - b.fundingBps);
    let t = `<div class="ic-analysis"><div class="ic-title">${_cl('funding_overview')} <span class="ic-live">LIVE</span></div>`;
    t += `<div class="ic-section"><div class="ic-section-title">${_cl('funding_sort')}</div>`;
    for (const d of sorted) {
      const fc = d.fundingBps < -3 ? '#0ecb81' : d.fundingBps > 5 ? '#f6465d' : 'var(--text-secondary)';
      t += `<div class="ic-row"><span class="ic-sym">${d.name}</span> <span style="color:${fc};font-weight:700">${d.fundingBps >= 0 ? '+' : ''}${d.fundingBps.toFixed(2)}bps</span> <span class="ic-dir ic-dir-${d.direction}">${d.direction}</span> <span class="${d.change24h >= 0 ? 'val-up' : 'val-down'}">${d.change24h >= 0 ? '+' : ''}${d.change24h.toFixed(1)}%</span></div>`;
    }
    t += `</div></div>`;
    return { role: 'ai', text: t };
  }

  async _cmdHealth() {
    const data = await this._fetchSymbolData(this._allSymbols.slice(0, 12));
    const sorted = [...data].sort((a, b) => b.healthScore - a.healthScore);
    let t = `<div class="ic-analysis"><div class="ic-title">${_cl('health_title')} <span class="ic-live">LIVE</span></div>`;
    for (const d of sorted) {
      const hc = d.healthScore >= 80 ? '#0ecb81' : d.healthScore >= 60 ? '#3b82f6' : d.healthScore >= 40 ? '#f0b90b' : '#f6465d';
      t += `<div class="ic-row"><span class="ic-sym">${d.name}</span> <span style="color:${hc};font-weight:700">Grade ${d.grade} (${d.healthScore})</span> <span>Spread: ${d.spreadBps.toFixed(1)}bps</span></div>`;
    }
    t += `</div>`;
    return { role: 'ai', text: t };
  }

  // ─── New Commands ───
  async _cmdPortfolio() {
    const data = await this._fetchSymbolData(this._allSymbols.slice(0, 15));
    const scored = data.map(d => ({
      ...d,
      portfolioScore: d.smartScore * 0.4 + d.healthScore * 0.3 + (100 - Math.min(100, Math.abs(d.change24h) * 5)) * 0.3,
    })).sort((a, b) => b.portfolioScore - a.portfolioScore);
    const selected = scored.slice(0, 6);
    const totalScore = selected.reduce((s, d) => s + d.portfolioScore, 0);
    const allocations = selected.map(d => ({ ...d, weight: Math.round((d.portfolioScore / totalScore) * 100) }));
    const maxWeight = Math.max(...allocations.map(a => a.weight));
    const diversification = Math.round(100 - (maxWeight - 100 / allocations.length) * 2);
    const avgHealth = Math.round(allocations.reduce((s, a) => s + a.healthScore, 0) / allocations.length);
    const riskLevel = avgHealth >= 75 ? 'LOW' : avgHealth >= 50 ? 'MODERATE' : 'HIGH';

    let t = `<div class="ic-analysis"><div class="ic-title">${_cl('portfolio_title')} <span class="ic-live">LIVE</span></div>`;
    t += `<div class="ic-section"><div class="ic-section-title">${_cl('allocation')}</div>`;
    for (const a of allocations) {
      const c = a.direction === 'LONG' ? '#0ecb81' : a.direction === 'SHORT' ? '#f6465d' : 'var(--text-muted)';
      const bar = '█'.repeat(Math.round(a.weight / 5)) + '░'.repeat(20 - Math.round(a.weight / 5));
      t += `<div class="ic-row"><span class="ic-sym">${a.name}</span> <span style="font-family:var(--font-mono);font-size:8px;color:${c}">${bar}</span> <span style="font-weight:700">${a.weight}%</span> <span class="ic-dir ic-dir-${a.direction}">${a.direction}</span></div>`;
    }
    t += '</div>';
    t += `<div class="ic-section"><div class="ic-section-title">${_cl('portfolio_metrics')}</div><div class="ic-grid">`;
    t += `<span>${_cl('risk_level')}:</span><span style="color:${riskLevel === 'LOW' ? '#0ecb81' : riskLevel === 'MODERATE' ? '#f0b90b' : '#f6465d'};font-weight:700">${riskLevel}</span>`;
    t += `<span>${_cl('diversification')}:</span><span>${diversification}/100</span>`;
    t += `<span>${_cl('avg_health')}:</span><span>Grade ${avgHealth >= 80 ? 'A' : avgHealth >= 60 ? 'B' : avgHealth >= 40 ? 'C' : 'D'} (${avgHealth})</span>`;
    t += `<span>${_cl('avg_score')}:</span><span>${Math.round(allocations.reduce((s, a) => s + a.smartScore, 0) / allocations.length)}/100</span>`;
    t += `<span>${_cl('bull_assets')}:</span><span>${allocations.filter(a => a.direction === 'LONG').length}/${allocations.length}</span>`;
    t += '</div></div></div>';
    return { role: 'ai', text: t, actions: [
      { label: `Analyze ${allocations[0].name}`, cmd: `analyze ${allocations[0].name}` },
      { label: `DCA ${allocations[0].name}`, cmd: `dca ${allocations[0].name}` },
      { label: _cl('risk_check'), cmd: 'risk' },
    ]};
  }

  async _cmdDca(sym) {
    if (!sym) return { role: 'ai', text: 'Usage: <b>dca BTC</b>' };
    const data = await this._fetchSymbolData([sym]);
    const d = data[0];
    if (!d?.price) return { role: 'ai', text: `Could not find data for <b>${sym.toUpperCase()}</b>.` };

    const rangePos = d.high > d.low ? ((d.price - d.low) / (d.high - d.low)) * 100 : 50;
    let dcaScore = 40;
    const reasons = [];

    if (rangePos < 30) { dcaScore += 20; reasons.push({ good: true, text: 'Price near 24h low (bottom 30% of range)' }); }
    else if (rangePos < 50) { dcaScore += 10; reasons.push({ good: true, text: 'Price below 24h midpoint' }); }
    else if (rangePos > 80) { dcaScore -= 10; reasons.push({ good: false, text: 'Price near 24h high (top 20%)' }); }

    if (d.fundingBps < -3) { dcaScore += 20; reasons.push({ good: true, text: `Negative funding (${d.fundingBps.toFixed(1)}bps) favors buyers` }); }
    else if (d.fundingBps > 5) { dcaScore -= 10; reasons.push({ good: false, text: `High funding (+${d.fundingBps.toFixed(1)}bps) suggests crowded longs` }); }

    if (d.direction === 'LONG' && d.smartScore >= 50) { dcaScore += 20; reasons.push({ good: true, text: `Smart money LONG (score ${d.smartScore})` }); }
    else if (d.direction === 'SHORT') { dcaScore -= 15; reasons.push({ good: false, text: 'Smart money SHORT. Consider waiting' }); }

    if (d.healthScore >= 60) { dcaScore += 10; reasons.push({ good: true, text: `Healthy microstructure (Grade ${d.grade})` }); }
    else { dcaScore -= 10; reasons.push({ good: false, text: `Poor microstructure (Grade ${d.grade})` }); }

    if (d.oiChange > 1) { dcaScore += 10; reasons.push({ good: true, text: `OI growing (+${d.oiChange.toFixed(1)}%) conviction building` }); }
    else if (d.oiChange < -3) { dcaScore -= 5; reasons.push({ good: false, text: 'OI declining. Positions closing' }); }

    dcaScore = Math.max(0, Math.min(100, dcaScore));
    const timing = dcaScore >= 70 ? _cl('strong_buy') : dcaScore >= 50 ? _cl('acceptable') : dcaScore >= 30 ? _cl('wait') : _cl('avoid');
    const tc = dcaScore >= 70 ? '#0ecb81' : dcaScore >= 50 ? '#3b82f6' : dcaScore >= 30 ? '#f0b90b' : '#f6465d';

    let t = `<div class="ic-analysis"><div class="ic-title">${d.name} ${_cl('dca_title')} <span class="ic-live">LIVE</span></div>`;
    t += `<div class="ic-section"><div class="ic-section-title" style="color:${tc}">${timing} (${_cl('smart_score')}: ${dcaScore}/100)</div>`;
    t += `<div class="ic-grid"><span>${_cl('price')}:</span><span>$${d.price.toLocaleString()}</span>`;
    t += `<span>${_cl('dca_range')}:</span><span>$${d.low.toLocaleString()} / $${d.high.toLocaleString()}</span>`;
    t += `<span>${_cl('range_pos')}:</span><span>${rangePos.toFixed(0)}% (${rangePos < 30 ? _cl('near_low') : rangePos > 70 ? _cl('near_high') : _cl('mid_range')})</span>`;
    t += `</div></div>`;

    t += `<div class="ic-section"><div class="ic-section-title">${_cl('dca_factors')}</div>`;
    for (const r of reasons) {
      t += `<div class="ic-row"><span style="color:${r.good ? '#0ecb81' : '#f6465d'};font-weight:700">${r.good ? '+' : '-'}</span> <span>${r.text}</span></div>`;
    }
    t += '</div>';

    t += `<div class="ic-section ic-verdict"><div class="ic-section-title">${_cl('dca_strategy')}</div>`;
    if (dcaScore >= 70) t += `<div>${_cl('dca_buy_verdict')}</div>`;
    else if (dcaScore >= 50) t += `<div>${_cl('dca_ok_verdict')}</div>`;
    else if (dcaScore >= 30) t += `<div>${_cl('dca_wait_verdict')}</div>`;
    else t += `<div>${_cl('dca_avoid_verdict')}</div>`;
    t += '</div></div>';

    return { role: 'ai', text: t, actions: [
      { label: `${_cl('deep_analysis')} ${d.name}`, cmd: `analyze ${d.name}` },
      { label: _cl('portfolio_title'), cmd: 'portfolio' },
    ]};
  }

  async _cmdWhale() {
    const data = await this._fetchSymbolData(this._allSymbols.slice(0, 15));
    const whaleActivity = data.map(d => ({
      ...d,
      whaleScore: Math.abs(d.oiChange) * 3 + Math.abs(d.takerRatio - 1) * 50 + Math.abs(d.topPosRatio - d.retailRatio) * 20,
    })).sort((a, b) => b.whaleScore - a.whaleScore);

    let t = `<div class="ic-analysis"><div class="ic-title">${_cl('whale_title')} <span class="ic-live">LIVE</span></div>`;
    t += `<div class="ic-section"><div class="ic-section-title">${_cl('whale_sub')}</div>`;
    for (const d of whaleActivity.slice(0, 8)) {
      const signals = [];
      if (Math.abs(d.oiChange) > 2) signals.push(`OI ${d.oiChange > 0 ? '+' : ''}${d.oiChange.toFixed(1)}%`);
      if (d.takerRatio > 1.15 || d.takerRatio < 0.85) signals.push(`Taker ${d.takerRatio.toFixed(2)}`);
      if (Math.abs(d.topPosRatio - d.retailRatio) > 0.3) signals.push(`Div ${(d.topPosRatio - d.retailRatio).toFixed(2)}`);
      if (Math.abs(d.fundingBps) > 5) signals.push(`Fund ${d.fundingBps > 0 ? '+' : ''}${d.fundingBps.toFixed(1)}bps`);
      const c = d.direction === 'LONG' ? '#0ecb81' : d.direction === 'SHORT' ? '#f6465d' : 'var(--text-muted)';
      t += `<div class="ic-row"><span class="ic-sym">${d.name}</span> <span class="ic-dir ic-dir-${d.direction}">${d.direction}</span> <span style="color:${c};font-weight:700">${d.smartScore}</span> <span style="font-size:8px;color:var(--text-muted)">${signals.join(' &middot; ')}</span></div>`;
    }
    t += '</div>';

    const oiSurges = data.filter(d => Math.abs(d.oiChange) > 2).sort((a, b) => Math.abs(b.oiChange) - Math.abs(a.oiChange));
    if (oiSurges.length > 0) {
      t += `<div class="ic-section"><div class="ic-section-title">${_cl('oi_surges')}</div>`;
      for (const d of oiSurges) {
        const c = d.oiChange > 0 ? '#0ecb81' : '#f6465d';
        t += `<div class="ic-row"><span class="ic-sym">${d.name}</span> <span style="color:${c};font-weight:700">${d.oiChange > 0 ? '+' : ''}${d.oiChange.toFixed(1)}%</span> <span>$${(d.oiValue / 1e6).toFixed(0)}M OI</span></div>`;
      }
      t += '</div>';
    }
    t += '</div>';
    return { role: 'ai', text: t, actions: whaleActivity.length > 0 ? [
      { label: `Analyze ${whaleActivity[0].name}`, cmd: `analyze ${whaleActivity[0].name}` },
      { label: 'Divergence', cmd: 'divergence' },
    ] : [] };
  }

  async _cmdMomentum() {
    const data = await this._fetchSymbolData(this._allSymbols.slice(0, 15));
    const ranked = data.map(d => ({
      ...d,
      momentumScore: d.change24h * 2 + (d.takerRatio - 1) * 100 + d.oiChange * 3 + (d.direction === 'LONG' ? 10 : d.direction === 'SHORT' ? -10 : 0),
    })).sort((a, b) => b.momentumScore - a.momentumScore);

    let t = `<div class="ic-analysis"><div class="ic-title">${_cl('momentum_title')} <span class="ic-live">LIVE</span></div>`;
    t += `<div class="ic-section"><div class="ic-section-title">${_cl('bull_momentum')}</div>`;
    for (const d of ranked.slice(0, 5)) {
      t += `<div class="ic-row"><span class="ic-sym">${d.name}</span> <span class="${d.change24h >= 0 ? 'val-up' : 'val-down'}">${d.change24h >= 0 ? '+' : ''}${d.change24h.toFixed(1)}%</span> <span>Taker ${d.takerRatio.toFixed(2)}</span> <span>OI ${d.oiChange >= 0 ? '+' : ''}${d.oiChange.toFixed(1)}%</span> <span class="ic-dir ic-dir-${d.direction}">${d.direction}</span></div>`;
    }
    t += '</div>';
    t += `<div class="ic-section"><div class="ic-section-title">${_cl('bear_momentum')}</div>`;
    for (const d of ranked.slice(-5).reverse()) {
      t += `<div class="ic-row"><span class="ic-sym">${d.name}</span> <span class="${d.change24h >= 0 ? 'val-up' : 'val-down'}">${d.change24h >= 0 ? '+' : ''}${d.change24h.toFixed(1)}%</span> <span>Taker ${d.takerRatio.toFixed(2)}</span> <span>OI ${d.oiChange >= 0 ? '+' : ''}${d.oiChange.toFixed(1)}%</span> <span class="ic-dir ic-dir-${d.direction}">${d.direction}</span></div>`;
    }
    t += '</div></div>';
    return { role: 'ai', text: t, actions: [
      { label: `Analyze ${ranked[0].name}`, cmd: `analyze ${ranked[0].name}` },
      { label: _cl('top_opps'), cmd: 'opportunities' },
    ]};
  }

  async _cmdDivergence() {
    const data = await this._fetchSymbolData(this._allSymbols.slice(0, 15));
    const divergent = data.map(d => ({
      ...d, divGap: d.topPosRatio - d.retailRatio, divMagnitude: Math.abs(d.topPosRatio - d.retailRatio),
    })).sort((a, b) => b.divMagnitude - a.divMagnitude);

    let t = `<div class="ic-analysis"><div class="ic-title">${_cl('div_title')} <span class="ic-live">LIVE</span></div>`;
    t += `<div class="ic-section"><div class="ic-section-title">${_cl('div_sub')}</div>`;
    t += `<div style="font-size:9px;color:var(--text-muted);margin-bottom:6px">${_cl('div_desc')}</div>`;
    for (const d of divergent.slice(0, 8)) {
      const smartSide = d.topPosRatio > 1 ? 'LONG' : 'SHORT';
      const retailSide = d.retailRatio > 1 ? 'LONG' : 'SHORT';
      const agree = smartSide === retailSide;
      const c = agree ? 'var(--text-muted)' : d.divGap > 0 ? '#0ecb81' : '#f6465d';
      t += `<div class="ic-row"><span class="ic-sym">${d.name}</span>`;
      t += `<span style="font-size:8px">Smart: <b style="color:${d.topPosRatio > 1 ? '#0ecb81' : '#f6465d'}">${d.topPosRatio.toFixed(3)}</b></span>`;
      t += `<span style="font-size:8px">Retail: <b style="color:${d.retailRatio > 1 ? '#0ecb81' : '#f6465d'}">${d.retailRatio.toFixed(3)}</b></span>`;
      t += `<span style="font-size:8px;font-weight:700;color:${c}">Gap: ${d.divGap > 0 ? '+' : ''}${d.divGap.toFixed(3)}</span>`;
      if (!agree) t += `<span style="font-size:7px;background:${c}22;color:${c};padding:1px 4px;border-radius:2px">DIVERGENCE</span>`;
      t += `</div>`;
    }
    t += '</div></div>';
    return { role: 'ai', text: t, actions: divergent.length > 0 ? [
      { label: `Analyze ${divergent[0].name}`, cmd: `analyze ${divergent[0].name}` },
      { label: _cl('whale_title'), cmd: 'whale' },
    ] : [] };
  }

  _cmdLearn(topic) {
    const topics = {
      'funding': { title: 'Understanding Funding Rates', content: `<b>What is a Funding Rate?</b><br>In perpetual futures, funding is a periodic payment between longs and shorts to keep the futures price anchored to spot.<br><br><b>How it works:</b><br>Positive funding: Longs pay shorts (market is overleveraged long)<br>Negative funding: Shorts pay longs (market is overleveraged short)<br>Payments occur every 8 hours on Binance<br><br><b>Trading Edge:</b><br>Extreme positive funding (>10bps) = Contrarian SHORT signal<br>Extreme negative funding (<-10bps) = Contrarian LONG signal<br>When funding is extremely negative and smart money is LONG, you're getting PAID to hold the winning side.<br><br>Try: <b>funding</b> to see current rates across all assets.` },
      'smartmoney': { title: 'Smart Money vs Retail', content: `<b>What is Smart Money?</b><br>Binance publishes three exclusive positioning ratios:<br><br><b>1. Top Trader Position Ratio</b> (Binance exclusive)<br>Positions of the top 20% by margin balance. This is "smart money."<br><br><b>2. Top Trader Account Ratio</b><br>Account level data of the same top 20%.<br><br><b>3. Global Account Ratio</b><br>All accounts on Binance. This is "retail."<br><br><b>The Edge:</b> When smart money disagrees with retail, smart money wins ~65% of the time historically. No other exchange publishes this data.<br><br>Try: <b>divergence</b> to see current smart vs retail gaps.` },
      'oi': { title: 'Open Interest Explained', content: `<b>What is Open Interest?</b><br>OI = total outstanding futures contracts. Unlike volume, OI tells you about EXISTING positions.<br><br><b>Reading OI Changes:</b><br>Rising OI + Rising Price = New longs entering (bullish confirmation)<br>Rising OI + Falling Price = New shorts entering (bearish confirmation)<br>Falling OI + Rising Price = Shorts closing (short squeeze)<br>Falling OI + Falling Price = Longs closing (liquidation cascade)<br><br><b>OI Spikes:</b> A sudden >5% increase means large positions are being built. Combined with smart money direction, this is high conviction.<br><br>Try: <b>whale</b> to see which assets have the biggest OI surges.` },
      'taker': { title: 'Taker Buy/Sell Ratio', content: `<b>What is the Taker Ratio?</b><br>Every trade has a maker (limit order) and a taker (market order). The taker is the aggressive side: they want execution NOW.<br><br><b>Reading the Ratio:</b><br>Ratio > 1.0 = More aggressive buying (bullish pressure)<br>Ratio < 1.0 = More aggressive selling (bearish pressure)<br>Ratio = 1.0 = Balanced<br><br><b>Extreme Readings:</b><br>Ratio > 1.3 = Very strong buy pressure (often precedes rally)<br>Ratio < 0.7 = Very strong sell pressure (often precedes drop)<br><br>This is a Binance exclusive data stream. No other exchange publishes this.<br><br>Try: <b>momentum</b> to see taker ratios across all assets.` },
      'dca': { title: 'Dollar Cost Averaging', content: `<b>What is DCA?</b><br>Buying a fixed dollar amount of an asset at regular intervals, regardless of price. This reduces volatility impact.<br><br><b>Smart DCA Timing:</b><br>While pure DCA ignores price, you can optimize entries:<br><br>1. <b>Range Position</b>: Buy more when price is in the lower 30% of its daily range<br>2. <b>Funding Rates</b>: Negative funding = market pessimism = better entry<br>3. <b>Smart Money</b>: If top traders are long, your DCA has institutional backing<br>4. <b>Health Grade</b>: Grade A/B markets have better execution<br><br>DCA works best for assets you believe in long term. Use it for BTC, ETH, BNB. Not for speculative altcoins.<br><br>Try: <b>dca BTC</b> to analyze current DCA timing for Bitcoin.` },
      'risk': { title: 'Risk Management', content: `<b>Core Principles:</b><br><br>1. <b>Position Sizing</b>: Never risk more than 2-5% of portfolio on a single trade<br>2. <b>Correlation Risk</b>: Most altcoins move with BTC. Your "diversified" portfolio may not be diversified<br>3. <b>Funding Drag</b>: Positive funding erodes long positions over time<br>4. <b>Liquidity Risk</b>: Low health grade means wider spreads and worse fills<br>5. <b>Leverage</b>: Higher leverage = faster liquidation. 3-5x is the sweet spot<br><br><b>Red Flags:</b><br>OI spiking while price drops (liquidation cascade incoming)<br>Extreme positive funding (crowded longs about to get squeezed)<br>Health Grade D or F (poor execution environment)<br>Smart money SHORT while you're long<br><br>Try: <b>risk</b> to scan for current red flags.` },
      'microstructure': { title: 'Market Microstructure', content: `<b>What is Microstructure?</b><br>The "plumbing" of the market. How orders are matched, how prices form, and trading environment quality.<br><br><b>5 Key Metrics:</b><br><br>1. <b>Bid Ask Spread</b>: Cost of immediate execution. <1bps = excellent, >5bps = poor<br>2. <b>Spot Futures Basis</b>: Gap between spot and futures. Large gaps = stress<br>3. <b>Funding Deviation</b>: Far from 0 = directional pressure<br>4. <b>Taker Balance</b>: Close to 1.0 = healthy. Far from 1.0 = one sided<br>5. <b>OI Stability</b>: Rapid changes = volatile. Stable = calm<br><br><b>Health Grades:</b><br>Grade A (80+): Excellent for any trade<br>Grade B (60+): Good for most trades<br>Grade C (40+): Caution with large orders<br>Grade D/F (<40): Avoid or reduce size<br><br>Try: <b>health</b> to check current grades.` },
      'liquidation': { title: 'Liquidation Mechanics', content: `<b>How Liquidation Works:</b><br>When your margin falls below maintenance level, the exchange force closes your position.<br><br><b>Cascade Effect:</b><br>1. Forced selling drives price further down<br>2. More liquidations trigger at lower levels<br>3. This cascading effect causes sudden, violent moves<br><br><b>Detecting Risk:</b><br>High OI + extreme funding = crowded trade ready to unwind<br>OI suddenly dropping + price moving fast = liquidations happening NOW<br>Smart money positioning opposite to retail = potential squeeze<br><br><b>Protection:</b><br>Use stop losses. Keep leverage under 5x. Watch OI for crowding signals. If health grade drops below C, reduce exposure immediately.<br><br>Try: <b>risk</b> to check for liquidation risk.` },
    };

    const key = topic.toLowerCase().replace(/\s+/g, '');
    const matched = topics[key];
    if (matched) {
      return {
        role: 'ai',
        text: `<div class="ic-analysis"><div class="ic-title">${matched.title}</div><div class="ic-section ic-learn">${matched.content}</div></div>`,
        actions: Object.keys(topics).filter(k => k !== key).slice(0, 3).map(k => ({ label: `Learn: ${topics[k].title.split(' ').slice(0, 2).join(' ')}`, cmd: `learn ${k}` })),
      };
    }

    let t = `<div class="ic-analysis"><div class="ic-title">${_cl('academy')}</div>`;
    t += `<div class="ic-section"><div class="ic-section-title">${_cl('lessons')}</div>`;
    t += `<div style="font-size:9px;color:var(--text-muted);margin-bottom:6px">${_cl('lesson_desc')}</div>`;
    for (const [k, val] of Object.entries(topics)) {
      t += `<div class="ic-row"><span class="ic-sym" style="min-width:90px">${k}</span> <span>${val.title}</span></div>`;
    }
    t += '</div></div>';
    return { role: 'ai', text: t, actions: Object.keys(topics).slice(0, 4).map(k => ({ label: topics[k].title.split(' ').slice(0, 2).join(' '), cmd: `learn ${k}` })) };
  }

  _cmdHelp() {
    return {
      role: 'ai',
      text: `<div class="ic-analysis"><div class="ic-title">${_cl('all_commands')}</div>
<div class="ic-section"><div class="ic-section-title">${_cl('analysis')}</div><div class="ic-grid">
<span><b>analyze BTC</b></span><span>Full asset analysis with all metrics</span>
<span><b>compare ETH SOL</b></span><span>Side by side comparison</span>
<span><b>summary</b></span><span>${_cl('summary_cmd')}</span>
</div></div>
<div class="ic-section"><div class="ic-section-title">${_cl('strategy')}</div><div class="ic-grid">
<span><b>portfolio</b></span><span>AI portfolio builder with risk scoring</span>
<span><b>dca BTC</b></span><span>DCA timing analysis for any asset</span>
<span><b>momentum</b></span><span>Momentum scanner across all assets</span>
</div></div>
<div class="ic-section"><div class="ic-section-title">${_cl('intelligence')}</div><div class="ic-grid">
<span><b>whale</b></span><span>Whale and institutional activity</span>
<span><b>divergence</b></span><span>Smart money vs retail disagreements</span>
<span><b>risk</b></span><span>Risk assessment and red flags</span>
<span><b>opportunities</b></span><span>Best setups by Smart Score</span>
<span><b>funding</b></span><span>Funding rate overview</span>
<span><b>health</b></span><span>Microstructure quality check</span>
</div></div>
<div class="ic-section"><div class="ic-section-title">${_cl('education')}</div><div class="ic-grid">
<span><b>learn funding</b></span><span>How funding rates work</span>
<span><b>learn smartmoney</b></span><span>Smart money vs retail</span>
<span><b>learn oi</b></span><span>Open interest explained</span>
<span><b>learn dca</b></span><span>DCA strategy guide</span>
</div></div>
<div class="ic-section">${_cl('type_any')}</div></div>`,
      actions: [
        { label: 'Analyze BTC', cmd: 'analyze BTC' },
        { label: _cl('summary_cmd'), cmd: 'summary' },
        { label: _cl('portfolio_title'), cmd: 'portfolio' },
        { label: _cl('academy'), cmd: 'learn' },
      ],
    };
  }

  // ─── Render ───
  _render() {
    const body = this.querySelector('.panel-body');
    if (!body) return;
    body.innerHTML = this.renderContent(null);
    this._bindEvents(body);
  }

  renderContent() {
    let h = '<style scoped>';
    // Layout
    h += '.ic-layout{display:flex;height:100%;overflow:hidden}';
    h += '.ic-sidebar{width:220px;min-width:220px;border-right:1px solid var(--border-color);display:flex;flex-direction:column;background:var(--bg-primary)}';
    h += '.ic-sidebar-header{padding:8px 10px;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--border-color)}';
    h += '.ic-filter{width:100%;background:var(--bg-secondary);border:none;border-bottom:1px solid var(--border-color);padding:6px 10px;font-size:10px;color:var(--text-primary);font-family:var(--font-mono);outline:none;box-sizing:border-box}';
    h += '.ic-filter:focus{background:var(--bg-primary)}';
    h += '.ic-filter::placeholder{color:var(--text-muted)}';
    h += '.ic-token-list{flex:1;overflow-y:auto;overflow-x:hidden}';
    h += '.ic-token{display:flex;align-items:center;justify-content:space-between;padding:4px 10px;font-size:9px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.02);transition:background 0.1s}';
    h += '.ic-token:hover{background:var(--bg-secondary)}';
    h += '.ic-token-name{font-weight:700;color:var(--text-primary);min-width:50px}';
    h += '.ic-token-price{color:var(--text-secondary);font-family:var(--font-mono);font-size:8px}';
    h += '.ic-token-change{font-weight:600;font-size:8px;min-width:45px;text-align:right}';

    // Chat
    h += '.ic-main{flex:1;display:flex;flex-direction:column;min-width:0}';
    h += '.ic-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px}';
    h += '.ic-msg{max-width:95%;border-radius:10px;padding:10px 14px;font-size:11px;line-height:1.6;word-wrap:break-word}';
    h += '.ic-msg-user{align-self:flex-end;background:linear-gradient(135deg,#3b82f622,#3b82f611);color:#93c5fd;border-bottom-right-radius:3px;font-weight:600;border:1px solid #3b82f633}';
    h += '.ic-msg-ai{align-self:flex-start;background:var(--bg-secondary);color:var(--text-secondary);border-bottom-left-radius:3px;border:1px solid var(--border-color)}';
    h += '.ic-actions{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}';
    h += '.ic-action{background:var(--bg-primary);border:1px solid var(--border-color);border-radius:14px;padding:4px 12px;font-size:9px;color:var(--text-muted);cursor:pointer;font-family:var(--font-mono);transition:all 0.15s}';
    h += '.ic-action:hover{border-color:#f0b90b;color:#f0b90b;background:#f0b90b11}';

    // Input
    h += '.ic-input-area{padding:8px 12px;border-top:1px solid var(--border-color);display:flex;gap:8px;align-items:center;background:var(--bg-primary)}';
    h += '.ic-input{flex:1;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--text-primary);font-family:var(--font-mono);outline:none;transition:border-color 0.2s}';
    h += '.ic-input:focus{border-color:#f0b90b;box-shadow:0 0 0 2px #f0b90b22}';
    h += '.ic-input::placeholder{color:var(--text-muted)}';
    h += '.ic-send{background:linear-gradient(135deg,#f0b90b,#e6a800);border:none;border-radius:8px;padding:10px 18px;color:#0b0e11;font-weight:800;font-size:12px;cursor:pointer;font-family:var(--font-mono);transition:transform 0.1s}';
    h += '.ic-send:hover{transform:scale(1.02)}';
    h += '.ic-send:active{transform:scale(0.98)}';

    // Thinking
    h += '.ic-thinking{display:flex;align-items:center;gap:8px;padding:10px 14px;font-size:11px;color:var(--text-muted);background:var(--bg-secondary);border-radius:10px;border:1px solid var(--border-color)}';
    h += '.ic-dots{display:flex;gap:4px}';
    h += '.ic-dot{width:6px;height:6px;border-radius:50%;background:#f0b90b;animation:ic-bounce 1.4s infinite}';
    h += '.ic-dot:nth-child(2){animation-delay:0.2s}';
    h += '.ic-dot:nth-child(3){animation-delay:0.4s}';
    h += '@keyframes ic-bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}';

    // Welcome
    h += '.ic-welcome{text-align:center;padding:20px 10px}';
    h += '.ic-welcome-title{font-size:22px;font-weight:900;background:linear-gradient(135deg,#f0b90b,#f5d060);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px}';
    h += '.ic-welcome-sub{font-size:11px;color:var(--text-muted);margin-bottom:12px}';
    h += '.ic-welcome-desc{font-size:10px;color:var(--text-secondary);max-width:400px;margin:0 auto 16px;line-height:1.6}';
    h += '.ic-welcome-cats{display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:360px;margin:0 auto}';
    h += '.ic-cat{background:var(--bg-primary);border:1px solid var(--border-color);border-radius:8px;padding:8px;text-align:left}';
    h += '.ic-cat-title{font-size:9px;font-weight:700;color:#f0b90b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px}';
    h += '.ic-cat-items{font-size:9px;color:var(--text-muted)}';

    // Analysis
    h += '.ic-analysis{font-size:10px;line-height:1.5}';
    h += '.ic-title{font-size:13px;font-weight:800;margin-bottom:8px;display:flex;align-items:center;gap:8px}';
    h += '.ic-live{font-size:7px;background:#0ecb8133;color:#0ecb81;padding:2px 6px;border-radius:3px;font-weight:700;animation:ic-pulse 2s infinite}';
    h += '@keyframes ic-pulse{0%,100%{opacity:1}50%{opacity:0.6}}';
    h += '.ic-section{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:6px;padding:8px 10px;margin:6px 0}';
    h += '.ic-section-title{font-size:10px;font-weight:700;margin-bottom:4px;color:var(--text-primary)}';
    h += '.ic-grid{display:grid;grid-template-columns:120px 1fr;gap:3px 10px;font-size:9px}';
    h += '.ic-grid span:nth-child(odd){color:var(--text-muted)}';
    h += '.ic-score{font-size:12px;margin:3px 0;font-family:var(--font-mono)}';
    h += '.ic-row{display:flex;align-items:center;gap:6px;padding:2px 0;font-size:9px}';
    h += '.ic-sym{font-weight:700;min-width:45px;color:var(--text-primary)}';
    h += '.ic-dir{font-size:7px;font-weight:700;padding:1px 5px;border-radius:3px}';
    h += '.ic-dir-LONG{background:#0ecb8122;color:#0ecb81}';
    h += '.ic-dir-SHORT{background:#f6465d22;color:#f6465d}';
    h += '.ic-dir-NEUTRAL{background:#33333344;color:var(--text-muted)}';
    h += '.ic-regime{font-size:7px;color:var(--text-muted);padding:1px 4px;background:var(--bg-primary);border-radius:2px}';
    h += '.ic-alert{border-left:2px solid #f0b90b}';
    h += '.ic-verdict{border-left:2px solid #0ecb81;background:#0ecb8108}';
    h += '.ic-learn{line-height:1.7}';
    h += '.ic-compare{width:100%;border-collapse:collapse;font-size:9px;margin:4px 0}';
    h += '.ic-compare th{text-align:left;padding:4px 8px;border-bottom:1px solid var(--border-color);color:var(--text-muted);font-weight:600}';
    h += '.ic-compare td{padding:4px 8px;border-bottom:1px solid rgba(255,255,255,0.03)}';
    h += '.ic-compare td:first-child{color:var(--text-muted)}';

    // Responsive
    h += '@media(max-width:768px){.ic-sidebar{display:none}.ic-layout{flex-direction:column}}';
    h += '</style>';

    // Layout: sidebar + chat
    h += '<div class="ic-layout">';

    // Sidebar
    h += '<div class="ic-sidebar">';
    h += `<div class="ic-sidebar-header">${_cl('markets')}</div>`;
    h += `<input class="ic-filter" id="ic-filter-input" type="text" placeholder="${_cl('filter')}" autocomplete="off">`;
    h += '<div class="ic-token-list" id="ic-token-list">';
    const filter = this._tokenFilter.toUpperCase();
    for (const t of this._tokenList) {
      const sym = t.symbol;
      const name = sym.replace('USDT', '');
      const hidden = filter && !name.includes(filter);
      const price = parseFloat(t.lastPrice);
      const pct = parseFloat(t.priceChangePercent);
      const priceStr = price >= 1000 ? price.toLocaleString(undefined, {maximumFractionDigits: 0}) : price >= 1 ? price.toFixed(2) : price.toFixed(4);
      h += `<div class="ic-token" data-sym="${name}"${hidden ? ' style="display:none"' : ''}>`;
      h += `<span class="ic-token-name">${name}</span>`;
      h += `<span class="ic-token-price">$${priceStr}</span>`;
      h += `<span class="ic-token-change ${pct >= 0 ? 'val-up' : 'val-down'}">${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%</span>`;
      h += `</div>`;
    }
    h += '</div></div>';

    // Main chat
    h += '<div class="ic-main">';
    h += '<div class="ic-messages" id="ic-messages">';
    for (const msg of this._messages) {
      h += `<div class="ic-msg ic-msg-${msg.role}">${msg.text}`;
      if (msg.actions?.length) {
        h += '<div class="ic-actions">';
        for (const a of msg.actions) h += `<button class="ic-action" data-cmd="${a.cmd}">${a.label}</button>`;
        h += '</div>';
      }
      h += '</div>';
    }
    if (this._isThinking) {
      h += `<div class="ic-thinking"><div class="ic-dots"><div class="ic-dot"></div><div class="ic-dot"></div><div class="ic-dot"></div></div>${_cl('analyzing')}</div>`;
    }
    h += '</div>';

    h += '<div class="ic-input-area">';
    h += `<input class="ic-input" id="ic-input" type="text" placeholder="${_cl('placeholder')}" autocomplete="off">`;
    h += `<button class="ic-send" id="ic-send">${_cl('ask')}</button>`;
    h += '</div></div></div>';

    return h;
  }

  _bindEvents(body) {
    const input = body.querySelector('#ic-input');
    const send = body.querySelector('#ic-send');
    const messages = body.querySelector('#ic-messages');
    const filterInput = body.querySelector('#ic-filter-input');

    if (messages) messages.scrollTop = messages.scrollHeight;

    if (input && send) {
      const go = () => {
        const val = input.value.trim();
        if (val && !this._isThinking) { input.value = ''; this._handleCommand(val); }
      };
      send.addEventListener('click', go);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      if (!this._isThinking) input.focus();
    }

    body.querySelectorAll('.ic-action').forEach(btn => {
      btn.addEventListener('click', () => { if (!this._isThinking) this._handleCommand(btn.dataset.cmd); });
    });

    // Token sidebar clicks
    body.querySelectorAll('.ic-token').forEach(token => {
      token.addEventListener('click', () => {
        if (!this._isThinking) this._handleCommand(`analyze ${token.dataset.sym}`);
      });
    });

    // Filter input
    if (filterInput) {
      filterInput.value = this._tokenFilter;
      filterInput.addEventListener('input', () => {
        this._tokenFilter = filterInput.value;
        const list = body.querySelector('#ic-token-list');
        if (list) {
          const filter = this._tokenFilter.toUpperCase();
          list.querySelectorAll('.ic-token').forEach(el => {
            el.style.display = el.dataset.sym.toUpperCase().includes(filter) ? '' : 'none';
          });
        }
      });
    }
  }

  afterRender() {
    const body = this.querySelector('.panel-body');
    if (body) this._bindEvents(body);
  }
}
customElements.define('intelligence-chat-panel', IntelligenceChatPanel);
export default IntelligenceChatPanel;
