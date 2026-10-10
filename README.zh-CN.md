[English](README.md) | 简体中文

# 🔖 Kitlane

> **记不住名字，也能找到你收藏过的工具。**

[English](README.en.md) · [MIT](LICENSE) · Chrome / Edge 侧边栏扩展 · 中英双语 🌏

<!-- TODO 放一张侧边栏截图或演示动图 docs/images/demo.gif -->

你的收藏夹里，是不是也躺着几百个链接？

存的时候觉得，这个以后肯定用得上。真到用的时候，想不起来叫什么了。。。

翻了几分钟，又要重新搜一遍，找到的还不对。

对于不喜欢整理的懒人来说，这事太烦了 😮‍💨

我是个懒人，能不动手就不动……

不用整理的收藏夹，也不动你的文件夹，Kitlane 只是读一遍你已有的收藏，按用途打好标签。你说一句「把图片弄小的网站」，它把那一个翻出来 🎯

<p align="center">
  <img src="assets/kitlane-demo-preview.gif" alt="Kitlane 侧边栏演示" width="300" />
</p>

## 🔍 先试试

下面全是纯本地搜出来的，没用模型，也没填 Key 👇

| 你说 | 它翻出来的 |
|---|---|
| 找 skill | SkillsMP、anthropics/skills、skills.sh、Smithery 🧩 |
| 系统设计面试资料 | LeetCode、coding-interview-university、system-design-primer 💻 |
| 查英文论文 | arXiv、SSRN 📄 |
| 看财报 | 港交所披露易、深交所、巨潮资讯、SEC EDGAR 📈 |
| 量化回测平台 | 米筐、Portfolio Visualizer、聚宽、QuantConnect 🧮 |
| 宏观经济数据 | FRED、金十、世界银行、国家统计局 🌍 |
| 网页设计灵感 | Dribbble、Behance、Awwwards、Godly 🎨 |
| 做 PPT 的 AI 工具 | AiPPT、iSlide、Gamma 📊 |
| 海外收款 | PingPong、连连国际、Payoneer、Wise 💸 |

（样本是 480 条收藏，我自己攒的，所以别太当真，后面会说）

想再准一点，点「智能搜索」，让你自己配的大模型帮着重新排个序。

## 🧰 它能干嘛

- 🆓 **没 Key 也能分类**　导入直接分好，靠 920 多个常见网站、网址特征、你的文件夹名和网页简介，不调模型就能搞定
- 🗣️ **按任务找**　直接搜，说「抠图」找得到图片处理，说「财报」找得到财报公告
- 🏷️ **收藏集跟着标签走**　标签越准，收藏集越准；新建收藏集还会按名字帮你推荐标签
- 🤖 **模型自己带，可选**　兼容 OpenAI 的接口都行，云端、Ollama、LM Studio 都能接，决策模型 Jev 表现不错
- 🔒 **私密的只留在本机**　公司内部系统、在线文档、账号后台、网盘分享、邀请与分享链接、带密钥或凭证的链接、成人内容，不发给模型，也不去抓

## 📊 到底准不准

不配任何模型时，未能分类的收藏占比（越低越好）。

| 收藏来源 | 以前 | 现在 |
|---|---|---|
| 作者的收藏（57 条） | 78% | **32%** |
| Hacker News 与 Lobsters 高赞链接（405 条） | 75% | **45%**，读完网页简介后 **29%** |

搜索这边，61 个中文口语问法，480 条样本收藏，正确结果落在本地前 30 条的有 **97%**，落在前 5 条的有 **92%** 🎉

说实话，这些数字有水分。

我自己的收藏只有 57 条，搜索测试的样本和问法也是我自己写的，所以偏乐观，只能拿来比改动前后。真实用户的数据，我手上还很缺。你要是愿意给一份匿名的汇总统计，欢迎提 Issue 🙏

## 🆚 哪里不一样

插件市场里的 AI 书签插件已经二十多个了。多数主打一键整理成文件夹，而且得先填 API Key，不填就是个摆设。Kitlane 想的不太一样。

| | 多数 AI 书签插件 | Kitlane |
|---|---|---|
| 干什么 | 把书签整理成文件夹 | 按任务找回，你的文件夹不动 |
| 没 Key 能用吗 | 通常不能 | 能，分类和搜索都在本地 |
| 私密内容 | 多半要手动排除 | 自动识别，只在本机处理 |

## 📦 安装

还没上架商店，先自己构建一下，要 Node.js 20 以上，不难 🙂

```bash
git clone https://github.com/Tolson64/Kitlane-extension.git
cd Kitlane-extension
npm ci
npm run build          # Chrome 输出到 .output/chrome-mv3
npm run build:edge     # Edge 输出到 .output/edge-mv3
```

然后打开 `chrome://extensions`（Edge 是 `edge://extensions`），用「开发者模式」就能体验。

## 🚀 用起来

1. 点工具栏上的 Kitlane 图标，打开侧边栏
2. 点右上角的刷新图标，导入收藏夹
3. 在搜索框里直接搜
4. 想用智能搜索，点齿轮，选模型，填地址和 Key，勾上「允许模型分析公开收藏」。界面语言也在这里换 ⚙️

## 🔒 隐私

毕竟收藏夹是私人禁地。

- 收藏库、标签、备忘，都存在你浏览器本地。导出的 JSON 不带 API Key
- 不开模型，就不会有任何东西发给第三方
- 开了模型，发的是你的搜索描述，加上公开收藏的标题、去掉参数的网址路径、收藏夹名和网页简介。备忘、自定义标题、私密收藏，一律不发
- 读网页简介要你逐个网站授权，不会一次要所有网站的权限，也不带登录信息

[技术说明](docs/technical-notes.zh.md)里写得更细 📖

## 🚧 等待你的建议

坦率的讲，草草手搓，还差得远。

- ☁️ 没有云同步，也没有导入 JSON，换电脑得重新导入，手动改过的标签带不走
- 🌐 只支持 Chrome 和 Edge，Safari 暂时不行
- 🔑 API Key 是明文存在浏览器本地数据库里的，扩展里很常见，但你得知道
- 🧠 智能搜索懂不懂中文俗语，看你选的模型，我还没系统比较过
- ✍️ 没有网页简介的个人博客，不配模型时可能还是分不出来

## 🤝 参与

发现问题，或者有想法，欢迎提 [Issue](https://github.com/Tolson64/Kitlane-extension/issues)，也欢迎 Pull Request 💌

想聊聊、合作，或者有不方便公开说的反馈，可以发邮件 📮 **465260295@qq.com**

<!-- TODO 👋 关于作者，等小红书账号 -->

## 📄 许可证

[MIT](LICENSE)　更新记录见 [CHANGELOG](CHANGELOG.md)

## 👋 关注作者 / Follow me

欢迎在小红书关注「Tolson在叭叭」，分享 AI × 医疗 和小工具。

<p align="center">
  <img src="assets/xiaohongshu-qr.jpg" alt="Tolson在叭叭 的小红书名片" width="280" />
</p>
