# DESIGN.md

## Current Visual State

当前界面以 Tailwind + React 组件为主，使用 Inter、Space Grotesk、JetBrains Mono。主色偏蓝，背景为 slate/white，组件大量使用圆角卡片、渐变 hero、阴影和装饰性 blur。首页仍有未支撑数据宣称，例如“已有 2,348 位高校同学”。整体观感接近通用 AI SaaS 模板。

## Desired Design Direction

阶段 5 要把界面调整为“可信、克制、专业的大学生求职诊断工具”。设计服务诊断流程，而不是服务炫技。界面应更像一份清楚的求职档案和岗位诊断台，而不是营销 landing page。

## Theme Scene

主要使用场景是学生在宿舍、图书馆或自习室的笔记本电脑上准备简历和校招申请，白天或晚上都可能使用。默认应采用明亮、低眩光、纸面感的浅色界面；通过低饱和色块和清晰分区建立可信感，而不是暗色科技感。

## Color Strategy

推荐 Restrained 或 restrained-plus：以带轻微冷暖倾向的中性色为主体，辅以一个可信主色和少量状态色。不要使用纯黑 `#000` 或纯白 `#fff`。后续实现时优先使用 OKLCH 色值或 Tailwind 可读 token 映射。

建议色彩角色：

- Background：微暖或微冷的近纸面色，不使用纯白。
- Surface：比背景略亮或略有层级差。
- Text primary：深 slate/ink，避免纯黑。
- Primary：沉稳蓝或蓝绿，用于主行动和重点状态。
- Advisory：琥珀或暖棕，用于谨慎、待补齐、未配置。
- Success：低饱和绿色，用于已完成、推荐。
- Danger：低饱和红，用于阻塞和错误。

## Typography

- 正文行长控制在 65 到 75ch。
- 层级通过字号、字重和留白实现，不依赖花哨装饰。
- 中文长段落需要更好的行高和分段。
- 标题不使用渐变文字。

## Layout Principles

- 六个流程应共享清晰的信息结构：当前状态、下一步行动、诊断内容、解释与证据。
- 不把所有内容都塞进同尺寸卡片网格。
- 卡片只在确实承载独立对象时使用，例如岗位摘要、诊断段落、资料区块。
- 重要流程页应减少无意义装饰背景，增加可读性、状态提示和可操作区。
- 移动端优先保证流程可继续，不追求复杂并排布局。

## Motion

使用少量进入和状态过渡，避免装饰性弹跳。不要动画 CSS layout 属性。优先使用 opacity、transform，ease-out quart/quint/expo。

## Components To Rationalize

- Navbar：清楚区分游客、手机号登录用户、当前流程位置。
- Step/Progress：用于上传、测评、诊断流程，减少装饰感。
- Status Banner：用于 AI Key 未配置、OCR 中、解析失败、未登录、未完善。
- Diagnostic Section：用于岗位详情报告的硬条件、性格适配、差距和建议。
- Position Summary Row：匹配结果页用摘要列表，不加载详情长字段。
- Profile Data Section：个人中心按资料、简历、测评、收藏、隐私、安全分组。

## Absolute Bans For This Project

- 不使用渐变文字。
- 不使用玻璃拟态作为默认卡片风格。
- 不使用“已有 N 位用户”等无真实统计的文案。
- 不使用假微信、假 QQ、假长图、假 PDF 成功提示。
- 不显示假认证、假绑定、默认清华大学/计算机等资料。
- 不用装饰性边框侧条作为主要强调。
- 不做完整品牌营销页式 hero-metric 模板。

## Implementation Guardrails

阶段 5 先产出设计方向和实施计划，经用户审查后再改代码。实现时保持 React + Tailwind 现有栈，不引入大型 UI 框架。优先提取局部可复用组件，但不做无关重构。
