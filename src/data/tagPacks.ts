import type { Collection, TagDefinition, TagPack } from '../types/domain';

type TagSeed = [string, string, string, string?];
const definitions = (rows: TagSeed[]): TagDefinition[] => rows.map(([label, description, keywords, domains], i) => ({
  id: String(i), label, description, keywords: keywords.split('|').filter(Boolean), domains: domains?.split('|')
}));
const seeds: [string, string, TagSeed[]][] = [
  ['general', '通用资源', [
    ['在线工具', '直接提供在线操作功能的工具，不包含介绍工具的文章。', '在线工具|在线转换|在线生成|online tool|converter'],
    ['代码仓库', '具体的软件源代码仓库，不包含平台首页、用户页或普通讨论。', '代码仓库|source code|github repository'],
    ['文档', '说明使用方法或技术接口的参考文档。', '官方文档|技术文档|documentation|api reference'],
    ['教程', '有步骤或教学说明的教程；并非所有视频都是教程。', '教程|入门指南|tutorial|step by step'],
    ['文章', '供阅读的新闻、博客或论述文章。', '博客|文章|blog|article'],
    ['视频', '视频内容或播放页面。', '视频|video', 'youtube.com|youtu.be|bilibili.com'],
    ['模板', '可复用、可填写或可改编的模板。', '模板|template'],
    ['素材', '供创作使用的图片、音频等素材。', '素材|stock photo|stock footage']
  ]],
  ['ai-tools', 'AI工具', [
    ['AI助手', '通用的 AI 对话助手或 AI 搜索，可直接提问、总结和生成内容。', 'AI助手|AI 助手|AI对话|AI搜索|聊天机器人|chatbot|ai assistant|ai search'],
    ['AI写作', '用 AI 生成或改写文章、文案等文字内容的工具。', 'AI写作|AI 写作|AI文案|ai writing|ai copywriting|ai writer'],
    ['AI绘图', '用 AI 生成或编辑图片、插画的工具。', 'AI绘图|AI绘画|AI 绘画|AI作图|AI生图|文生图|text to image|ai image generator|ai art'],
    ['AI视频', '用 AI 生成或编辑视频的工具。', 'AI视频|AI 视频|文生视频|text to video|ai video'],
    ['AI编程', '辅助写代码、生成应用或调试程序的 AI 工具。', 'AI编程|AI 编程|代码助手|ai coding|ai code|code assistant|coding agent'],
    ['AI技能', '给 AI 智能体扩展能力的资源：Agent Skill（技能）、MCP 服务、提示词库、智能体工作流模板。', 'skill|skills|agent skill|claude skill|mcp|mcp server|提示词库|prompt library|prompts|技能库|智能体', 'skills.sh|skillsmp.com|smithery.ai|mcp.so|glama.ai|modelcontextprotocol.io']
  ]],
  ['research', '科研学术', [
    ['文献检索', '用于查找论文、学术文献或学术索引。', '文献检索|学术搜索|literature search', 'scholar.google.com|pubmed.ncbi.nlm.nih.gov|semanticscholar.org'],
    ['研究方法', '研究设计、研究方法或方法学资料。', '研究方法|研究设计|methodology|research methods'],
    ['数据集', '可供研究或分析使用的数据集、数据资源目录。', '数据集|dataset|datasets|open data', 'zenodo.org|data.gov'],
    ['实验工具', '用于设计、执行、测量或记录实验的工具。', '实验工具|实验设备|laboratory tools|lab notebook'],
    ['学术写作', '论文写作、文献引用、学术排版或文献管理。', '学术写作|论文写作|文献管理|bibtex|latex|academic writing', 'overleaf.com|zotero.org'],
    ['投稿资源', '期刊、会议投稿说明和发表相关资料。', '投稿指南|征稿|期刊投稿|call for papers|submission guidelines'],
    ['论文阅读', '具体的学术论文、预印本或论文阅读资源。', '论文|预印本|research paper|preprint', 'arxiv.org'],
    ['问卷调查', '在线问卷、表单与调查研究工具。', '问卷|调查问卷|在线表单|survey|questionnaire']
  ]],
  ['learning', '学习教育', [
    ['在线课程', '结构化的在线课程。', '在线课程|course|mooc', 'coursera.org|edx.org|khanacademy.org'],
    ['语言学习', '语言学习、词汇、语法或语言练习。', '语言学习|英语学习|language learning|grammar', 'duolingo.com'],
    ['教材题库', '教材、习题或题库。', '教材|题库|习题|textbook|practice questions'],
    ['考试备考', '针对明确考试的备考资料。', '备考|考研|雅思|托福|exam preparation|ielts|toefl'],
    ['知识笔记', '学习笔记、知识整理方法或工具。', '学习笔记|知识笔记|study notes|knowledge management'],
    ['百科', '百科全书与知识条目。', '百科|百科全书|encyclopedia|wikipedia']
  ]],
  ['development', '软件开发', [
    ['技术文档', '软件、编程语言或接口的技术参考文档。', '技术文档|开发文档|api reference|developer documentation'],
    ['开源项目', '明确标注开源的软件项目。', '开源|open source|opensource'],
    ['接口调试', '用于调用、测试或调试接口。', '接口调试|api testing|api client', 'postman.com|hoppscotch.io'],
    ['测试部署', '软件测试、构建、发布或部署。', '单元测试|自动化测试|部署|deployment|ci/cd|unit testing'],
    ['运维安全', '运维、监控、基础设施或信息安全。', '运维|信息安全|漏洞|devops|observability|cybersecurity'],
    ['技术社区', '开发者交流、问答和技术讨论社区。', '技术社区|开发者社区|程序员社区|developer community']
  ]],
  ['data-ai', '数据与AI', [
    ['数据采集', '数据采集、爬虫或抓取。', '爬虫|数据采集|数据抓取|web scraping|crawler'],
    ['数据清洗', '清洗、转换或准备数据。', '数据清洗|data cleaning|data wrangling'],
    ['统计分析', '统计计算、统计方法或数据分析。', '统计分析|数据分析|statistical analysis|data analysis'],
    ['数据可视化', '用图表或其他图形展示数据。', '数据可视化|data visualization|charting'],
    ['模型工具', '用于训练、运行或评估机器学习及 AI 模型。', '大模型|模型训练|机器学习|llm|machine learning|model evaluation']
  ]],
  ['design', '设计创作', [
    ['界面设计', '用户界面、交互或网站设计。', '界面设计|ui design|ux design|web design', 'mobbin.com|figma.com'],
    ['字体配色', '字体、调色板和配色参考。', '字体|配色|调色板|font|typography|color palette', 'fonts.google.com|coolors.co'],
    ['图片素材', '供创作使用的图片素材。', '图片素材|stock images|stock photos', 'unsplash.com|pexels.com'],
    ['摄影参考', '摄影技巧、作品或摄影参考。', '摄影|photography'],
    ['音视频处理', '音频或视频的编辑、转换等处理。', '剪辑|视频转码|音频编辑|video editing|audio editing|transcode'],
    ['图片处理', '压缩、抠图、调整尺寸、格式转换等图片处理工具。', '图片压缩|抠图|去背景|图片处理|图片编辑|image compression|remove background|image editor|photo editor'],
    ['3D设计', '三维建模、渲染或 3D 场景设计。', '3D建模|三维建模|3D设计|3d modeling|3d design|3d rendering']
  ]],
  ['writing', '写作阅读', [
    ['写作工具', '直接支持写作、校对或文字编辑的工具。', '写作工具|writing tool|grammar checker'],
    ['内容编辑', '内容编辑方法或编辑工具。', '内容编辑|排版|content editing|text editor'],
    ['新闻资讯', '新闻、资讯或新闻来源。', '新闻|资讯|news'],
    ['长文阅读', '长篇文章、深度报道或长文阅读工具。', '长文|深度报道|longform'],
    ['电子书', '电子书、电子书目录或阅读工具。', '电子书|ebook|e-book']
  ]],
  ['office', '办公协作', [
    ['文档表格', '文档、电子表格和相关工具。', '电子表格|文档协作|spreadsheet', 'docs.google.com'],
    ['演示制作', '制作演示文稿、幻灯片。', '演示文稿|幻灯片|slides|presentation'],
    ['项目管理', '项目规划、任务跟踪和项目管理。', '项目管理|project management|task management', 'trello.com|asana.com'],
    ['团队协作', '团队沟通、协作或共享工作。', '团队协作|team collaboration', 'slack.com'],
    ['流程自动化', '自动执行工作流程或连接多个应用。', '流程自动化|workflow automation', 'zapier.com|make.com|n8n.io'],
    ['翻译', '文字、文档或网页翻译工具。', '翻译|在线翻译|translator'],
    ['PDF工具', '转换、合并、压缩或编辑 PDF 文件的工具。', 'PDF转换|PDF转Word|PDF编辑|PDF合并|PDF压缩|pdf converter|pdf editor|merge pdf|compress pdf'],
    ['网盘', '云端存储与文件分享服务。', '网盘|云盘|云存储|cloud storage'],
    ['视频会议', '在线会议与视频通话工具。', '视频会议|在线会议|video conferencing|online meeting']
  ]],
  ['business', '商业运营', [
    ['市场研究', '市场、行业、竞品或用户研究。', '市场研究|行业研究|竞品分析|market research|competitive analysis'],
    ['产品管理', '产品规划、需求、路线图或产品管理。', '产品管理|需求管理|product management|product roadmap'],
    ['营销推广', '营销、推广、传播或增长。', '营销|推广|marketing|growth marketing'],
    ['客户管理', '客户关系、客户信息和销售管理。', '客户管理|客户关系|crm|customer relationship'],
    ['电商运营', '电商商店管理与运营。', '电商运营|电商|ecommerce|e-commerce'],
    ['社交媒体', '社交网络与内容社区平台。', '社交媒体|社交平台|social media|social network'],
    ['建站', '搭建网站、独立站或购买域名与托管的工具。', '建站|网站搭建|独立站|website builder|domain registration|web hosting'],
    ['企业查询', '查询企业工商、信用或股权信息。', '企业查询|企业信用|工商信息|business registry'],
    ['产品发现', '发现新产品、新工具的榜单或导航。', '产品发现|工具导航|product discovery|tool directory']
  ]],
  ['global', '出海跨境', [
    ['海外获客', '明确用于海外市场的获客或国际市场营销，英文网页本身不是依据。', '海外获客|出海营销|international marketing|global acquisition'],
    ['搜索优化', '搜索引擎优化；用途不限于出海。', '搜索优化|搜索引擎优化|seo|search engine optimization'],
    ['广告投放', '广告投放平台、管理或投放方法。', '广告投放|paid advertising|ads manager'],
    ['跨境收款', '明确支持跨境、国际或多币种收款。', '跨境收款|国际收款|cross-border payments|international payments'],
    ['内容本地化', '面向不同语言和地区的内容本地化。', '本地化|localization|localisation|internationalization'],
    ['跨境电商', '跨境或国际电商。', '跨境电商|cross-border ecommerce|cross-border e-commerce']
  ]],
  ['career', '求职职业', [
    ['招聘信息', '招聘职位或招聘信息。', '招聘|招聘职位|job vacancy|job openings'],
    ['简历作品', '简历或求职作品集的制作及参考。', '简历|求职作品集|resume|curriculum vitae'],
    ['面试准备', '面试准备、练习或面试资料。', '面试|interview preparation'],
    ['职业技能', '职业相关技能、资格与成长资料。', '职业技能|职业发展|career development']
  ]],
  ['finance', '个人理财', [
    ['财经资讯', '经济、金融或财经资讯。', '财经|金融资讯|financial news'],
    ['财务工具', '记账、会计、财务计算等工具。', '记账|财务工具|accounting|bookkeeping'],
    ['预算管理', '预算制定、跟踪或管理。', '预算|budgeting|budget management'],
    ['投资资料', '投资相关的资料、数据或研究。', '投资|investment|investing']
  ]],
  ['legal', '法律政务', [
    ['政策法规', '政策、法律和法规文本或解读。', '政策|法规|法律|legislation|regulation'],
    ['合同参考', '合同样例、合同条款参考或合同工具。', '合同|contract template'],
    ['办事指南', '政务和生活办事的流程指南。', '办事指南|办理流程'],
    ['公共服务', '政府或公共机构提供的服务。', '公共服务|政务服务|public service']
  ]],
  ['shopping', '购物消费', [
    ['商品对比', '商品比较、评测或购物比较工具。', '商品对比|商品评测|product comparison|product review'],
    ['购物清单', '购物清单或采购规划工具。', '购物清单|shopping list'],
    ['优惠信息', '优惠、折扣或优惠券信息。', '优惠|折扣|优惠券|coupon|discount'],
    ['售后资料', '售后、保修、维修和使用支持。', '售后|保修|warranty|after-sales']
  ]],
  ['travel', '旅行出行', [
    ['行程攻略', '旅行攻略、行程规划或旅行指南。', '旅行攻略|行程|travel guide|itinerary'],
    ['地图交通', '地图、路线和交通信息。', '地图|交通|路线|maps|transit'],
    ['住宿餐饮', '酒店、住宿、餐厅和餐饮资料。', '酒店|住宿|餐厅|hotel|accommodation|restaurant'],
    ['目的地资料', '旅行目的地的介绍与资料。', '目的地|景点|destination|attractions']
  ]],
  ['home-health', '健康家庭', [
    ['健身训练', '健身、运动或训练方案。', '健身|训练计划|fitness|workout'],
    ['饮食食谱', '食谱、烹饪或饮食资料。', '食谱|烹饪|recipe|cooking'],
    ['健康科普', '健康和医学知识资料，不表示已验证其可靠性。', '健康科普|医学科普|health education'],
    ['育儿教育', '育儿和家庭教育。', '育儿|家庭教育|parenting'],
    ['居家装修', '居家装修、家装和家居参考。', '装修|家装|家居|home renovation|interior design']
  ]],
  ['hobby', '兴趣娱乐', [
    ['影音书单', '电影、影视和书籍推荐清单。', '书单|片单|电影推荐|reading list|watchlist'],
    ['游戏攻略', '游戏攻略或游戏玩法资料。', '游戏攻略|game walkthrough'],
    ['音乐收藏', '音乐、专辑、歌单或音乐资源。', '音乐|歌单|music|playlist'],
    ['手工园艺', '手工制作、园艺和相关教程。', '手工|园艺|craft|gardening'],
    ['社群活动', '社群、兴趣活动和活动资料。', '社群活动|兴趣活动|community event']
  ]],
  ['invest', '投资研究', [
    ['财经资讯', '经济、金融市场与公司新闻。', '财经|财经新闻|金融资讯|financial news|market news'],
    ['投资资料', '投资研究相关的资料、数据或分析。', '投资研究|投资分析|价值投资|investment research'],
    ['行情数据', '股票、期货、外汇等实时或历史行情与图表。', '行情|股票行情|实时行情|K线|stock quotes|market data|stock chart'],
    ['财报公告', '上市公司财报、公告与监管披露文件。', '财报|年报|季报|上市公司公告|信息披露|annual report|earnings|sec filing'],
    ['研报', '券商或机构发布的研究报告。', '研报|研究报告|券商研报|行业研报|equity research'],
    ['宏观数据', '宏观经济指标、利率、通胀等数据与分析。', '宏观经济|宏观数据|经济数据|CPI|GDP|macroeconomic|economic data'],
    ['基金', '公募、私募、ETF 等基金数据与资讯。', '基金|ETF|公募基金|私募基金|mutual fund'],
    ['券商', '证券经纪商与交易平台。', '券商|证券开户|证券交易|brokerage|online broker'],
    ['量化回测', '量化投资、策略回测与量化数据平台。', '量化投资|量化交易|回测|backtest|backtesting|algorithmic trading'],
    ['加密资产', '加密货币、区块链资产与链上数据。', '加密货币|比特币|以太坊|区块链|cryptocurrency|bitcoin|ethereum|blockchain|defi']
  ]]
];
// 维护约定：Jev 判断按「标签包 id:标签序号」保存，内置包只能在末尾追加标签，不要调整顺序或删除，否则已有判断会错位。

// 生活类场景暂不作为目标，默认不启用，用户可在标签包管理中自行打开。
export const LIFE_PACK_IDS = new Set(['shopping', 'travel', 'home-health', 'hobby', 'finance']);

export const DEFAULT_TAG_PACKS: TagPack[] = seeds.map(([id, name, rows], order) => ({
  id, name, tags: definitions(rows), enabled: !LIFE_PACK_IDS.has(id), order, updatedAt: 1
}));

// 用户没编辑过的内置标签包（updatedAt 仍为初始值）直接使用代码中的最新定义，改进随插件更新生效；
// 数据库里只保留启用状态和排序。编辑过的包按用户保存的内容为准。
const BUILT_IN = new Map(DEFAULT_TAG_PACKS.map(pack => [pack.id, pack]));
export function resolveTagPacks(stored: TagPack[]): TagPack[] {
  return stored.map(pack => {
    const builtIn = BUILT_IN.get(pack.id);
    return builtIn && pack.updatedAt === builtIn.updatedAt ? { ...builtIn, enabled: pack.enabled, order: pack.order } : pack;
  }).sort((a, b) => a.order - b.order);
}

// 「从场景模板开始」新建收藏集时预填的内容：自动收录带该包任一标签的收藏。
export function collectionFromTemplate(pack: TagPack): Pick<Collection, 'name' | 'description' | 'keywords' | 'tagLabels' | 'packIds'> {
  const global = pack.id === 'global';
  return {
    name: pack.name,
    description: global
      ? '面向海外用户的产品开发、获客、营销、跨境收款、本地化或跨境电商工具与资料。普通英文工具和仅面向本地市场的营销内容不自动算作出海资源。'
      : `用于${pack.name}的工具与资料，内容需明确涉及：${pack.tags.map(t => t.label).join('、')}。`,
    keywords: global ? ['出海', '跨境', '海外获客', 'international payments', 'localization'] : [],
    tagLabels: pack.tags.map(t => t.label),
    packIds: [pack.id]
  };
}

export const DEFAULT_COLLECTIONS: Collection[] = [
  ['tool', '工具'], ['repo', '代码仓库'], ['inspiration', '灵感'], ['article', '资料'], ['private', '私密'], ['other', '未分类']
].map(([type, name], order) => ({
  id: `type-${type}`, name, description: '', keywords: [], assetType: type as Collection['assetType'], packIds: [], order, updatedAt: 1
}));
