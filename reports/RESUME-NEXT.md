# 暂停交接：第一轮职业推荐

> 2026-10-12 已按用户“继续”指令恢复，并完成第一轮规则推荐、偏好保存及验证。当前状态请阅读 `recommendation_delivery_2026-10-12.md`。下文为 10 月 11 日暂停时的历史记录，不再作为当前待办清单。

用户于 2026-10-11 明确要求暂停，稍后再做。不要在暂停期间继续实现、迁移或测试。

## 目标与范围

已授权第一轮：补充简历与职业字段、保存求职偏好、规则推荐 Top10、结果页展示推荐依据。现阶段职业类型诊断，不绑定虚构企业/城市/福利。测评仅作辅助，不参与本轮排序；真实 AI、测评重构、综合报告属于后续。

## 已写入的修改

- `src/types.ts`：学历/语言/证书/成果、职业参考学历与专业、偏好及推荐结果类型。
- `prisma/schema.prisma`：User.preferences、Resume.qualifications，JSON 默认空对象。
- `prisma/migrations/20261011090000_career_recommendation/migration.sql`：新增两列；尚未执行数据库迁移。
- `src/catalog.ts`：接回 degreeRequirement、typicalMajors。
- `src/lib/careerPreferences.ts`：偏好/补充材料规范化与长度、枚举、冲突校验。
- `src/lib/careerRecommendation.ts`：规则排序，技能/经历线索50、行业偏好20、类别15、专业10、方向5的内部排序值。分数不展示为概率；学历仅提示，不排除；无相关依据时不生成任意 Top10。城市、收入、价值偏好保存但不排序。
- `src/server/routes/recommendationRoutes.ts`：GET/PUT preferences、GET recommendations，从登录会话读取账号与最新材料，已注册到 app。
- 简历 mapper/schema/prompt 已修改；Prisma 客户端已重新生成。
- `userDataStore.ts` / `apiClient.ts`：游客偏好本地保存、账号API、偏好游客导入载荷、清除游客偏好。
- `meRoutes.ts`：游客偏好导入已有实现，仍需验证；完整导入流程沿用原逻辑。
- `QualificationsFields.tsx`、`CareerPreferencesForm.tsx`：新表单。
- `MatchResultsPage.tsx`：偏好编辑、保存、规则候选、理由/证据差距/待确认，支持游客和账号、失败重试与晚到响应隔离。
- `ResumeUploadPage.tsx`：补充材料字段、无需AI的手动填写入口。
- 最后一批修改将保存材料后导航改为 results，测评可后续补充；首页步骤、导航、游客导入文案及旧E2E预期已调整。
- `resumeState.ts` 改为检查实际非空字段；`saveResume` 游客也校验；服务端不强制用户填写未知姓名/学校/专业/年份，至少一项材料即可。
- `tests/data/careerRecommendation.test.ts`：21项规则/边界/字段检查，已接入 test:data。

## 验证状态

在最后一批流程调整之前，typecheck、test:data（包含21项新检查）、test:ai、test:frontend、test:reports 已通过。

最后一批 resumeState、游客保存校验、导航、首页、AuthContext、旧E2E调整后尚未重新验证。尚未新增新API/浏览器完整测试，尚未运行真实数据库迁移与推荐API测试，也未构建/视觉验收新版推荐页。不得宣称本轮已完成。

## 运行环境

- Git 工作目录：`D:\大学学习资料\宜信科创\CareerMatch-current`，分支 careermatch-flow-completion。此前翻新修改也未提交，全部保留；不要回滚覆盖。
- Git 主仓库：`../开发支持/Git主仓库`，不要删除。
- 数据库工具：`../开发支持/数据库工具`；实际运行副本与数据库位于 `C:\Windows\Temp\careermatch-flow-20261011`，端口55437，专用dev/test库。
- 更新 Prisma 时先遇 sandbox EPERM，再遇运行预览锁定DLL。已确认4317服务为careermatch及node server.ts，然后停止该项目预览并成功生成客户端。
- **4317项目预览已停止，尚未恢复。数据库进程未主动停止；恢复时先核对。**
- AI密钥仍为空，不要输出.env、数据库密码或真实个人材料。
- sandbox内读取本机端口/数据库可能需升级权限。不要绕过；启动方式 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tools/start-local.ps1` 已有批准前缀。
- `.verification/update-recommendation-prompts.py` 是本轮临时辅助文件，已运行两次修正提示词；后续无需重复执行。

## 恢复后先做

1. 检查 Git 修改与当前新增文件，保留此前工作；运行typecheck与相关确定性测试，审阅最后一批导航/材料校验改动。
2. 审阅规则的文字匹配局限与UI标签一致性。当前“依据较充分”需两项以上技能且至少覆盖一半要求；材料不等于已验证能力，保持说明。
3. 偏好PUT缺少preferences时当前会规范化为空，建议明确拒绝缺失载荷；导入路径偏好选项校验与PUT保持一致。
4. 在专用开发/测试库执行新增迁移，验证旧记录兼容、偏好持久化、无认证拒绝、账号隔离、非法输入不写入、查询/载荷用户ID不可冒用、游客导入与清除。
5. 增加真实浏览器测试：手动材料→偏好→推荐→详情；保存失败保留输入和重试；修改材料重新排序；刷新持久化；身份切换；375/768/1440视觉与溢出检查。旧数据库浏览器测试已修改导航预期，需回归。
6. 更新 START-HERE/PRODUCT/差距报告中的旧“列表不排序”和必须测评口径；记录本轮完成与验证边界。
7. 恢复4317预览，核对健康状态与推荐真实页面。

用户最新指令是暂停，必须等用户恢复后才继续以上工作。
