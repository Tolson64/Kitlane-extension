import type { AssetType } from '../types/domain';

// 常见网站知识库：无需模型、导入即可判断资源类型与标签。
// 每行：[类型（'' 表示不指定）, 标签（逗号分隔，须与标签包中的标签名一致；未启用或不存在的标签自动忽略）, 网站（空格分隔）]
// 网站写主机名（不含 www.），匹配该主机及其子域名；写成「主机/路径前缀」时只匹配该路径下的页面。
// 只收录用途明确的网站；账号后台、私人文档等由 isPrivateUrl 先行拦截，不在这里。
type Group = [AssetType | '', string, string];

const GROUPS: Group[] = [
  // —— 开发 ——
  ['article', '文档,技术文档', 'developer.mozilla.org react.dev vuejs.org cn.vuejs.org angular.dev svelte.dev nextjs.org nuxt.com vitejs.dev vite.dev tailwindcss.com typescriptlang.org docs.python.org nodejs.org deno.com bun.sh go.dev rust-lang.org doc.rust-lang.org kotlinlang.org swift.org developer.apple.com developer.android.com learn.microsoft.com kubernetes.io docs.docker.com redis.io postgresql.org dev.mysql.com sqlite.org graphql.org webpack.js.org eslint.org prettier.io jestjs.io vitest.dev playwright.dev storybook.js.org electronjs.org tauri.app wxt.dev developer.chrome.com web.dev expressjs.com nestjs.com fastapi.tiangolo.com djangoproject.com flask.palletsprojects.com spring.io laravel.com rubyonrails.org pytorch.org tensorflow.org scikit-learn.org pandas.pydata.org numpy.org docs.anthropic.com docs.claude.com platform.openai.com/docs ui.shadcn.com mui.com ant.design element-plus.org chakra-ui.com radix-ui.com motion.dev threejs.org d3js.org echarts.apache.org pyecharts.org git-scm.com devdocs.io'],
  ['article', '教程', 'runoob.com w3schools.com javascript.info liaoxuefeng.com theodinproject.com digitalocean.com/community missing.csail.mit.edu learngitbranching.js.org sqlzoo.net'],
  ['article', '教程,职业技能', 'roadmap.sh'],
  ['article', '在线课程,教程', 'freecodecamp.org codecademy.com'],
  ['tool', '教材题库,面试准备', 'leetcode.com leetcode.cn nowcoder.com hackerrank.com codewars.com'],
  ['tool', '在线工具', 'regex101.com carbon.now.sh ray.so excalidraw.com tldraw.com mermaid.live dbdiagram.io transform.tools bundlephobia.com codesandbox.io stackblitz.com codepen.io jsfiddle.net replit.com json.cn crontab.guru explainshell.com diffchecker.com tool.lu'],
  ['tool', '在线工具,数据可视化', 'jsoncrack.com'],
  ['tool', '在线工具,技术文档', 'caniuse.com'],
  ['tool', '在线工具,接口调试', 'postman.com hoppscotch.io insomnia.rest apifox.com apipost.cn swagger.io'],
  ['tool', '测试部署', 'vercel.com netlify.com render.com railway.app fly.io heroku.com supabase.com firebase.google.com docker.com hub.docker.com circleci.com jenkins.io aliyun.com cloud.tencent.com aws.amazon.com cloud.google.com azure.microsoft.com digitalocean.com linode.com vultr.com'],
  ['tool', '测试部署,运维安全', 'cloudflare.com'],
  ['tool', '运维安全', 'sentry.io datadoghq.com newrelic.com prometheus.io elastic.co pagerduty.com uptimerobot.com jwt.io ssllabs.com letsencrypt.org owasp.org virustotal.com haveibeenpwned.com 1password.com bitwarden.com'],
  ['tool', '运维安全,数据可视化', 'grafana.com'],
  ['other', '开源项目,技术文档', 'npmjs.com pypi.org crates.io pkg.go.dev packagist.org rubygems.org mvnrepository.com nuget.org'],
  ['tool', '开源项目', 'jsdelivr.com unpkg.com cdnjs.com'],
  ['tool', '', 'code.visualstudio.com jetbrains.com sublimetext.com neovim.io iterm2.com warp.dev'],
  ['tool', 'AI编程', 'cursor.com windsurf.com codeium.com v0.dev v0.app bolt.new lovable.dev trae.ai trae.cn marscode.cn github.com/features/copilot'],
  ['tool', '模型工具', 'openrouter.ai replicate.com together.ai groq.com modelscope.cn ollama.com lmstudio.ai wandb.ai langchain.com llamaindex.ai dify.ai coze.cn coze.com fireworks.ai aistudio.google.com platform.deepseek.com open.bigmodel.cn bigmodel.cn'],
  ['tool', '模型工具,统计分析', 'colab.research.google.com'],
  ['article', '文章,技术社区', 'juejin.cn csdn.net cnblogs.com segmentfault.com oschina.net dev.to hashnode.com'],
  ['article', '新闻资讯,文章', 'infoq.cn'],
  ['other', '技术社区', 'v2ex.com linux.do lobste.rs ruby-china.org learnku.com'],
  ['other', '技术社区,新闻资讯', 'news.ycombinator.com'],
  ['tool', '项目管理', 'linear.app atlassian.com/software/jira trello.com asana.com monday.com clickup.com teambition.com tapd.cn worktile.com pingcode.com basecamp.com plane.so'],

  // —— 设计与内容创作 ——
  ['tool', '界面设计', 'figma.com js.design mastergo.com sketch.com rive.app protopie.io axure.com modao.cc pixso.cn zeplin.io lanhuapp.com penpot.app'],
  ['tool', '界面设计,建站', 'framer.com webflow.com'],
  ['inspiration', '模板,界面设计', 'figma.com/community'],
  ['inspiration', '界面设计', 'dribbble.com behance.net awwwards.com godly.website mobbin.com land-book.com lapa.ninja siteinspire.com onepagelove.com saaslandingpage.com uiverse.io zcool.com.cn ui.cn cssdesignawards.com screenlane.com pageflows.com'],
  ['article', '界面设计,文档', 'm3.material.io developer.apple.com/design'],
  ['article', '界面设计,文章', 'nngroup.com uxdesign.cc smashingmagazine.com uxplanet.org'],
  ['article', '界面设计', 'lawsofux.com'],
  ['inspiration', '图片素材,素材', 'unsplash.com pexels.com pixabay.com freepik.com shutterstock.com vcg.com stock.adobe.com istockphoto.com colorhub.me 699pic.com ibaotu.com nipic.com'],
  ['inspiration', '图片素材,摄影参考', 'gettyimages.com'],
  ['inspiration', '图片素材', 'pinterest.com huaban.com'],
  ['inspiration', '素材,模板', 'elements.envato.com creativemarket.com ui8.net 58pic.com'],
  ['tool', '素材', 'iconfont.cn flaticon.com lucide.dev iconify.design icons8.com fontawesome.com heroicons.com remixicon.com lottiefiles.com svgrepo.com undraw.co storyset.com epidemicsound.com artlist.io freesound.org'],
  ['tool', '字体配色', 'fonts.google.com 100font.com fontsquirrel.com dafont.com fonts.adobe.com coolors.co colorhunt.co color.adobe.com uigradients.com'],
  ['inspiration', '字体配色', 'fontsinuse.com typewolf.com'],
  ['inspiration', '摄影参考', '500px.com magnumphotos.com flickr.com tuchong.com'],
  ['tool', '在线工具,图片处理', 'remove.bg photopea.com squoosh.app tinypng.com tinyjpg.com iloveimg.com pixlr.com cleanup.pictures bigjpg.com clipdrop.co'],
  ['tool', '在线工具,模板', 'canva.com canva.cn gaoding.com chuangkit.com tuguaishou.com'],
  ['tool', '3D设计', 'spline.design blender.org sketchfab.com'],
  ['tool', 'AI绘图', 'midjourney.com leonardo.ai ideogram.ai krea.ai recraft.ai firefly.adobe.com jimeng.jianying.com'],
  ['tool', 'AI绘图,模型工具', 'liblib.art civitai.com'],
  ['tool', 'AI视频,音视频处理', 'runwayml.com klingai.com pika.art hailuoai.com heygen.com synthesia.io lumalabs.ai vidu.cn'],
  ['tool', '音视频处理', 'capcut.cn capcut.com descript.com suno.com elevenlabs.io audacityteam.org handbrake.fr obsproject.com kapwing.com veed.io clipchamp.com'],
  ['other', '视频', 'youtube.com youtu.be bilibili.com vimeo.com ixigua.com youku.com iqiyi.com'],
  ['other', '视频,社交媒体', 'douyin.com tiktok.com kuaishou.com'],
  ['other', '社交媒体', 'x.com twitter.com weibo.com xiaohongshu.com instagram.com facebook.com threads.net reddit.com okjike.com bsky.app'],
  ['other', '招聘信息,职业技能,社交媒体', 'linkedin.com'],
  ['tool', '内容编辑', 'xiumi.us 135editor.com 96weixin.com'],
  ['tool', '内容编辑,写作工具', 'mdnice.com'],
  ['tool', '写作工具', 'grammarly.com hemingwayapp.com languagetool.org wordtune.com'],
  ['tool', '写作工具,学术写作', 'quillbot.com'],
  ['tool', '翻译', 'deepl.com translate.google.com fanyi.baidu.com fanyi.youdao.com fanyi.qq.com immersivetranslate.com bing.com/translator'],
  ['tool', 'AI助手', 'chatgpt.com chat.openai.com claude.ai gemini.google.com kimi.com kimi.moonshot.cn doubao.com yiyan.baidu.com tongyi.aliyun.com qianwen.com chat.deepseek.com perplexity.ai metaso.cn poe.com copilot.microsoft.com yuanbao.tencent.com chatglm.cn grok.com genspark.ai manus.im'],
  ['tool', 'AI助手,知识笔记', 'notebooklm.google.com'],
  ['tool', 'AI写作', 'jasper.ai writesonic.com xiezuocat.com'],
  ['tool', 'AI写作,营销推广', 'copy.ai'],
  ['article', '文章,长文阅读', 'sspai.com'],
  ['article', '文章', 'zhihu.com medium.com ruanyifeng.com'],
  ['article', '新闻资讯', '36kr.com ifanr.com geekpark.net leiphone.com jiqizhixin.com qbitai.com tmtpost.com techcrunch.com theverge.com arstechnica.com wired.com engadget.com thepaper.cn news.qq.com people.com.cn xinhuanet.com bbc.com nytimes.com theguardian.com cnn.com apnews.com zaobao.com'],
  ['article', '新闻资讯,长文阅读', 'huxiu.com'],
  ['other', '新闻资讯', '163.com sina.com.cn sohu.com'],
  ['other', '产品发现', 'producthunt.com alternativeto.net theresanaiforthat.com futurepedia.io ai-bot.cn toolify.ai betalist.com'],

  // —— 科研与学习 ——
  ['tool', '文献检索', 'scholar.google.com xueshu.baidu.com cnki.net wanfangdata.com.cn cqvip.com semanticscholar.org pubmed.ncbi.nlm.nih.gov webofscience.com scopus.com ieeexplore.ieee.org dl.acm.org jstor.org sciencedirect.com link.springer.com onlinelibrary.wiley.com tandfonline.com cambridge.org/core academic.oup.com aminer.cn ablesci.com connectedpapers.com scite.ai researchrabbit.ai base-search.net core.ac.uk lens.org'],
  ['tool', '文献检索,AI助手', 'elicit.com consensus.app'],
  ['tool', '文献检索,论文阅读', 'papers.ssrn.com ssrn.com'],
  ['article', '论文阅读', 'arxiv.org biorxiv.org medrxiv.org chemrxiv.org nature.com science.org cell.com pnas.org plos.org nejm.org thelancet.com huggingface.co/papers alphaxiv.org papers.cool'],
  ['other', '论文阅读,投稿资源', 'openreview.net'],
  ['other', '论文阅读', 'researchgate.net'],
  ['tool', '学术写作', 'zotero.org mendeley.com endnote.com overleaf.com'],
  ['article', '学术写作', 'latex-project.org'],
  ['article', '学术写作,教程,文档', 'overleaf.com/learn'],
  ['tool', '投稿资源', 'letpub.com.cn mjl.clarivate.com wikicfp.com'],
  ['article', '投稿资源', 'elsevier.com/researcher springer.com/gp/authors-editors'],
  ['tool', '数据集,在线课程', 'kaggle.com'],
  ['other', '数据集', 'kaggle.com/datasets archive.ics.uci.edu data.gov zenodo.org figshare.com datadryad.org ncbi.nlm.nih.gov/geo ebi.ac.uk tianchi.aliyun.com'],
  ['other', '数据集,数据可视化', 'ourworldindata.org'],
  ['other', '数据集,市场研究', 'statista.com'],
  ['tool', '统计分析', 'r-project.org posit.co rstudio.com jupyter.org ibm.com/spss stata.com minitab.com jamovi.org jasp-stats.org spsspro.com'],
  ['tool', '统计分析,数据可视化', 'graphpad.com'],
  ['tool', '数据可视化', 'originlab.com flourish.studio datawrapper.de tableau.com observablehq.com plotly.com'],
  ['tool', '实验工具', 'benchling.com labarchives.com addgene.org snapgene.com'],
  ['other', '实验工具,研究方法', 'protocols.io'],
  ['tool', '问卷调查', 'qualtrics.com surveymonkey.com wj.qq.com jinshuju.net typeform.com'],
  ['tool', '在线工具,问卷调查', 'wjx.cn'],
  ['tool', '在线工具', 'wolframalpha.com desmos.com geogebra.org symbolab.com mathway.com biorender.com'],
  ['other', '在线课程', 'coursera.org edx.org udemy.com udacity.com icourse163.org xuetangx.com ocw.mit.edu khanacademy.org imooc.com geekbang.org study.163.com datacamp.com deeplearning.ai'],
  ['tool', '语言学习', 'duolingo.com shanbay.com dictionary.cambridge.org merriam-webster.com oxfordlearnersdictionaries.com memrise.com baicizhan.com eudic.net'],
  ['tool', '语言学习,翻译', 'youdao.com'],
  ['tool', '语言学习,考试备考', 'ankiweb.net'],
  ['tool', '教材题库,语言学习', 'quizlet.com'],
  ['article', '语言学习', 'bbc.co.uk/learningenglish'],
  ['other', '考试备考', 'ielts.org ets.org neea.edu.cn kaoyan.com'],
  ['other', '考试备考,公共服务', 'yz.chsi.com.cn'],
  ['other', '公共服务', 'chsi.com.cn 12333.gov.cn'],
  ['article', '百科', 'wikipedia.org baike.baidu.com britannica.com'],
  ['other', '电子书', 'gutenberg.org openlibrary.org'],
  ['tool', '电子书', 'weread.qq.com'],
  ['tool', '知识笔记', 'notion.so notion.com obsidian.md logseq.com evernote.com yinxiang.com flomoapp.com wolai.com craft.do goodnotes.com xmind.cn xmind.app mubu.com heptabase.com'],
  ['tool', '知识笔记,文档表格', 'yuque.com'],

  // —— 运营与出海电商 ——
  ['tool', '跨境电商,电商运营,建站', 'shopify.com shopline.com shoplazza.com bigcommerce.com'],
  ['other', '电商运营', 'apps.shopify.com 1688.com'],
  ['other', '跨境电商', 'sell.amazon.com alibaba.com globalsources.com made-in-china.com shopee.cn amz123.com'],
  ['tool', '跨境电商,市场研究', 'junglescout.com helium10.com sellersprite.com keepa.com'],
  ['tool', '电商运营,市场研究', 'kalodata.com fastmoss.com chanmama.com feigua.cn newrank.cn huitun.com'],
  ['tool', '市场研究', 'qian-gua.com trends.google.com similarweb.com index.baidu.com brandwatch.com cbinsights.com crunchbase.com sensortower.com qimai.cn itjuzi.com iresearch.cn 199it.com'],
  ['tool', '电商运营,跨境电商', 'dianxiaomi.com'],
  ['tool', '电商运营', 'mabangerp.com 91miaoshou.com tongtool.com lingxing.com jushuitan.com'],
  ['tool', '跨境电商', '17track.net'],
  ['tool', '跨境收款', 'pingpongx.com lianlianpay.com lianlianglobal.com payoneer.com wise.com stripe.com paypal.com airwallex.com worldfirst.com xtransfer.cn'],
  ['tool', '搜索优化,市场研究', 'semrush.com'],
  ['tool', '搜索优化', 'ahrefs.com moz.com seranking.com screamingfrog.co.uk 5118.com aizhan.com'],
  ['article', '搜索优化,文章', 'backlinko.com searchengineland.com'],
  ['article', '搜索优化,文档', 'developers.google.com/search'],
  ['tool', '广告投放', 'ads.google.com ads.tiktok.com business.tiktok.com oceanengine.com e.qq.com ads.microsoft.com'],
  ['tool', '统计分析,产品管理', 'mixpanel.com amplitude.com hotjar.com posthog.com heap.io'],
  ['tool', '统计分析', 'sensorsdata.cn growingio.com umami.is plausible.io'],
  ['tool', '客户管理,营销推广', 'hubspot.com mailchimp.com brevo.com klaviyo.com'],
  ['article', '营销推广,文章', 'blog.hubspot.com'],
  ['tool', '客户管理', 'salesforce.com zendesk.com intercom.com freshworks.com pipedrive.com fxiaoke.com'],
  ['tool', '营销推广,社交媒体', 'hootsuite.com buffer.com later.com sproutsocial.com metricool.com'],
  ['tool', '营销推广', 'linktr.ee'],
  ['tool', '营销推广,市场研究', 'meltwater.com'],
  ['article', '营销推广', 'digitaling.com topys.cn adweek.com'],
  ['article', '营销推广,文章', 'niaogebiji.com'],
  ['article', '营销推广,新闻资讯', 'socialmediatoday.com'],
  ['article', '产品管理,文章', 'woshipm.com'],
  ['article', '跨境电商,新闻资讯', 'cifnews.com ennews.com ebrun.com'],
  ['tool', '内容本地化', 'crowdin.com lokalise.com weglot.com phrase.com transifex.com smartling.com'],
  ['tool', '建站', 'wordpress.org wordpress.com wix.com squarespace.com namecheap.com godaddy.com hostinger.com carrd.co strikingly.com'],

  // —— 办公 ——
  ['tool', '文档表格', 'microsoft365.com office.com wps.cn kdocs.cn docs.google.com airtable.com smartsheet.com'],
  ['tool', '文档表格,团队协作', 'docs.qq.com shimo.im feishu.cn larksuite.com'],
  ['tool', '团队协作', 'dingtalk.com work.weixin.qq.com slack.com miro.com boardmix.cn calendly.com'],
  ['tool', '视频会议,团队协作', 'meeting.tencent.com zoom.us meet.google.com voovmeeting.com webex.com'],
  ['tool', '演示制作', 'gamma.app aippt.cn beautiful.ai pitch.com tome.app'],
  ['tool', '演示制作,模板', 'islide.cc officeplus.cn slidesgo.com'],
  ['tool', '在线工具,PDF工具', 'ilovepdf.com smallpdf.com pdf24.org sejda.com pdf2go.com xodo.com adobe.com/acrobat'],
  ['tool', '在线工具', 'convertio.co cloudconvert.com wetransfer.com processon.com diagrams.net draw.io zamzar.com online-convert.com'],
  ['tool', '网盘', 'pan.baidu.com alipan.com aliyundrive.com dropbox.com icloud.com onedrive.live.com jianguoyun.com 123pan.com quark.cn weiyun.com box.com'],
  ['tool', '流程自动化', 'zapier.com make.com n8n.io ifttt.com yingdao.com jijyun.cn'],
  ['tool', '流程自动化,文档表格', 'jiandaoyun.com'],
  ['other', '', 'baidu.com google.com bing.com sogou.com so.com duckduckgo.com'],
  ['article', '政策法规,新闻资讯', 'gov.cn'],
  ['other', '办事指南,公共服务', 'chinatax.gov.cn'],
  ['tool', '公共服务,企业查询', 'gsxt.gov.cn'],
  ['tool', '企业查询,市场研究', 'qcc.com tianyancha.com aiqicha.baidu.com qixin.com'],
  ['other', '招聘信息', 'zhipin.com zhaopin.com 51job.com lagou.com liepin.com indeed.com glassdoor.com maimai.cn wellfound.com'],
  ['tool', '简历作品', 'wondercv.com resume.io'],
  ['article', '教程,文档表格', 'excelhome.net exceljet.net support.microsoft.com/zh-cn/excel'],

  // —— 投资 ——
  ['article', '财经资讯', 'bloomberg.com wsj.com ft.com cnbc.com wallstreetcn.com cls.cn gelonghui.com yicai.com 21jingji.com eastmoney.com finance.sina.com.cn marketwatch.com barrons.com economist.com asia.nikkei.com stcn.com cs.com.cn'],
  ['article', '财经资讯,新闻资讯', 'reuters.com jiemian.com'],
  ['article', '财经资讯,长文阅读', 'caixin.com'],
  ['article', '财经资讯,宏观数据', 'jin10.com'],
  ['other', '财经资讯,投资资料', 'xueqiu.com'],
  ['other', '财经资讯,行情数据', 'finance.yahoo.com investing.com 10jqka.com.cn'],
  ['tool', '行情数据', 'quote.eastmoney.com stockcharts.com'],
  ['tool', '行情数据,数据可视化', 'tradingview.com finviz.com'],
  ['tool', '投资资料,行情数据', 'data.eastmoney.com iwencai.com'],
  ['other', '投资资料,财报公告', 'cninfo.com.cn'],
  ['other', '财报公告,政策法规', 'sse.com.cn szse.cn bse.cn'],
  ['other', '财报公告', 'hkexnews.hk'],
  ['tool', '财报公告', 'sec.gov/edgar'],
  ['tool', '投资资料,财报公告', 'lixinger.com stockanalysis.com'],
  ['tool', '投资资料', 'gurufocus.com simplywall.st zacks.com'],
  ['tool', '投资资料,数据可视化', 'koyfin.com'],
  ['other', '投资资料,数据可视化', 'macrotrends.net'],
  ['other', '投资资料,基金', 'fund.eastmoney.com morningstar.com jisilu.cn howbuy.com'],
  ['other', '投资资料', 'wind.com.cn chinamoney.com.cn'],
  ['article', '投资资料,文章', 'seekingalpha.com'],
  ['article', '投资资料', 'fool.com'],
  ['article', '投资资料,教程', 'investopedia.com'],
  ['article', '投资资料,长文阅读', 'berkshirehathaway.com oaktreecapital.com/insights'],
  ['other', '投资资料,统计分析,宏观数据', 'macromicro.me'],
  ['other', '数据集,宏观数据', 'fred.stlouisfed.org data.worldbank.org oecd.org tradingeconomics.com'],
  ['other', '数据集,统计分析,宏观数据', 'stats.gov.cn'],
  ['article', '投资资料,宏观数据', 'imf.org'],
  ['tool', '宏观数据', 'cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html'],
  ['other', '政策法规,宏观数据', 'pbc.gov.cn federalreserve.gov'],
  ['other', '政策法规', 'csrc.gov.cn'],
  ['other', '投资资料,研报', 'hibor.com.cn'],
  ['other', '市场研究,研报', 'fxbaogao.com'],
  ['other', '研报', 'vzkoo.com djyanbao.com'],
  ['tool', '投资资料,量化回测', 'portfoliovisualizer.com'],
  ['tool', '量化回测', 'quantconnect.com joinquant.com ricequant.com myquant.cn bigquant.com backtrader.com'],
  ['other', '数据集,行情数据', 'tushare.pro akshare.xyz'],
  ['tool', '券商', 'futunn.com itiger.com interactivebrokers.com longbridge.com schwab.com fidelity.com robinhood.com webull.com'],
  ['tool', '加密资产,行情数据', 'coingecko.com coinmarketcap.com'],
  ['tool', '加密资产', 'binance.com okx.com coinbase.com etherscan.io defillama.com dune.com bscscan.com'],
  ['tool', '加密资产,统计分析', 'glassnode.com'],
  ['other', '职业技能,考试备考', 'cfainstitute.org']
];

export interface SiteInfo { type?: AssetType; tags: string[]; }

const SITES = new Map<string, SiteInfo>();
for (const [type, tags, sites] of GROUPS) {
  for (const site of sites.split(/\s+/).filter(Boolean)) {
    const existing = SITES.get(site);
    const labels = tags.split(',').filter(Boolean);
    SITES.set(site, { type: existing?.type || type || undefined, tags: [...new Set([...(existing?.tags || []), ...labels])] });
  }
}

// 按「主机+路径前缀」最长匹配优先，再按主机、父域名逐级查找。exact 表示命中的是主机本身或其路径前缀，而不是父域名。
export function lookupSite(url: URL): (SiteInfo & { exact: boolean }) | undefined {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const path = url.pathname.toLowerCase().replace(/\/+$/, '');
  const labels = host.split('.');
  for (let i = 0; i < labels.length - 1; i++) {
    const domain = labels.slice(i).join('.');
    const segments = path.split('/').filter(Boolean);
    for (let n = segments.length; n > 0; n--) {
      const info = SITES.get(`${domain}/${segments.slice(0, n).join('/')}`);
      if (info) return { ...info, exact: i === 0 };
    }
    const info = SITES.get(domain);
    if (info) return { ...info, exact: i === 0 };
  }
  return undefined;
}
