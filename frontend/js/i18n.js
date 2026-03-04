// MEFAI i18n — Multi-language support
// Languages: English, Chinese, Turkish, Vietnamese, Hindi, Persian, German, French, Arabic, Spanish

import store from './store.js';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'fa', name: 'فارسی' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'ar', name: 'العربية' },
  { code: 'es', name: 'Español' },
];

const T = {
  en: {
    'nav.mefai': 'MEFAI', 'nav.overview': 'Overview', 'nav.meme': 'Meme',
    'nav.whale': 'Whale', 'nav.trade': 'Trade', 'nav.scan': 'Scan', 'nav.research': 'Research',
    'nav.memeHunter': 'Meme Hunter', 'nav.whaleWatcher': 'Whale Watcher',
    'nav.deepDive': 'Deep Dive', 'nav.trader': 'Trader', 'nav.scanner': 'Scanner',
    'btn.search': 'Search', 'btn.theme': 'Theme', 'btn.settings': 'Settings', 'btn.track': 'Track',
    'settings.title': 'Settings', 'settings.theme': 'Theme', 'settings.fontSize': 'Font Size',
    'settings.layout': 'Default Layout', 'settings.compact': 'Compact Mode',
    'settings.language': 'Language', 'settings.dark': 'Dark', 'settings.light': 'Light',
    'settings.normal': 'Normal', 'settings.large': 'Large', 'settings.compactTables': 'Compact tables',
    'panel.marketOverview': 'Market Overview', 'panel.orderBook': 'Order Book',
    'panel.priceChart': 'Price Chart', 'panel.spotTrading': 'Spot Trading',
    'panel.memeRush': 'Meme Rush', 'panel.topicRush': 'Topic Rush',
    'panel.walletTracker': 'Wallet Tracker', 'panel.smartSignals': 'Smart Signals',
    'panel.socialHype': 'Social Hype', 'panel.trendingTokens': 'Trending Tokens',
    'panel.smartInflow': 'Smart Inflow', 'panel.memeRank': 'Meme Rank',
    'panel.topTraders': 'Top Traders', 'panel.tokenAudit': 'Token Audit',
    'panel.tokenSearch': 'Token Search', 'panel.tokenProfile': 'Token Profile',
    'panel.dexChart': 'DEX Chart', 'panel.autoScanner': 'Auto Scanner',
    'panel.smartFlow': 'Smart Flow', 'panel.allSkills': 'All Skills',
    'load.analyzing': 'AI is analyzing markets', 'load.scanning': 'Scanning blockchain data',
    'load.processing': 'Processing smart money signals', 'load.fetching': 'Fetching live market data',
    'load.connecting': 'Connecting to data feeds', 'load.warming': 'AI models warming up',
    'load.syncing': 'Syncing with exchange', 'load.init': 'AI is initializing terminal',
    'common.price': 'Price', 'common.volume': 'Volume', 'common.change': 'Change',
    'common.marketCap': 'Market Cap', 'common.token': 'Token', 'common.qty': 'Qty',
    'common.value': 'Value', 'common.total': 'Total', 'common.noData': 'No data',
    'common.enterAddress': 'Enter a wallet address to track', 'common.walletAddress': 'Wallet address',
    'common.searchPlaceholder': 'Search token by name, symbol, or address...',
  },
  zh: {
    'nav.mefai': 'MEFAI', 'nav.overview': '概览', 'nav.meme': 'Meme',
    'nav.whale': '鲸鱼', 'nav.trade': '交易', 'nav.scan': '扫描', 'nav.research': '研究',
    'nav.memeHunter': 'Meme猎手', 'nav.whaleWatcher': '鲸鱼观察',
    'nav.deepDive': '深度研究', 'nav.trader': '交易员', 'nav.scanner': '扫描器',
    'btn.search': '搜索', 'btn.theme': '主题', 'btn.settings': '设置', 'btn.track': '追踪',
    'settings.title': '设置', 'settings.theme': '主题', 'settings.fontSize': '字体大小',
    'settings.layout': '默认布局', 'settings.compact': '紧凑模式',
    'settings.language': '语言', 'settings.dark': '深色', 'settings.light': '浅色',
    'settings.normal': '正常', 'settings.large': '大', 'settings.compactTables': '紧凑表格',
    'panel.marketOverview': '市场概览', 'panel.orderBook': '订单簿',
    'panel.priceChart': '价格图表', 'panel.spotTrading': '现货交易',
    'panel.memeRush': 'Meme热潮', 'panel.topicRush': '话题热潮',
    'panel.walletTracker': '钱包追踪', 'panel.smartSignals': '智能信号',
    'panel.socialHype': '社交热度', 'panel.trendingTokens': '热门代币',
    'panel.smartInflow': '智能流入', 'panel.memeRank': 'Meme排名',
    'panel.topTraders': '顶级交易者', 'panel.tokenAudit': '代币审计',
    'panel.tokenSearch': '代币搜索', 'panel.tokenProfile': '代币概况',
    'panel.dexChart': 'DEX图表', 'panel.autoScanner': '自动扫描',
    'panel.smartFlow': '智能资金流', 'panel.allSkills': '全部技能',
    'load.analyzing': 'AI正在分析市场', 'load.scanning': '扫描区块链数据',
    'load.processing': '处理智能资金信号', 'load.fetching': '获取实时市场数据',
    'load.connecting': '连接数据源', 'load.warming': 'AI模型预热中',
    'load.syncing': '与交易所同步', 'load.init': 'AI正在初始化终端',
    'common.price': '价格', 'common.volume': '成交量', 'common.change': '变化',
    'common.marketCap': '市值', 'common.token': '代币', 'common.qty': '数量',
    'common.value': '价值', 'common.total': '总计', 'common.noData': '无数据',
    'common.enterAddress': '输入钱包地址进行追踪', 'common.walletAddress': '钱包地址',
    'common.searchPlaceholder': '搜索代币名称、符号或地址...',
  },
  tr: {
    'nav.mefai': 'MEFAI', 'nav.overview': 'Genel', 'nav.meme': 'Meme',
    'nav.whale': 'Balina', 'nav.trade': 'Trade', 'nav.scan': 'Tara', 'nav.research': 'Araştır',
    'nav.memeHunter': 'Meme Avcısı', 'nav.whaleWatcher': 'Balina Takip',
    'nav.deepDive': 'Derinlemesine', 'nav.trader': 'Trader', 'nav.scanner': 'Tarayıcı',
    'btn.search': 'Ara', 'btn.theme': 'Tema', 'btn.settings': 'Ayarlar', 'btn.track': 'Takip',
    'settings.title': 'Ayarlar', 'settings.theme': 'Tema', 'settings.fontSize': 'Yazı Boyutu',
    'settings.layout': 'Varsayılan Düzen', 'settings.compact': 'Kompakt Mod',
    'settings.language': 'Dil', 'settings.dark': 'Koyu', 'settings.light': 'Açık',
    'settings.normal': 'Normal', 'settings.large': 'Büyük', 'settings.compactTables': 'Kompakt tablolar',
    'panel.marketOverview': 'Piyasa Özeti', 'panel.orderBook': 'Emir Defteri',
    'panel.priceChart': 'Fiyat Grafiği', 'panel.spotTrading': 'Spot İşlem',
    'panel.memeRush': 'Meme Rush', 'panel.topicRush': 'Konu Rush',
    'panel.walletTracker': 'Cüzdan Takip', 'panel.smartSignals': 'Akıllı Sinyaller',
    'panel.socialHype': 'Sosyal Hype', 'panel.trendingTokens': 'Trend Tokenler',
    'panel.smartInflow': 'Akıllı Giriş', 'panel.memeRank': 'Meme Sıralama',
    'panel.topTraders': 'En İyi Traderlar', 'panel.tokenAudit': 'Token Denetimi',
    'panel.tokenSearch': 'Token Arama', 'panel.tokenProfile': 'Token Profili',
    'panel.dexChart': 'DEX Grafik', 'panel.autoScanner': 'Otomatik Tarayıcı',
    'panel.smartFlow': 'Akıllı Akış', 'panel.allSkills': 'Tüm Yetenekler',
    'load.analyzing': 'AI piyasaları analiz ediyor', 'load.scanning': 'Blockchain verileri taranıyor',
    'load.processing': 'Akıllı para sinyalleri işleniyor', 'load.fetching': 'Canlı piyasa verileri alınıyor',
    'load.connecting': 'Veri kaynaklarına bağlanılıyor', 'load.warming': 'AI modelleri ısınıyor',
    'load.syncing': 'Borsa ile senkronize ediliyor', 'load.init': 'AI terminali başlatılıyor',
    'common.price': 'Fiyat', 'common.volume': 'Hacim', 'common.change': 'Değişim',
    'common.marketCap': 'Piyasa Değeri', 'common.token': 'Token', 'common.qty': 'Miktar',
    'common.value': 'Değer', 'common.total': 'Toplam', 'common.noData': 'Veri yok',
    'common.enterAddress': 'Takip etmek için cüzdan adresi girin', 'common.walletAddress': 'Cüzdan adresi',
    'common.searchPlaceholder': 'Token adı, sembol veya adrese göre ara...',
  },
  vi: {
    'nav.mefai': 'MEFAI', 'nav.overview': 'Tổng quan', 'nav.meme': 'Meme',
    'nav.whale': 'Cá voi', 'nav.trade': 'Giao dịch', 'nav.scan': 'Quét', 'nav.research': 'Nghiên cứu',
    'nav.memeHunter': 'Săn Meme', 'nav.whaleWatcher': 'Theo dõi Cá voi',
    'nav.deepDive': 'Phân tích sâu', 'nav.trader': 'Trader', 'nav.scanner': 'Quét',
    'btn.search': 'Tìm kiếm', 'btn.theme': 'Giao diện', 'btn.settings': 'Cài đặt', 'btn.track': 'Theo dõi',
    'settings.title': 'Cài đặt', 'settings.theme': 'Giao diện', 'settings.fontSize': 'Cỡ chữ',
    'settings.layout': 'Bố cục mặc định', 'settings.compact': 'Chế độ gọn',
    'settings.language': 'Ngôn ngữ', 'settings.dark': 'Tối', 'settings.light': 'Sáng',
    'settings.normal': 'Bình thường', 'settings.large': 'Lớn', 'settings.compactTables': 'Bảng gọn',
    'panel.marketOverview': 'Tổng quan thị trường', 'panel.orderBook': 'Sổ lệnh',
    'panel.priceChart': 'Biểu đồ giá', 'panel.spotTrading': 'Giao dịch Spot',
    'panel.memeRush': 'Meme Rush', 'panel.topicRush': 'Topic Rush',
    'panel.walletTracker': 'Theo dõi ví', 'panel.smartSignals': 'Tín hiệu thông minh',
    'panel.socialHype': 'Social Hype', 'panel.trendingTokens': 'Token thịnh hành',
    'panel.smartInflow': 'Dòng tiền thông minh', 'panel.memeRank': 'Xếp hạng Meme',
    'panel.topTraders': 'Trader hàng đầu', 'panel.tokenAudit': 'Kiểm tra Token',
    'panel.tokenSearch': 'Tìm Token', 'panel.tokenProfile': 'Hồ sơ Token',
    'panel.dexChart': 'Biểu đồ DEX', 'panel.autoScanner': 'Quét tự động',
    'panel.smartFlow': 'Dòng tiền', 'panel.allSkills': 'Tất cả kỹ năng',
    'load.analyzing': 'AI đang phân tích thị trường', 'load.scanning': 'Quét dữ liệu blockchain',
    'load.processing': 'Xử lý tín hiệu tiền thông minh', 'load.fetching': 'Đang lấy dữ liệu thị trường',
    'load.connecting': 'Kết nối nguồn dữ liệu', 'load.warming': 'Mô hình AI khởi động',
    'load.syncing': 'Đồng bộ sàn giao dịch', 'load.init': 'AI đang khởi tạo terminal',
    'common.price': 'Giá', 'common.volume': 'Khối lượng', 'common.change': 'Biến động',
    'common.marketCap': 'Vốn hóa', 'common.token': 'Token', 'common.qty': 'Số lượng',
    'common.value': 'Giá trị', 'common.total': 'Tổng', 'common.noData': 'Không có dữ liệu',
    'common.enterAddress': 'Nhập địa chỉ ví để theo dõi', 'common.walletAddress': 'Địa chỉ ví',
    'common.searchPlaceholder': 'Tìm token theo tên, ký hiệu hoặc địa chỉ...',
  },
  hi: {
    'nav.mefai': 'MEFAI', 'nav.overview': 'अवलोकन', 'nav.meme': 'Meme',
    'nav.whale': 'व्हेल', 'nav.trade': 'ट्रेड', 'nav.scan': 'स्कैन', 'nav.research': 'रिसर्च',
    'nav.memeHunter': 'Meme हंटर', 'nav.whaleWatcher': 'व्हेल वॉचर',
    'nav.deepDive': 'गहन विश्लेषण', 'nav.trader': 'ट्रेडर', 'nav.scanner': 'स्कैनर',
    'btn.search': 'खोजें', 'btn.theme': 'थीम', 'btn.settings': 'सेटिंग्स', 'btn.track': 'ट्रैक',
    'settings.title': 'सेटिंग्स', 'settings.theme': 'थीम', 'settings.fontSize': 'फॉन्ट साइज़',
    'settings.layout': 'डिफ़ॉल्ट लेआउट', 'settings.compact': 'कॉम्पैक्ट मोड',
    'settings.language': 'भाषा', 'settings.dark': 'डार्क', 'settings.light': 'लाइट',
    'settings.normal': 'सामान्य', 'settings.large': 'बड़ा', 'settings.compactTables': 'कॉम्पैक्ट टेबल',
    'panel.marketOverview': 'मार्केट ओवरव्यू', 'panel.orderBook': 'ऑर्डर बुक',
    'panel.priceChart': 'प्राइस चार्ट', 'panel.spotTrading': 'स्पॉट ट्रेडिंग',
    'panel.memeRush': 'Meme Rush', 'panel.topicRush': 'Topic Rush',
    'panel.walletTracker': 'वॉलेट ट्रैकर', 'panel.smartSignals': 'स्मार्ट सिग्नल',
    'panel.socialHype': 'सोशल हाइप', 'panel.trendingTokens': 'ट्रेंडिंग टोकन',
    'panel.smartInflow': 'स्मार्ट इनफ्लो', 'panel.memeRank': 'Meme रैंक',
    'panel.topTraders': 'टॉप ट्रेडर्स', 'panel.tokenAudit': 'टोकन ऑडिट',
    'panel.tokenSearch': 'टोकन खोज', 'panel.tokenProfile': 'टोकन प्रोफ़ाइल',
    'panel.dexChart': 'DEX चार्ट', 'panel.autoScanner': 'ऑटो स्कैनर',
    'panel.smartFlow': 'स्मार्ट फ़्लो', 'panel.allSkills': 'सभी स्किल्स',
    'load.analyzing': 'AI बाज़ार का विश्लेषण कर रहा है', 'load.scanning': 'ब्लॉकचेन डेटा स्कैन हो रहा है',
    'load.processing': 'स्मार्ट मनी सिग्नल प्रोसेस हो रहे हैं', 'load.fetching': 'लाइव मार्केट डेटा आ रहा है',
    'load.connecting': 'डेटा फ़ीड से कनेक्ट हो रहा है', 'load.warming': 'AI मॉडल तैयार हो रहे हैं',
    'load.syncing': 'एक्सचेंज से सिंक हो रहा है', 'load.init': 'AI टर्मिनल शुरू हो रहा है',
    'common.price': 'कीमत', 'common.volume': 'वॉल्यूम', 'common.change': 'बदलाव',
    'common.marketCap': 'मार्केट कैप', 'common.token': 'टोकन', 'common.qty': 'मात्रा',
    'common.value': 'मूल्य', 'common.total': 'कुल', 'common.noData': 'कोई डेटा नहीं',
    'common.enterAddress': 'ट्रैक करने के लिए वॉलेट एड्रेस दर्ज करें', 'common.walletAddress': 'वॉलेट एड्रेस',
    'common.searchPlaceholder': 'नाम, सिंबल या एड्रेस से टोकन खोजें...',
  },
  fa: {
    'nav.mefai': 'MEFAI', 'nav.overview': 'نمای کلی', 'nav.meme': 'Meme',
    'nav.whale': 'نهنگ', 'nav.trade': 'معامله', 'nav.scan': 'اسکن', 'nav.research': 'تحقیق',
    'nav.memeHunter': 'شکارچی Meme', 'nav.whaleWatcher': 'رصد نهنگ',
    'nav.deepDive': 'تحلیل عمیق', 'nav.trader': 'معامله‌گر', 'nav.scanner': 'اسکنر',
    'btn.search': 'جستجو', 'btn.theme': 'پوسته', 'btn.settings': 'تنظیمات', 'btn.track': 'ردیابی',
    'settings.title': 'تنظیمات', 'settings.theme': 'پوسته', 'settings.fontSize': 'اندازه فونت',
    'settings.layout': 'چیدمان پیش‌فرض', 'settings.compact': 'حالت فشرده',
    'settings.language': 'زبان', 'settings.dark': 'تیره', 'settings.light': 'روشن',
    'settings.normal': 'عادی', 'settings.large': 'بزرگ', 'settings.compactTables': 'جداول فشرده',
    'panel.marketOverview': 'نمای بازار', 'panel.orderBook': 'دفتر سفارش',
    'panel.priceChart': 'نمودار قیمت', 'panel.spotTrading': 'معاملات اسپات',
    'panel.memeRush': 'Meme Rush', 'panel.topicRush': 'Topic Rush',
    'panel.walletTracker': 'ردیاب کیف پول', 'panel.smartSignals': 'سیگنال هوشمند',
    'panel.socialHype': 'هیجان اجتماعی', 'panel.trendingTokens': 'توکن‌های داغ',
    'panel.smartInflow': 'ورود هوشمند', 'panel.memeRank': 'رتبه Meme',
    'panel.topTraders': 'برترین معامله‌گران', 'panel.tokenAudit': 'بررسی توکن',
    'panel.tokenSearch': 'جستجوی توکن', 'panel.tokenProfile': 'پروفایل توکن',
    'panel.dexChart': 'نمودار DEX', 'panel.autoScanner': 'اسکنر خودکار',
    'panel.smartFlow': 'جریان هوشمند', 'panel.allSkills': 'همه مهارت‌ها',
    'load.analyzing': 'AI در حال تحلیل بازار', 'load.scanning': 'اسکن داده‌های بلاکچین',
    'load.processing': 'پردازش سیگنال‌های پول هوشمند', 'load.fetching': 'دریافت داده‌های بازار',
    'load.connecting': 'اتصال به منابع داده', 'load.warming': 'مدل‌های AI در حال آماده‌سازی',
    'load.syncing': 'همگام‌سازی با صرافی', 'load.init': 'AI ترمینال را راه‌اندازی می‌کند',
    'common.price': 'قیمت', 'common.volume': 'حجم', 'common.change': 'تغییر',
    'common.marketCap': 'ارزش بازار', 'common.token': 'توکن', 'common.qty': 'تعداد',
    'common.value': 'ارزش', 'common.total': 'مجموع', 'common.noData': 'داده‌ای نیست',
    'common.enterAddress': 'آدرس کیف پول را وارد کنید', 'common.walletAddress': 'آدرس کیف پول',
    'common.searchPlaceholder': 'جستجوی توکن با نام، نماد یا آدرس...',
  },
  de: {
    'nav.mefai': 'MEFAI', 'nav.overview': 'Übersicht', 'nav.meme': 'Meme',
    'nav.whale': 'Wal', 'nav.trade': 'Handel', 'nav.scan': 'Scan', 'nav.research': 'Forschung',
    'nav.memeHunter': 'Meme-Jäger', 'nav.whaleWatcher': 'Wal-Beobachter',
    'nav.deepDive': 'Tiefenanalyse', 'nav.trader': 'Händler', 'nav.scanner': 'Scanner',
    'btn.search': 'Suche', 'btn.theme': 'Design', 'btn.settings': 'Einstellungen', 'btn.track': 'Verfolgen',
    'settings.title': 'Einstellungen', 'settings.theme': 'Design', 'settings.fontSize': 'Schriftgröße',
    'settings.layout': 'Standard-Layout', 'settings.compact': 'Kompaktmodus',
    'settings.language': 'Sprache', 'settings.dark': 'Dunkel', 'settings.light': 'Hell',
    'settings.normal': 'Normal', 'settings.large': 'Groß', 'settings.compactTables': 'Kompakte Tabellen',
    'panel.marketOverview': 'Marktübersicht', 'panel.orderBook': 'Orderbuch',
    'panel.priceChart': 'Preisdiagramm', 'panel.spotTrading': 'Spot-Handel',
    'panel.memeRush': 'Meme Rush', 'panel.topicRush': 'Topic Rush',
    'panel.walletTracker': 'Wallet-Tracker', 'panel.smartSignals': 'Smarte Signale',
    'panel.socialHype': 'Social Hype', 'panel.trendingTokens': 'Trend-Token',
    'panel.smartInflow': 'Smart-Zufluss', 'panel.memeRank': 'Meme-Rang',
    'panel.topTraders': 'Top-Händler', 'panel.tokenAudit': 'Token-Audit',
    'panel.tokenSearch': 'Token-Suche', 'panel.tokenProfile': 'Token-Profil',
    'panel.dexChart': 'DEX-Chart', 'panel.autoScanner': 'Auto-Scanner',
    'panel.smartFlow': 'Smart-Fluss', 'panel.allSkills': 'Alle Skills',
    'load.analyzing': 'KI analysiert Märkte', 'load.scanning': 'Blockchain-Daten werden gescannt',
    'load.processing': 'Smart-Money-Signale werden verarbeitet', 'load.fetching': 'Live-Marktdaten werden abgerufen',
    'load.connecting': 'Verbindung zu Datenquellen', 'load.warming': 'KI-Modelle werden aufgewärmt',
    'load.syncing': 'Synchronisierung mit Börse', 'load.init': 'KI initialisiert Terminal',
    'common.price': 'Preis', 'common.volume': 'Volumen', 'common.change': 'Änderung',
    'common.marketCap': 'Marktkapitalisierung', 'common.token': 'Token', 'common.qty': 'Menge',
    'common.value': 'Wert', 'common.total': 'Gesamt', 'common.noData': 'Keine Daten',
    'common.enterAddress': 'Wallet-Adresse eingeben', 'common.walletAddress': 'Wallet-Adresse',
    'common.searchPlaceholder': 'Token nach Name, Symbol oder Adresse suchen...',
  },
  fr: {
    'nav.mefai': 'MEFAI', 'nav.overview': 'Aperçu', 'nav.meme': 'Meme',
    'nav.whale': 'Baleine', 'nav.trade': 'Trading', 'nav.scan': 'Scan', 'nav.research': 'Recherche',
    'nav.memeHunter': 'Chasseur Meme', 'nav.whaleWatcher': 'Guetteur Baleine',
    'nav.deepDive': 'Analyse profonde', 'nav.trader': 'Trader', 'nav.scanner': 'Scanner',
    'btn.search': 'Recherche', 'btn.theme': 'Thème', 'btn.settings': 'Paramètres', 'btn.track': 'Suivre',
    'settings.title': 'Paramètres', 'settings.theme': 'Thème', 'settings.fontSize': 'Taille police',
    'settings.layout': 'Mise en page', 'settings.compact': 'Mode compact',
    'settings.language': 'Langue', 'settings.dark': 'Sombre', 'settings.light': 'Clair',
    'settings.normal': 'Normal', 'settings.large': 'Grand', 'settings.compactTables': 'Tableaux compacts',
    'panel.marketOverview': 'Aperçu du marché', 'panel.orderBook': 'Carnet d\'ordres',
    'panel.priceChart': 'Graphique prix', 'panel.spotTrading': 'Trading Spot',
    'panel.memeRush': 'Meme Rush', 'panel.topicRush': 'Topic Rush',
    'panel.walletTracker': 'Suivi portefeuille', 'panel.smartSignals': 'Signaux intelligents',
    'panel.socialHype': 'Social Hype', 'panel.trendingTokens': 'Tokens tendance',
    'panel.smartInflow': 'Flux intelligent', 'panel.memeRank': 'Classement Meme',
    'panel.topTraders': 'Top traders', 'panel.tokenAudit': 'Audit token',
    'panel.tokenSearch': 'Recherche token', 'panel.tokenProfile': 'Profil token',
    'panel.dexChart': 'Graphique DEX', 'panel.autoScanner': 'Scanner auto',
    'panel.smartFlow': 'Flux intelligent', 'panel.allSkills': 'Toutes les compétences',
    'load.analyzing': 'L\'IA analyse les marchés', 'load.scanning': 'Scan des données blockchain',
    'load.processing': 'Traitement des signaux smart money', 'load.fetching': 'Récupération des données',
    'load.connecting': 'Connexion aux flux', 'load.warming': 'Modèles IA en préparation',
    'load.syncing': 'Synchronisation avec la bourse', 'load.init': 'L\'IA initialise le terminal',
    'common.price': 'Prix', 'common.volume': 'Volume', 'common.change': 'Variation',
    'common.marketCap': 'Capitalisation', 'common.token': 'Token', 'common.qty': 'Qté',
    'common.value': 'Valeur', 'common.total': 'Total', 'common.noData': 'Aucune donnée',
    'common.enterAddress': 'Entrez une adresse de portefeuille', 'common.walletAddress': 'Adresse portefeuille',
    'common.searchPlaceholder': 'Chercher un token par nom, symbole ou adresse...',
  },
  ar: {
    'nav.mefai': 'MEFAI', 'nav.overview': 'نظرة عامة', 'nav.meme': 'Meme',
    'nav.whale': 'حوت', 'nav.trade': 'تداول', 'nav.scan': 'مسح', 'nav.research': 'بحث',
    'nav.memeHunter': 'صياد Meme', 'nav.whaleWatcher': 'مراقب الحيتان',
    'nav.deepDive': 'تحليل معمّق', 'nav.trader': 'متداول', 'nav.scanner': 'ماسح',
    'btn.search': 'بحث', 'btn.theme': 'المظهر', 'btn.settings': 'إعدادات', 'btn.track': 'تتبع',
    'settings.title': 'إعدادات', 'settings.theme': 'المظهر', 'settings.fontSize': 'حجم الخط',
    'settings.layout': 'التخطيط الافتراضي', 'settings.compact': 'الوضع المضغوط',
    'settings.language': 'اللغة', 'settings.dark': 'داكن', 'settings.light': 'فاتح',
    'settings.normal': 'عادي', 'settings.large': 'كبير', 'settings.compactTables': 'جداول مضغوطة',
    'panel.marketOverview': 'نظرة على السوق', 'panel.orderBook': 'دفتر الأوامر',
    'panel.priceChart': 'مخطط السعر', 'panel.spotTrading': 'تداول فوري',
    'panel.memeRush': 'Meme Rush', 'panel.topicRush': 'Topic Rush',
    'panel.walletTracker': 'متتبع المحفظة', 'panel.smartSignals': 'إشارات ذكية',
    'panel.socialHype': 'ضجة اجتماعية', 'panel.trendingTokens': 'توكنات رائجة',
    'panel.smartInflow': 'تدفق ذكي', 'panel.memeRank': 'تصنيف Meme',
    'panel.topTraders': 'أفضل المتداولين', 'panel.tokenAudit': 'تدقيق التوكن',
    'panel.tokenSearch': 'بحث التوكن', 'panel.tokenProfile': 'ملف التوكن',
    'panel.dexChart': 'مخطط DEX', 'panel.autoScanner': 'ماسح تلقائي',
    'panel.smartFlow': 'تدفق ذكي', 'panel.allSkills': 'جميع المهارات',
    'load.analyzing': 'الذكاء الاصطناعي يحلل الأسواق', 'load.scanning': 'مسح بيانات البلوكتشين',
    'load.processing': 'معالجة إشارات الأموال الذكية', 'load.fetching': 'جلب بيانات السوق الحية',
    'load.connecting': 'الاتصال بمصادر البيانات', 'load.warming': 'نماذج AI قيد التحضير',
    'load.syncing': 'المزامنة مع البورصة', 'load.init': 'AI يقوم بتهيئة المحطة',
    'common.price': 'السعر', 'common.volume': 'الحجم', 'common.change': 'التغير',
    'common.marketCap': 'القيمة السوقية', 'common.token': 'توكن', 'common.qty': 'الكمية',
    'common.value': 'القيمة', 'common.total': 'المجموع', 'common.noData': 'لا توجد بيانات',
    'common.enterAddress': 'أدخل عنوان المحفظة للتتبع', 'common.walletAddress': 'عنوان المحفظة',
    'common.searchPlaceholder': 'البحث عن توكن بالاسم أو الرمز أو العنوان...',
  },
  es: {
    'nav.mefai': 'MEFAI', 'nav.overview': 'General', 'nav.meme': 'Meme',
    'nav.whale': 'Ballena', 'nav.trade': 'Trading', 'nav.scan': 'Escaneo', 'nav.research': 'Investigación',
    'nav.memeHunter': 'Cazador Meme', 'nav.whaleWatcher': 'Vigilante Ballena',
    'nav.deepDive': 'Inmersión profunda', 'nav.trader': 'Trader', 'nav.scanner': 'Escáner',
    'btn.search': 'Buscar', 'btn.theme': 'Tema', 'btn.settings': 'Ajustes', 'btn.track': 'Rastrear',
    'settings.title': 'Ajustes', 'settings.theme': 'Tema', 'settings.fontSize': 'Tamaño fuente',
    'settings.layout': 'Diseño predeterminado', 'settings.compact': 'Modo compacto',
    'settings.language': 'Idioma', 'settings.dark': 'Oscuro', 'settings.light': 'Claro',
    'settings.normal': 'Normal', 'settings.large': 'Grande', 'settings.compactTables': 'Tablas compactas',
    'panel.marketOverview': 'Resumen del mercado', 'panel.orderBook': 'Libro de órdenes',
    'panel.priceChart': 'Gráfico de precio', 'panel.spotTrading': 'Trading Spot',
    'panel.memeRush': 'Meme Rush', 'panel.topicRush': 'Topic Rush',
    'panel.walletTracker': 'Rastreador de billetera', 'panel.smartSignals': 'Señales inteligentes',
    'panel.socialHype': 'Social Hype', 'panel.trendingTokens': 'Tokens en tendencia',
    'panel.smartInflow': 'Flujo inteligente', 'panel.memeRank': 'Ranking Meme',
    'panel.topTraders': 'Mejores traders', 'panel.tokenAudit': 'Auditoría de token',
    'panel.tokenSearch': 'Buscar token', 'panel.tokenProfile': 'Perfil de token',
    'panel.dexChart': 'Gráfico DEX', 'panel.autoScanner': 'Escáner automático',
    'panel.smartFlow': 'Flujo inteligente', 'panel.allSkills': 'Todas las habilidades',
    'load.analyzing': 'IA analizando mercados', 'load.scanning': 'Escaneando datos blockchain',
    'load.processing': 'Procesando señales de dinero inteligente', 'load.fetching': 'Obteniendo datos del mercado',
    'load.connecting': 'Conectando a fuentes de datos', 'load.warming': 'Modelos IA calentando',
    'load.syncing': 'Sincronizando con el exchange', 'load.init': 'IA inicializando terminal',
    'common.price': 'Precio', 'common.volume': 'Volumen', 'common.change': 'Cambio',
    'common.marketCap': 'Cap. de mercado', 'common.token': 'Token', 'common.qty': 'Cant.',
    'common.value': 'Valor', 'common.total': 'Total', 'common.noData': 'Sin datos',
    'common.enterAddress': 'Ingrese dirección de billetera', 'common.walletAddress': 'Dirección de billetera',
    'common.searchPlaceholder': 'Buscar token por nombre, símbolo o dirección...',
  },
};

// Panel tag → i18n title key mapping
const _tagToKey = {
  'market-overview-panel': 'panel.marketOverview', 'order-book-panel': 'panel.orderBook',
  'price-chart-panel': 'panel.priceChart', 'spot-trading-panel': 'panel.spotTrading',
  'meme-rush-panel': 'panel.memeRush', 'topic-rush-panel': 'panel.topicRush',
  'wallet-tracker-panel': 'panel.walletTracker', 'smart-signals-panel': 'panel.smartSignals',
  'social-hype-panel': 'panel.socialHype', 'trending-tokens-panel': 'panel.trendingTokens',
  'smart-inflow-panel': 'panel.smartInflow', 'meme-rank-panel': 'panel.memeRank',
  'top-traders-panel': 'panel.topTraders', 'token-audit-panel': 'panel.tokenAudit',
  'token-search-panel': 'panel.tokenSearch', 'token-profile-panel': 'panel.tokenProfile',
  'dex-chart-panel': 'panel.dexChart', 'auto-scanner-panel': 'panel.autoScanner',
  'smart-flow-panel': 'panel.smartFlow', 'all-skills-panel': 'panel.allSkills',
};

let _lang = 'en';

function t(key) {
  if (_lang === 'en') return T.en[key] || key;
  return T[_lang]?.[key] || T.en[key] || key;
}

function getLang() { return _lang; }
function getLanguages() { return languages; }

function setLang(lang) {
  if (!T[lang]) return;
  _lang = lang;
  store.savePref('language', lang);
  applyTranslations();
  // Update all language selectors
  document.querySelectorAll('.lang-select').forEach(sel => { sel.value = lang; });
}

function applyTranslations() {
  // 1. Static [data-i18n] elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = t(key);
    } else {
      el.textContent = t(key);
    }
  });

  // 2. Panel titles — lookup by custom element tag name
  document.querySelectorAll('.panel-title').forEach(el => {
    const panel = el.closest('.panel');
    if (!panel) return;
    const tag = panel.tagName.toLowerCase();
    const key = _tagToKey[tag];
    if (key) el.textContent = t(key);
  });

  // 3. Settings overlay title
  const sh = document.querySelector('.settings-header h2');
  if (sh) sh.textContent = t('settings.title');
}

// Loading message keys for base-panel
function loadingMessages() {
  return [
    t('load.analyzing'), t('load.scanning'), t('load.processing'),
    t('load.fetching'), t('load.connecting'), t('load.warming'), t('load.syncing'),
  ];
}

// Initialize
function init() {
  const saved = store.getPref('language');
  if (saved && T[saved]) _lang = saved;

  // Populate language selectors
  document.querySelectorAll('.lang-select').forEach(sel => {
    sel.innerHTML = languages.map(l =>
      `<option value="${l.code}"${l.code === _lang ? ' selected' : ''}>${l.name}</option>`
    ).join('');
    sel.addEventListener('change', () => setLang(sel.value));
  });

  // Apply on load
  if (_lang !== 'en') applyTranslations();
}

// Run init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

const i18n = { t, getLang, setLang, getLanguages, loadingMessages, applyTranslations };
window.mefaiI18n = i18n;
export default i18n;
