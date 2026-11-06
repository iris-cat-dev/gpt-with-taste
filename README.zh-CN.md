<p align="right">
  <a href="README.md">English</a> · <strong>简体中文</strong>
</p>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/hero-banner-zh-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/hero-banner-zh-light.svg">
  <img alt="GPT with Taste — 敢做判断。保有审美。少些繁文礼节。" src="assets/hero-banner-zh-light.svg" width="100%">
</picture>

<p align="center">
  一套跨宿主、即装即用的 GPT 行为配方：作出常规判断、消化复杂度，并以工程与视觉审美交付工作。<br>
  面向 GPT 推理家族，尤其是 GPT-6.1 Sol 与 GPT-6 Astra；回复跟随你使用的语言。<br>
  <em>Better judgment. Better taste. Less ceremony.</em>
</p>

<p align="center">
  <a href="#harnesses">宿主适配</a> ·
  <a href="#install">安装 Codex</a> ·
  <a href="#what-changes">改变什么</a> ·
  <a href="#featured-case">对照示例</a> ·
  <a href="#how-it-works">工作机制</a> ·
  <a href="#research">研究依据</a>
</p>

---

<a id="harnesses"></a>

## 宿主适配

GPT with Taste 由单一行为配方源编译生成，为各支持宿主提供原生指令与事件提醒：

| 宿主 | 接入形式 | 配置说明 |
| --- | --- | --- |
| **OpenAI Codex** | 原生模型指令与 hooks 叠加层 | [docs/install.md](docs/install.md)（或见下方快速安装） |
| **Claude Code** | Main 指令追加与原生插件（Sub + 3 路 Steer） | [docs/harnesses/claude.md](docs/harnesses/claude.md) |
| **Kiki** | 原生 Recipe（通用包与 Sol/Astra 兼容包） | [docs/harnesses/kiki.md](docs/harnesses/kiki.md) |
| **Pi** | 带 payload 防护的请求级扩展 | [docs/harnesses/pi.md](docs/harnesses/pi.md) |
| **Oh My Pi (OMP)** | 原生身份感知扩展 | [docs/harnesses/omp.md](docs/harnesses/omp.md) |
| **DeepSeek Harness (dsh)** | 原生 Cordis 插件与请求级提醒 | [docs/harnesses/dsh.md](docs/harnesses/dsh.md) |

Pi 和 OMP 默认对任意供应商的 `gpt-*` 模型生效，不要求官方订阅或固定供应商 ID。认证和请求路由仍由宿主配置管理。自定义模型 ID 或按需限制供应商，见对应接入指南。

要在其他宿主中使用？参考 [docs/harnesses/porting.md](docs/harnesses/porting.md)。维护者在 `recipe/` 中维护单一英文作者源，通过编译器适配各个目标：详见 [docs/authoring.md](docs/authoring.md)。

---

<a id="install"></a>

## 安装 · Codex

先安装 Node.js 22 或更高版本，然后运行：

```sh
git clone https://github.com/NB-Corp/gpt-with-taste.git
cd gpt-with-taste
node scripts/install.mjs --hooks
```

推荐在 Codex Desktop 的多轮工作中安装 Hooks：用户提交、子 Agent 启动以及受支持的等待结果各自收到对应提醒。后续子 Agent 输入能否刷新提醒，取决于[客户端入口](docs/install.md#runtime-coverage)。只安装提示词则运行 `node scripts/install.mjs`。两条路线都不需要 npm 包。

两条路线都安装到当前生效的 `CODEX_HOME`（未设置时为 `~/.codex`），写入两个受管提示词文件，并把 `model_instructions_file` 指向 main。你的模型、provider、effort、认证、权限、MCP、角色与 `AGENTS.md` 保持不变。要指定其他位置，追加带引号的绝对路径，例如 `--home "C:/Users/you/.codex"`。

使用 `--hooks` 时，在 Codex Desktop 的**设置 → 钩子**中审查并信任这三个定义，也可以在交互终端输入 `/hooks`。只开启你需要的事件。安装后请**新开一个 Codex 会话**。

运行 `node scripts/check-updates.mjs` 可手动检查更新。安装前也会查询官方元数据；离线安装加 `--skip-update-check`。[更新说明](docs/install.md#update-or-resolve-a-conflict)介绍已安装组件和魔改版本的处理。

想交给编程助手代办，可把本仓库与 [docs/install-for-ai.md](docs/install-for-ai.md) 一起交给它。要恢复受管状态，使用 [docs/recovery.md](docs/recovery.md)；完整安装契约见 [docs/install.md](docs/install.md)。

---

<a id="what-changes"></a>

## 改变什么

GPT with Taste 把判断力用在结果上：作出合理选择、保留有据主张、消化有用的协作结果，并认真完成工作。

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/comparison-diagram-zh-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/comparison-diagram-zh-light.svg">
  <img alt="默认行为与 GPT with Taste 的五组日常对照" src="assets/comparison-diagram-zh-light.svg" width="100%">
</picture>

这套配方结合了判断、连续执行、协作、工程与视觉审美。在[研究依据](docs/research.md)中了解设计原则；在[案例索引](docs/cases.md)与[网页版对比展示](https://nb-corp.github.io/gpt-with-taste/)中查阅完整任务输入与实际对照输出。

---

<a id="featured-case"></a>

## 对照示例 · 从安装记录到上手说明

> **同题请求**：根据 notes.md，给刚装好的同事写一份中文上手说明，放 START_HERE.md。

可见的改善很直接：先让读者开始，安装证明与过程自证退出主线。

[![Codex 默认与 GPT with Taste 的代表片段对照，原版多余的自证句已高亮](assets/case-first-use.png)](https://nb-corp.github.io/gpt-with-taste/)

查阅完整输入、生成文档与运行条件：[同题任务与运行记录](docs/cases/codex-first-use/input.md) · [网页版对比展示](https://nb-corp.github.io/gpt-with-taste/) · [案例索引](docs/cases.md)。

---

<a id="how-it-works"></a>

## 工作机制

1. **系统提示词设定长期优先级。** 跨宿主覆盖判断、执行、协作与审美；提示词本体为英文，回复跟随你最新使用的语言。
2. **Steer 在受支持的事件处重新强调对应行为。** 通过本地 hooks、extensions 或 native Recipe 事件，把用户提醒传递给主控，把范围内执行提醒传递给受派 Agent，并在收到协作结果后向主控补充输入消费提醒。

各角色的提示词均包含完整行为约定；受支持的宿主会接入对应的提醒链路。

---

<a id="research"></a>

## 研究依据

[docs/research.md](docs/research.md) 梳理了配方背后的研究发现、提示词架构与迭代方法：防御性写作如何影响阅读体验、为何给模型保留常规判断空间，以及如何将协作与审查反馈直接转化为行动。

---

<p align="center">
  <a href="LICENSE">MIT 许可证</a> · 致谢：<a href="https://github.com/SpadeLushen/pi-gpt-with-taste">SpadeLushen/pi-gpt-with-taste</a> · 社区友链：<a href="https://linux.do/">Linux DO</a>
</p>
