import { Position, AssessmentQuestion, PersonalityResult, ResumeData } from './types';

export const MOCK_POSITIONS: Position[] = [
  {
    id: 'sg-01',
    title: '电气工程技术岗',
    company: '国家电网有限公司',
    city: '北京/南京/武汉',
    type: 'state-owned',
    overallMatch: 92,
    resumeMatch: 85,
    personalityMatch: 95,
    salaryRange: '年薪12-18万',
    difficultyRating: 3,
    tags: ['央企总部直招', '六险二金', '解决户口', '有编制'],
    summary: '国家电网核心技术岗位，负责区域电网的规划、基建管理、电力系统调度和运行保障。',
    responsibilities: [
      '负责输变电工程的规划、设计、技术审查和施工现场技术管理。',
      '参与电网设备运行维护、故障诊断与事故分析。'
    ],
    requirements: [
      '电力系统及其自动化、电气工程相关专业。',
      '熟练使用 AutoCAD、PLC 编程等专业工具。'
    ],
    softSkills: ['沟通协调', '团队协作', '责任担当'],
    salaryDetail: '首年年薪 12-18万，六险二金（公积金最高比例缴存，企业年金保障），带薪年假，食堂及落户支持。',
    careerPath: ['技术员 (0-2年)', '专责 (2-5年)', '主管 (5-10年)', '总工 (10年以上)'],
    fitPersonality: ['尽责性高', '情绪稳定', '注重规则'],
    howToPrepare: {
      timeline: ['9月网申', '10-11月统一笔试', '11月下旬半结构化面试', '12月公示录取'],
      exam: '国家电网统一笔试：内容包含综合行测与专业知识（电路、高电压、继电保护等）。',
      interview: '专业面试 + 综合个面，主要考查专业理论扎实度及对于坚守岗位的职业心态。'
    },
    relatedJobs: ['IT/数字化工程师', '新能源技术岗', '信息安全专责']
  },
  {
    id: 'cm-02',
    title: 'IT/数字化工程师',
    company: '中国移动通信集团',
    city: '北京/上海/杭州',
    type: 'state-owned',
    overallMatch: 88,
    resumeMatch: 90,
    personalityMatch: 85,
    salaryRange: '年薪15-22万',
    difficultyRating: 4,
    tags: ['世界500强', '带薪年假', '节日福利', '企业年金'],
    summary: '负责中国移动核心业务系统的后端开发、云计算基础设施运维及大数据平台建设。',
    responsibilities: [
      '参与中国移动业务运营支撑系统（BOSS）的代码编写与技术维护。',
      '配合业务部门进行海量通信数据的清洗、存储建模。'
    ],
    requirements: [
      '计算机、软件工程相关专业。',
      '熟练掌握 Java/C++/Python，熟悉 SQL。'
    ],
    softSkills: ['系统思维', '持续学习', '抗压协作'],
    salaryDetail: '年薪 15-22万（基本薪资+绩效），企业年金、五险一金、交通通信补贴、年度体检。',
    careerPath: ['助理工程师 (0-2年)', '核心开发工程师 (2-5年)', '技术专家 (5-10年)'],
    fitPersonality: ['尽责性高', '常规研究', '情绪稳定'],
    howToPrepare: {
      timeline: ['9月网申', '10月全国统一在线笔试', '11月技术与HR面试', '12月发放录取'],
      exam: '移动集团笔试：包含通用行测、英语、5G常识。专业加试考察数据结构与数据库。',
      interview: '无领导小组讨论 + 结构化多对一面试。'
    },
    relatedJobs: ['后端开发工程师', '大数据研发工程师', '软件开发岗']
  },
  {
    id: 'bytedance-03',
    title: '后端开发工程师',
    company: '字节跳动 (ByteDance)',
    city: '北京/上海/深圳',
    type: 'internet',
    overallMatch: 85,
    resumeMatch: 95,
    personalityMatch: 75,
    salaryRange: '年薪35-50万',
    difficultyRating: 5,
    tags: ['高成长平台', '免费三餐', '房补', '技术前沿'],
    summary: '参与字节跳动旗下抖音、今日头条等高并发业务的服务器端核心开发与微服务架构升级。',
    responsibilities: [
      '负责高并发社交、视频等业务场景的后端服务设计与性能调优。',
      '与产品、前端、算法团队紧密协作，快速迭代产品功能。'
    ],
    requirements: [
      '计算机、电子信息相关专业。',
      '极强的算法基础，熟练掌握 Go/Java/Python 之一。'
    ],
    softSkills: ['快速敏捷', '自驱务实', '坦诚清晰'],
    salaryDetail: '基础月薪 22k-35k（15薪），免费豪华三餐、就近房补、公积金最高比例。',
    careerPath: ['研发工程师 (1-2年)', '高级研发 (2-4年)', 'Tech Lead (4-7年)'],
    fitPersonality: ['开放性高', '抗压性强', '积极主动'],
    howToPrepare: {
      timeline: ['7-8月提前批', '8-9月秋招正式批', '9-10月常态笔试', '10-11月连环面试'],
      exam: '以高难度 ACM 算法题为主，考察动态规划、图论等。',
      interview: '3-4轮高强度的纯技术个面，每轮必考实时手写代码与系统底座原理。'
    },
    relatedJobs: ['算法工程师', '前端开发工程师', '推荐算法工程师']
  },
  {
    id: 'tencent-04',
    title: '数据分析师',
    company: '腾讯科技 (Tencent)',
    city: '深圳/北京/上海',
    type: 'internet',
    overallMatch: 81,
    resumeMatch: 88,
    personalityMatch: 73,
    salaryRange: '年薪24-36万',
    difficultyRating: 4,
    tags: ['社交帝国', '弹性工时', '全额公积金', '鹅厂福利'],
    summary: '运用腾讯海量社交、游戏或金融数据，进行商业分析、用户画像刻画与 A/B 测试。',
    responsibilities: [
      '建立并完善核心业务的数据指标体系，进行异动分析与归因。',
      '设计 A/B 实验、评估实验分流、样本量及显著性差异。'
    ],
    requirements: [
      '数学、统计学、计算机相关专业。',
      '熟练编写 SQL，掌握 Python 数据清洗与统计建模。'
    ],
    softSkills: ['商业敏锐', '汇报沟通', '严谨客观'],
    salaryDetail: '年薪 24-36万（月薪15k-25k + 4-6个月年终奖），腾讯安居房贷最高90万。',
    careerPath: ['助理分析师 (0-2年)', '数据分析专家 (2-5年)', '商业分析总监 (5-10年)'],
    fitPersonality: ['研究型', '常规型', '尽责性高'],
    howToPrepare: {
      timeline: ['8-9月内推投递', '9月中大笔试', '9月-10月业务+总监面试', '10月底意向发放'],
      exam: '笔试包含 SQL 编写、概率统计理论、Python 算法、商业分析案例。',
      interview: '高度注重实习项目细节与商业 Case 推演。'
    },
    relatedJobs: ['策略产品经理', '大数据研发工程师', '社区运营专家']
  },
  {
    id: 'meituan-05',
    title: '产品经理 (高成长线)',
    company: '美团 (Meituan)',
    city: '北京/上海',
    type: 'internet',
    overallMatch: 78,
    resumeMatch: 82,
    personalityMatch: 74,
    salaryRange: '年薪20-35万',
    difficultyRating: 4,
    tags: ['生活服务龙头', '零售前沿', '系统培养', '新人友好'],
    summary: '深度融入美团外卖、到店等业务，进行需求调研、流程设计与项目管理。',
    responsibilities: [
      '调研用户及商家痛点，输出高质量、无歧义的 PRD 与原型。',
      '协调研发、设计、测试，主导项目全生命周期管理，跟进上线效果。'
    ],
    requirements: [
      '专业不限，理工科、经管类优先。',
      '熟悉 Axure/Figma，了解需求分析流程。'
    ],
    softSkills: ['同理心强', '沟通影响', '逻辑梳理'],
    salaryDetail: '年薪 20-35万（15.5薪），全额公积金，美团方法论大课，丰富的导师带教。',
    careerPath: ['助理产品 (0-2年)', '核心产品经理 (2-5年)', '产品专家 (5-10年)'],
    fitPersonality: ['外向型', '宜人度高', '开放性高'],
    howToPrepare: {
      timeline: ['8-9月统一网申', '9月产品专项笔试', '9-10月三轮面试', '10月发放录用'],
      exam: '美团行测逻辑题、图形推理，外加产品分析问答题（分析界面异同或功能设计）。',
      interview: '深度深挖简历项目，考察抗压、逻辑及同理心。'
    },
    relatedJobs: ['策略产品经理', 'UI/UX设计师', '供应链产品经理']
  },
  {
    id: 'icbc-06',
    title: '金融科技管培生',
    company: '中国工商银行 (ICBC)',
    city: '北京/上海/广州',
    type: 'state-owned',
    overallMatch: 89,
    resumeMatch: 84,
    personalityMatch: 93,
    salaryRange: '年薪16-25万',
    difficultyRating: 3,
    tags: ['宇宙第一大行', '双导师制', '落户绿通', '职业稳定'],
    summary: '旨在为工行各级业务中心、软开中心、数据中心培养金融与科技复合型的技术管理双轮骨干。',
    responsibilities: [
      '首年轮岗：在核心支行网点熟悉零售/信贷业务，随后转入总行或分行科技中心。',
      '负责将金融业务需求翻译为系统开发技术语言，进行项目交付。'
    ],
    requirements: [
      '计算机、软件、数学、金融工程相关专业。',
      '硕士或双学位（金融+计算机）优先。'
    ],
    softSkills: ['大局观强', '沟通汇报', '抗压耐磨'],
    salaryDetail: '年薪 16-25万，公积金最高比例，六险二金，总行食堂，落户绿通。',
    careerPath: ['见习管培 (0-1年)', '科技专责 (1-3年)', '团队主管 (3-5年)', '部门经理 (5年以上)'],
    fitPersonality: ['尽责性高', '宜人度高', '情绪稳定'],
    howToPrepare: {
      timeline: ['9-10月网申投递', '10月下旬工行全国统一笔试', '11月群面及个面', '12月签约'],
      exam: '全球在线笔试，考察行测、英语、金融常识、计算机常识、工行文化。',
      interview: '无领导小组讨论（Case多为金融科技） + 结构化多对一。'
    },
    relatedJobs: ['软件开发岗', 'IT/数字化工程师', '零售金融管培生']
  },
  {
    id: 'huawei-07',
    title: '算法工程师 (基础模型与NLP方向)',
    company: '华为技术有限公司',
    city: '深圳/杭州/西安',
    type: 'internet',
    overallMatch: 90,
    resumeMatch: 94,
    personalityMatch: 82,
    salaryRange: '年薪30-48万',
    difficultyRating: 5,
    tags: ['技术高地', '带薪培训', '顶尖导师', '全员持股'],
    summary: '负责华为核心大模型、深度学习算法、自然语言处理等前沿AI技术的研发与云服务落地。',
    responsibilities: [
      '参与基础大模型的训练与调优，推动在垂直行业的产品化应用。',
      '负责多模态或NLP核心算法的持续演进及云上API开发。'
    ],
    requirements: [
      '计算机、数学、统计学等专业，硕士或博士学位优先。',
      '精通 PyTorch/TensorFlow，对 Transformer 等架构有极深理解。'
    ],
    softSkills: ['研究自驱', '逻辑缜密', '抗压攻坚'],
    salaryDetail: '综合年薪 30-48万（月薪 20k-30k + 年终大奖），高额公积金、商业补充险、食堂。',
    careerPath: ['算法工程师 (1-3年)', '高级算法 (3-5年)', '技术专家/首席科学家 (5年以上)'],
    fitPersonality: ['研究型', '常规型', '情绪稳定'],
    howToPrepare: {
      timeline: ['7-8月华为天才计划/挑战者计划网申', '9月统一机考', '10月专业面+业务主管面+HR面', '11月起签约'],
      exam: '华为统一机考（3道算法题，满分600分，一般过150/200分及格），难度介于LeetCode中等到中等偏上。',
      interview: '专业面试深挖论文与AI项目，现场会加考手写代码，重点评估算法推导和优化思路。'
    },
    relatedJobs: ['深度学习算法工程师', '推荐算法工程师', '后端开发工程师']
  },
  {
    id: 'crrc-08',
    title: '机械研发工程师',
    company: '中国中车集团',
    city: '长春/青岛/株洲',
    type: 'state-owned',
    overallMatch: 86,
    resumeMatch: 82,
    personalityMatch: 90,
    salaryRange: '年薪12-16万',
    difficultyRating: 3,
    tags: ['大国重器', '编制稳定', '五险一金', '工会福利'],
    summary: '负责轨道交通装备、高铁列车、智能机车核心机械结构的研发设计、仿真分析和试验研究。',
    responsibilities: [
      '开展新型机车转向架、车体及动力系统的结构设计和三维建模。',
      '进行关键零部件的应力仿真分析与动态模拟试验，确保列车运行安全。'
    ],
    requirements: [
      '机械工程、力学、车辆工程等相关专业。',
      '熟练掌握 CATIA/SolidWorks 三维建模和 ANSYS 有限元分析。'
    ],
    softSkills: ['踏实严谨', '现场协调', '质量意识'],
    salaryDetail: '年薪 12-16万，国家标准公积金、交通通讯补贴、防暑降温费、定期疗休养。',
    careerPath: ['助理设计师 (0-2年)', '主管设计师 (2-5年)', '技术总监 (5-10年)', '总工程师 (10年以上)'],
    fitPersonality: ['现实耐劳', '常规型', '注重规则'],
    howToPrepare: {
      timeline: ['9-10月网申与校园宣讲会', '10月中下旬专业笔试', '11月综合面试与性格测试', '12月签订协议'],
      exam: '中车笔试通常考查行测能力加机械专业基础知识（如机械原理、材料力学、公差配合等）。',
      interview: '技术专家面试，考察对机械设计图纸的阅读能力以及对精密制造工艺的了解。'
    },
    relatedJobs: ['电气工程技术岗', '新能源技术岗', 'IT/数字化工程师']
  },
  {
    id: 'baidu-09',
    title: '深度学习算法工程师',
    company: '百度公司 (Baidu)',
    city: '北京/上海/深圳',
    type: 'internet',
    overallMatch: 87,
    resumeMatch: 91,
    personalityMatch: 80,
    salaryRange: '年薪30-45万',
    difficultyRating: 5,
    tags: ['AI领头羊', '智能驾驶', '房补食堂', '导师制'],
    summary: '参与百度文心一言大模型、深度学习平台 PaddlePaddle 框架的核心算法开发与应用。',
    responsibilities: [
      '负责多模态或自然语言处理模型的微调与剪枝加速，降低推理开销。',
      '推动深度学习算法在百度搜索、自动驾驶及云智能场景的结合。'
    ],
    requirements: [
      '计算机、数学、模式识别等相关学科。',
      '熟悉 Python, C++，精通深度学习常用数学推导，有学术论文发表者优先。'
    ],
    softSkills: ['钻研创新', '技术敏锐', '逻辑严密'],
    salaryDetail: '年薪 30-45万（月薪20k-32k * 15薪），包含优厚年终奖。福利：中关村就近房补、免费班车。',
    careerPath: ['初级算法 (0-2年)', '资深算法 (2-5年)', '高级技术专家 (5年以上)'],
    fitPersonality: ['研究型', '开放性高', '情绪稳定'],
    howToPrepare: {
      timeline: ['8月提前批', '9月全网投递', '9-10月三轮单人技术面试', '11月统一签约'],
      exam: '百度算法笔试：包含数学概率、矩阵求导、以及 LeetCode 困难难度算法编程。',
      interview: '多轮高难度算法原理考察加手写代码，重点关注大模型微调和神经网络设计思想。'
    },
    relatedJobs: ['算法工程师 (基础模型)', '推荐算法工程师', '后端开发工程师']
  },
  {
    id: 'ccb-10',
    title: '软件开发岗 (建信金科)',
    company: '中国建设银行',
    city: '厦门/北京/上海',
    type: 'state-owned',
    overallMatch: 88,
    resumeMatch: 86,
    personalityMatch: 90,
    salaryRange: '年薪18-26万',
    difficultyRating: 3,
    tags: ['金科头部', '六险二金', '落户福利', '稳定发展'],
    summary: '建信金科（建行全资子公司）金融科技岗，负责建设银行新一代核心业务系统、智慧政务及新一代网盘的技术开发。',
    responsibilities: [
      '参与银行核心交易系统、清算系统、手机银行 App 的后端系统实现与架构迁移。',
      '配合总行进行智慧政务、风控大数据系统的升级研发。'
    ],
    requirements: [
      '计算机、电子信息、密码学等相关专业，本科及以上学历。',
      '掌握 Java, Spring Cloud 框架，熟悉 Oracle/MySQL 数据库和 SQL 开发。'
    ],
    softSkills: ['严谨认真', '协调配合', '抗压防线'],
    salaryDetail: '首年年薪 18-26万，六险二金（公积金全额高比例），建信关怀节日礼金。',
    careerPath: ['见习研发 (0-1年)', '软件研发专责 (1-4年)', '高级工程师/科室主管 (4-8年)'],
    fitPersonality: ['尽责性高', '情绪稳定', '常规型'],
    howToPrepare: {
      timeline: ['9-10月网申投递', '10月底建行集团统一笔试', '11月中旬面试与测评', '12月发放录用'],
      exam: '笔试科目包含行测题、综合基础、以及计算机科学技术题（网络、数据库、操作系统占大头）。',
      interview: '包含半结构化面试（自我介绍、项目追问）及综合面试，看重合规安全底线与长期合作心态。'
    },
    relatedJobs: ['金融科技管培生', 'IT/数字化工程师', '信息安全专责']
  },
  {
    id: 'alibaba-11',
    title: '前端开发工程师 (淘宝/天猫技术部)',
    company: '阿里巴巴 (Alibaba)',
    city: '杭州/北京',
    type: 'internet',
    overallMatch: 84,
    resumeMatch: 93,
    personalityMatch: 75,
    salaryRange: '年薪30-45万',
    difficultyRating: 5,
    tags: ['电商巨头', '福利爆表', '阿里文化', '无息房贷'],
    summary: '负责淘宝、天猫等核心电商平台的多端前端研发、大促交互动效、以及前端性能优化与前沿框架。',
    responsibilities: [
      '负责 C 端电商页面与大促主会场的前端交互体验设计与开发。',
      '参与大前端工程化平台建设、H5/小程序同构技术和端智能。'
    ],
    requirements: [
      '计算机相关专业本科以上。',
      '精通 JS/TS，熟练掌握 React 或 Vue 及其生态链，了解 Webpack/Vite 前端工程化。'
    ],
    softSkills: ['极速响应', '拥抱变化', '激情自驱'],
    salaryDetail: '年薪 30-45万（基础月薪 18k-30k，16薪起），提供阿里iHome免息购房贷款最高80万。',
    careerPath: ['前端开发 (1-2年)', '资深开发/前端专家 (2-5年)', '高级技术专家 (5年以上)'],
    fitPersonality: ['开放性高', '外向型', '抗压性强'],
    howToPrepare: {
      timeline: ['8月校招内推启动', '9月笔试与在线代码考核', '9-10月多轮技术面加HR面', '11月谈薪签约'],
      exam: '阿里前端笔试：考察 JS 核心机制、网络 HTTP/HTTPS/Websocket 协议、前端安全、和手写算法。',
      interview: '专业面试深入追问 React/Vue 渲染机制、前端架构优化、打包体积压缩，有开源库贡献尤佳。'
    },
    relatedJobs: ['UI/UX设计师', '后端开发工程师', '产品经理']
  },
  {
    id: 'pinduoduo-12',
    title: '平台运营专员',
    company: '拼多多 (PDD)',
    city: '上海',
    type: 'internet',
    overallMatch: 76,
    resumeMatch: 80,
    personalityMatch: 72,
    salaryRange: '年薪22-32万',
    difficultyRating: 4,
    tags: ['超高薪资', '拼搏氛围', '免费三餐', '扁平直接'],
    summary: '负责拼多多商品爆款、Temu 跨境商品、平台活动运营与商户服务，致力于极致性价比的货架管理。',
    responsibilities: [
      '主导拼多多特定业务大促的主题策划与商家入驻审核。',
      '分析商品销量波动、转化链路，通过数据手段赋能商家提效。'
    ],
    requirements: [
      '专业不限，理工科或经管类优先。',
      '对电商运营有敏锐度，具备强抗压及快速处理突发问题的敏捷力。'
    ],
    softSkills: ['极致执行', '结果导向', '抗压坚毅'],
    salaryDetail: '综合年薪 22-32万（月薪14k-22k + 年终奖金），免费提供丰盛午餐与晚餐。',
    careerPath: ['运营专员 (0-2年)', '运营组长 (2-4年)', '运营总监 (4年以上)'],
    fitPersonality: ['现实耐劳', '抗压性强', '外向型'],
    howToPrepare: {
      timeline: ['8月启动网申', '9月大型笔试', '9-10月三轮面试', '11月确认签约'],
      exam: '笔试为行测思维配合少许商业逻辑问答。例如：针对某类目商品被跟卖，如何设计治理策略。',
      interview: '单人业务面试，考察底层自驱意识与对于高强度电商节奏的接受度，注重坦诚和解决问题的硬实力。'
    },
    relatedJobs: ['社区运营专家', '产品经理', '商业化运营经理']
  },
  {
    id: 'casic-13',
    title: '系统设计工程师',
    company: '中国航天科工集团',
    city: '北京/西安/成都',
    type: 'state-owned',
    overallMatch: 89,
    resumeMatch: 80,
    personalityMatch: 98,
    salaryRange: '年薪14-18万',
    difficultyRating: 4,
    tags: ['国家保障', '重点编制', '神圣使命', '六险二金'],
    summary: '负责国家重大航天装备、精密遥感系统和航天电子设备的系统级设计与多学科仿真协同。',
    responsibilities: [
      '参与航天系统架构设计、核心指标分解和模块接口设计。',
      '编制严密的技术方案、安全性分析报告，配合总体单位开展联调试验。'
    ],
    requirements: [
      '航空宇航科学与技术、控制工程、电子信息、通信等相关专业，硕士及以上学历。',
      '熟练使用 MATLAB/Simulink、系统仿真分析软件。'
    ],
    softSkills: ['极致严谨', '奉献精神', '团队协作'],
    salaryDetail: '年薪 14-18万，提供免费单身公寓，享受六险二金、定期体检、国家法定带薪假期。',
    careerPath: ['助理设计师 (0-2年)', '设计师 (2-5年)', '副主任设计师 (5-10年)', '主任设计师/总师 (10年以上)'],
    fitPersonality: ['注重规则', '尽责性高', '情绪稳定'],
    howToPrepare: {
      timeline: ['9月网申并提交在校成绩单（极其看重挂科情况）', '10月技术笔试', '11月综合及政治审查面试', '12月公示'],
      exam: '考查行测、英语以及专业综合卷（包含信号、微机、自动控制原理、流体力学等科目）。',
      interview: '专业考评。面试官多为研究院所总工程师，考查基础理论的极致扎实度以及政治坚定信念。'
    },
    relatedJobs: ['电气工程技术岗', '机械研发工程师', '信息安全专责']
  },
  {
    id: 'citic-14',
    title: '投资银行管培生',
    company: '中信证券股份有限公司',
    city: '北京/上海/深圳',
    type: 'state-owned',
    overallMatch: 82,
    resumeMatch: 85,
    personalityMatch: 80,
    salaryRange: '年薪25-40万',
    difficultyRating: 5,
    tags: ['券商龙头', '精英云集', '高额佣金', '极速成长'],
    summary: '参与企业 IPO、并购重组、债券发行等投资银行业务的立项、尽职调查与内核申报工作。',
    responsibilities: [
      '协助开展行业研究、企业尽职调查，搜集并梳理项目招股说明书核心章节。',
      '进行财务估值模型构建、承销准备，并与监管机构、律师保持顺畅对接。'
    ],
    requirements: [
      '金融学、会计、经济法或理工交叉学科，硕士研究生及以上学历优先。',
      '通过 CPA（会计/审计/经济法）科目、CFA 或司法考试者具有绝对优势。'
    ],
    softSkills: ['财务透视', '高强度抗压', '商务沟通'],
    salaryDetail: '基础起薪 25-40万，外加高弹性的年终项目奖金提成。五险一金、高端补充医疗和餐补。',
    careerPath: ['分析师 Analyst (1-2年)', '副经理 Associate (2-4年)', '副总裁 VP (4-7年)', '董事总经理 MD (10年以上)'],
    fitPersonality: ['外向型', '尽责性高', '情绪稳定'],
    howToPrepare: {
      timeline: ['8-9月内推启动', '9月中旬专业综合笔试', '10月多轮高管面试与终盘辩论', '11月发放意向书'],
      exam: '投资银行笔试：包含行测、专业英语、会计财务报表分析、商法和投行业务基础知识。',
      interview: '个人面试 + 小组无领导讨论（通常考查针对特定企业的重组、并购可行性案例答辩，极其激烈）。'
    },
    relatedJobs: ['金融科技管培生', '零售金融管培生', '精算与数据分析岗']
  },
  {
    id: 'jd-15',
    title: '供应链产品经理',
    company: '京东集团 (JD)',
    city: '北京/成都',
    type: 'internet',
    overallMatch: 83,
    resumeMatch: 87,
    personalityMatch: 78,
    salaryRange: '年薪20-32万',
    difficultyRating: 4,
    tags: ['供应链王牌', '员工宿舍', '全额公积金', '导师带教'],
    summary: '负责京东自营零售网络、智能仓储、无人配送调度后台及供应链预测算法的产品设计与优化。',
    responsibilities: [
      '设计多级仓配网络路径规划产品原型，协助优化库存周转率与现货率。',
      '梳理仓储和配送端业务流程，为 WMS、TMS 等物流管理系统输出 PRD。'
    ],
    requirements: [
      '物流管理、工业工程、计算机或数学相关专业，本科及以上学历。',
      '掌握数据分析 SQL 基础，能合理归纳流程瓶颈并绘制复杂业务泳道图。'
    ],
    softSkills: ['多维协调', '极致求真', '逻辑闭环'],
    salaryDetail: '年薪 20-32万，五险一金、京尊达福利券、定期体检。北京总部提供京东青年城租赁大楼。',
    careerPath: ['初级产品专员 (0-2年)', '供应链产品专家 (2-5年)', '供应链总监 (5年以上)'],
    fitPersonality: ['常规型', '尽责性高', '积极主动'],
    howToPrepare: {
      timeline: ['8-9月正式校招', '9月底笔试', '10月业务+高管+HR面', '11月意向确认'],
      exam: '京东笔试：考查基础数理逻辑、供应链经典运筹学简答题（如EOQ经济订货量模型分析）。',
      interview: '专业面试深入追问物流实习经验、如何解决供应链断货或爆仓等突发业务Case。'
    },
    relatedJobs: ['产品经理 (高成长线)', '数据分析师', '后端开发工程师']
  },
  {
    id: 'ct-16',
    title: '5G网络优化工程师',
    company: '中国电信集团',
    city: '南京/广州/成都',
    type: 'state-owned',
    overallMatch: 87,
    resumeMatch: 84,
    personalityMatch: 89,
    salaryRange: '年薪13-18万',
    difficultyRating: 3,
    tags: ['稳定无忧', '六险二金', '落户积分', '企业年金'],
    summary: '负责中国电信 5G/6G 基站建设规划、无线网络参数调优、高并发通信场景的网络容量评估与维护。',
    responsibilities: [
      '负责城市、特定园区无线信号的覆盖规划，定位并排查通信黑洞与弱覆盖区域。',
      '参与大型集会活动（如体育赛事、展会）的无线网络保障应急扩容，调配网络带宽资源。'
    ],
    requirements: [
      '通信工程、电子信息、物联网等专业本科及以上学历。',
      '熟悉移动通信原理（OFDM、信道编码等），能够使用网络路测工具及 SQL 分析信令数据。'
    ],
    softSkills: ['认真细致', '现场应变', '沟通配合'],
    salaryDetail: '年薪 13-18万，提供免费电信工作餐、通讯卡套餐折扣、公积金与企业年金、带薪假期。',
    careerPath: ['网优见习生 (0-2年)', '网络优化专责 (2-5年)', '网优主管 (5-10年)', '总工程师 (10年以上)'],
    fitPersonality: ['现实耐劳', '常规型', '尽责性高'],
    howToPrepare: {
      timeline: ['9-10月电信校招网申', '10月下旬电信统一在线机考', '11月一轮业务技术面，二轮综合面', '12月签约'],
      exam: '包含行测（言语表达、资料分析）、基本英文，以及通信基础（香农公式、OSI七层模型等）。',
      interview: '多为结构化专业问答，会详细提问对路测指标、天线挂高、越区切换等基础概念的掌握深度。'
    },
    relatedJobs: ['IT/数字化工程师', '新能源技术岗', '软件开发岗']
  },
  {
    id: 'netease-17',
    title: '游戏策划/研发专员',
    company: '网易公司 (NetEase)',
    city: '广州/杭州',
    type: 'internet',
    overallMatch: 80,
    resumeMatch: 85,
    personalityMatch: 75,
    salaryRange: '年薪25-40万',
    difficultyRating: 5,
    tags: ['游戏热爱者', '顶级食堂', '氛围自由', '丰厚奖金'],
    summary: '参与网易核心自研游戏（如《梦幻西游》《第五人格》《蛋仔派对》等）的数值设计、关卡策划或引擎研发。',
    responsibilities: [
      '设计游戏核心玩法逻辑、数值产出平衡模型，撰写关卡、剧情和交互 PRD。',
      '协调美术、开发、音效等部门，推进策划方案在游戏客户端中的落地。'
    ],
    requirements: [
      '专业不限，理工科或人文社科相关专业，本科及以上学历。有硬核游戏通关、排位经验者大幅加分。',
      '具备出色的文字功底或较强的数理计算基础（数值方向）。研发方向需精通 C++ 或 Python。'
    ],
    softSkills: ['奇思妙想', '共情玩家', '高效沟通'],
    salaryDetail: '年薪 25-40万，外加极为丰厚的产品上线分红提成。公积金全额缴纳、网易食堂免费四餐。',
    careerPath: ['初级策划 (0-2年)', '核心策划/数值主策 (2-5年)', '游戏制作人 (5年以上)'],
    fitPersonality: ['开放性高', '抗压性强', '研究型'],
    howToPrepare: {
      timeline: ['8月网申通道启动', '9月大型游戏专项笔试', '9-10月专业面与制作人面（多轮）', '11月意向发放'],
      exam: '网易游戏策划笔试以题量超大、极具深度闻名。考题涵盖市面各大类型游戏分析、数值算术、关卡设计和逆向拆解。',
      interview: '极重硬核提问。面试官会指定一款你玩过最深的游戏，现场要求拆解其经济系统或成长体系。'
    },
    relatedJobs: ['UI/UX设计师', '前端开发工程师', '产品经理']
  },
  {
    id: 'sinopec-18',
    title: '石油化工技术储备岗',
    company: '中国石油化工集团',
    city: '南京/上海/广州',
    type: 'state-owned',
    overallMatch: 84,
    resumeMatch: 80,
    personalityMatch: 90,
    salaryRange: '年薪11-15万',
    difficultyRating: 3,
    tags: ['央企编制', '落户解决', '劳动保障', '工会慰问'],
    summary: '中石化研究院或大型炼化厂技术骨干，负责化学工艺路线优化、高分子材料研发、生产现场工艺安全监督。',
    responsibilities: [
      '跟踪并优化炼化装置日常工艺指标，开展节能降耗、绿色化工技改项目。',
      '协助研究院开展新型复合材料、精细化学品的配方研发及中试放大。'
    ],
    requirements: [
      '化学、化学工程与工艺、材料科学、石油工程相关专业。',
      '熟悉高分子化学基础，能够使用 Aspen Plus 等工艺流程仿真软件。'
    ],
    softSkills: ['极度严谨', '耐心专注', '安全底线'],
    salaryDetail: '年薪 11-15万，六险二金，异地青年宿舍或租房补贴，中石化全额劳保及特色防暑福利。',
    careerPath: ['工艺员/助理研究员 (0-2年)', '主管工艺师/研究骨干 (2-5年)', '生产厂长/研发总监 (5-10年)'],
    fitPersonality: ['现实耐劳', '常规型', '注重规则'],
    howToPrepare: {
      timeline: ['9月-10月网申投递', '10月下旬中石化全国统一笔试', '11月中下旬面试体检', '12月公示'],
      exam: '笔试科目为综合素质（行测）加化工基础卷，重点考查逻辑思维、化学工程基础。',
      interview: '技术面试。重点考查学术毕业课题研究深度，现场可能会考核核心工艺图纸识别及故障点诊断。'
    },
    relatedJobs: ['机械研发工程师', '新能源技术岗', '电气工程技术岗']
  },
  {
    id: 'cmb-19',
    title: '零售金融管培生',
    company: '招商银行 (CMB)',
    city: '深圳/北京/上海',
    type: 'state-owned',
    overallMatch: 85,
    resumeMatch: 82,
    personalityMatch: 88,
    salaryRange: '年薪18-28万',
    difficultyRating: 4,
    tags: ['零售之王', '福利丰厚', '弹性竞争', '双导师制'],
    summary: '招行王牌培养计划，旨在培养未来零售信贷、财富管理、私人银行、智能网点转型的专业骨干与储备行长。',
    responsibilities: [
      '在核心业务支行进行对私财富管理、消费金融产品推广、以及信用卡交叉销售实操。',
      '轮岗结束后转入总行/分行零售金融部，开展零售理财产品线策略或掌上生活 App 营销方案策划。'
    ],
    requirements: [
      '专业不限，经管、理工科均可，本科及以上学历。',
      '形象气质佳，具有极为突出的沟通交际力，通过银行从业、基金从业、AFP/CFP者大加分。'
    ],
    softSkills: ['极致亲和力', '抗压高情商', '主动自驱'],
    salaryDetail: '年薪 18-28万（月起薪 + 极其丰厚的季度绩效和行长专项年终奖），招行咖啡福利，带薪培训。',
    careerPath: ['零售见习管培 (0-1年)', '财富顾问/消金专责 (1-3年)', '财富主管 (3-5年)', '支行副行长/行长 (5-10年)'],
    fitPersonality: ['外向型', '宜人度高', '情绪稳定'],
    howToPrepare: {
      timeline: ['9月首轮网申', '10月中旬招行在线笔试', '10月底-11月多轮选拔面试（一般有AI面试加面）', '12月录用签约'],
      exam: '包含通用行测题、英语阅读，以及多道心理和高情商性格测试。',
      interview: '首轮为大批无领导小组群面（考察零售业务营销策划），二轮为单人高管面试，重点考察言谈举止与亲和力。'
    },
    relatedJobs: ['投资银行管培生', '金融科技管培生', '人力资源岗']
  },
  {
    id: 'didi-20',
    title: '策略产品经理',
    company: '滴滴出行 (DiDi)',
    city: '北京/上海',
    type: 'internet',
    overallMatch: 81,
    resumeMatch: 85,
    personalityMatch: 77,
    salaryRange: '年薪24-38万',
    difficultyRating: 4,
    tags: ['出行巨头', '算法交汇', '免费夜宵', '全额公积金'],
    summary: '负责滴滴核心网约车调度、动态调价机制、供需匹配算法与乘客发券策略的设计与运营。',
    responsibilities: [
      '协助算法设计复杂的区域排队和动态调价算法原型，用数据手段缩短乘客等车时长。',
      '设计乘客及司机端活动发券、拼车优惠逻辑，最大化拉动区域内 GMV。'
    ],
    requirements: [
      '运筹学、计算机、工业工程、统计等量化分析专业优先，本科及以上学历。',
      '具备极强的数据分析功底（熟练掌握 SQL 和 Python 数据分析），能理解运筹算法。'
    ],
    softSkills: ['逻辑透视', '问题拆解', '横向沟通'],
    salaryDetail: '年薪 24-38万（15薪），晚餐免费、深夜打车全额报销，全额公积金。',
    careerPath: ['初级产品 (0-2年)', '策略产品专家 (2-5年)', '策略总监 (5年以上)'],
    fitPersonality: ['研究型', '常规型', '尽责性高'],
    howToPrepare: {
      timeline: ['8-9月网申内推', '9月中笔试（行测偏数据分析）', '10月技术与大产品两轮面试', '11月发放意向书'],
      exam: '滴滴笔试：包含大量博弈论、动态平衡、供需分析的图表行测和产品方案设计。',
      interview: '专业面试深入考察供需策略。例如：“如果突降暴雨，如何设计网约车溢价与调度方案以保证运力平衡？”'
    },
    relatedJobs: ['产品经理 (高成长线)', '数据分析师', '后端开发工程师']
  },
  {
    id: 'cu-21',
    title: '大数据研发工程师',
    company: '中国联通集团',
    city: '深圳/北京/南京',
    type: 'state-owned',
    overallMatch: 86,
    resumeMatch: 88,
    personalityMatch: 84,
    salaryRange: '年薪14-20万',
    difficultyRating: 3,
    tags: ['通信中坚', '有编制', '带薪疗休养', '福利食堂'],
    summary: '中国联通软件研究院大数据研发骨干，负责千亿级通信日志的数据仓库建模、流计算和画像开发。',
    responsibilities: [
      '开展基于 Hadoop/Spark 生态的离线与实时数仓平台系统开发。',
      '对接省市分行或政企客户需求，提炼通信轨迹、征信指标的大数据服务 API。'
    ],
    requirements: [
      '计算机科学与技术、信息工程、地理信息系统等专业。',
      '精通 SQL，熟练掌握 Java, Scala 之一，理解 Hive/Spark/Flink 等架构。'
    ],
    softSkills: ['架构思维', '执行坚韧', '团队合力'],
    salaryDetail: '年薪 14-20万，国家落户绿通，补充六险二金，节日发放年节福利慰问包。',
    careerPath: ['助理开发 (0-2年)', '中级开发专责 (2-5年)', '数据架构专家 (5-10年)'],
    fitPersonality: ['常规型', '尽责性高', '情绪稳定'],
    howToPrepare: {
      timeline: ['9月网申', '10月集团统一全国笔试', '11月业务技术一轮面与综合二轮面', '12月拟录取公示'],
      exam: '考查行测行规、英语能力、加测数据仓库基础、Hadoop底层原理等。',
      interview: '侧重考查大数据工程实习经验、高并发查询SQL优化机制、以及在国企做技术开发的长期心态。'
    },
    relatedJobs: ['IT/数字化工程师', '后端开发工程师', '数据分析师']
  },
  {
    id: 'xiaohongshu-22',
    title: '社区运营专家',
    company: '小红书 (RED)',
    city: '上海/北京',
    type: 'internet',
    overallMatch: 77,
    resumeMatch: 81,
    personalityMatch: 73,
    salaryRange: '年薪22-35万',
    difficultyRating: 4,
    tags: ['时尚潮地', '氛围友好', '极速成长', '全额五险一金'],
    summary: '负责小红书时尚、美食、数码等核心垂类的内容生态建设、KOL 孵化与高品质热点策划。',
    responsibilities: [
      '挖掘高品质内容与潜力创作者，策划社区活动引导优质 UGC 内容高爆发。',
      '监控社区不良内容、低质营销，制定内容推荐和流量分发的精细策略。'
    ],
    requirements: [
      '专业不限，传媒、社会学、心理学等专业优先。小红书硬核重度用户（有个人运营账号大加分）。',
      '网感极佳，善于洞察年轻人群体心理，对当季网络流行梗有极强的敏锐度与应用能力。'
    ],
    softSkills: ['时尚网感', '共情沟通', '敏捷响应'],
    salaryDetail: '年薪 22-35万，提供免费早午餐，五险一金（最高比例），新风办公室，每周内部产品福利。',
    careerPath: ['运营专员 (0-2年)', '垂类运营负责人 (2-5年)', '社区生态专家 (5年以上)'],
    fitPersonality: ['外向型', '开放性高', '宜人度高'],
    howToPrepare: {
      timeline: ['8-9月内推网申', '9月运营思维笔试', '10月技术与社区主编多轮面试', '11月发放意向书'],
      exam: '小红书运营笔试：开放型问题居多，如：策划一个引导男大学生使用小红书记录生活的活动方案。',
      interview: '深入剖析个人运营的小红书或社交账号，以及考察对应垂类（如国货美妆、户外探险）的创作者生态了解度。'
    },
    relatedJobs: ['平台运营专员', '产品经理 (高成长线)', '商业化运营经理']
  },
  {
    id: 'cscec-23',
    title: '土木工程技术岗',
    company: '中国建筑股份有限公司',
    city: '全国/海外分公司',
    type: 'state-owned',
    overallMatch: 85,
    resumeMatch: 80,
    personalityMatch: 90,
    salaryRange: '年薪12-16万',
    difficultyRating: 3,
    tags: ['建筑王牌', '解决户口', '劳动保障', '海外出差补贴'],
    summary: '参与超高层建筑、国家重大路桥、机场航站楼等重大工程建设项目的施工组织、工艺监督和技术复核。',
    responsibilities: [
      '在施工现场进行测量放线、安全检查、质量监督和图纸技术交底。',
      '编制工程物资计划和施工进度表，协调监理单位与劳务班组现场配合。'
    ],
    requirements: [
      '土木工程、工程管理、给排水等建筑大类专业。',
      '掌握 AutoCAD、BIM 建模软件，熟悉国家施工安全规范和质量标准。'
    ],
    softSkills: ['极强吃苦力', '现场协调', '质量底线'],
    salaryDetail: '年薪 12-16万，提供免费食宿、五险一金。选择海外重点项目享受高额免税出国津贴。',
    careerPath: ['施工员/技术员 (0-2年)', '项目技术负责人/工长 (2-5年)', '项目经理 (5-10年)'],
    fitPersonality: ['现实耐劳', '常规型', '注重规则'],
    howToPrepare: {
      timeline: ['9-10月校园双选会与宣讲会', '10月下旬中建集团统一笔试', '11月现场面试与政审', '12月签约'],
      exam: '中建全国统一笔试：包含通用言语理解、数理计算，以及基本的建筑材料、工艺基础简答。',
      interview: '校园面试。考查对到工地一线艰苦环境、项目异地安置的接受意愿，以及身体素质和协调执行力。'
    },
    relatedJobs: ['机械研发工程师', '电气工程技术岗', '新能源技术岗']
  },
  {
    id: 'people-24',
    title: '融媒体内容运营',
    company: '人民网股份有限公司',
    city: '北京/分社所在地',
    type: 'state-owned',
    overallMatch: 83,
    resumeMatch: 80,
    personalityMatch: 86,
    salaryRange: '年薪13-18万',
    difficultyRating: 4,
    tags: ['主流媒体', '有编制', '落户红利', '人文关怀'],
    summary: '人民网新媒体中心骨干，负责人民网官方抖音、微博、微信公众号及客户端的内容策划、编辑排版与融媒体创新。',
    responsibilities: [
      '进行每日重大新闻事件的内容搜集、编辑和融媒体改写，输出符合新媒体传播规律的作品。',
      '策划重大主题宣传的短视频脚本，跟进拍摄和后期剪辑上线。'
    ],
    requirements: [
      '新闻学、网络与新媒体、汉语言文学、政治学等相关专业。',
      '极强的文字功底，了解 Photoshop 图像处理和 Premiere 视频剪辑工具。'
    ],
    softSkills: ['极高政治站位', '敏锐网感', '抗压高频'],
    salaryDetail: '年薪 13-18万，提供总社食堂、带薪年假，符合条件的优秀毕业生享受北京落户指标绿通。',
    careerPath: ['助理编辑/运营 (0-2年)', '中级编辑专责 (2-5年)', '主编/频道负责人 (5-10年)'],
    fitPersonality: ['常规型', '注重规则', '宜人度高'],
    howToPrepare: {
      timeline: ['9-10月人民网官网校招', '10月下旬统一综合笔试', '11月中下旬两轮结构化面试与专业实操加试', '12月拟录取公示'],
      exam: '包含时事政治常识（主考）、公文写作与改错、行测能力。专业加试需在限时内根据热点撰写一篇微评论。',
      interview: '结构化面试。重点评估考生的思想品德、文字敏锐度、以及在主流新闻媒体坚守职业操守的责任意识。'
    },
    relatedJobs: ['社区运营专家', '平台运营专员', '人力资源岗']
  },
  {
    id: 'nio-25',
    title: '自动驾驶系统测试',
    company: '蔚来汽车 (NIO)',
    city: '上海/合肥/北京',
    type: 'internet',
    overallMatch: 84,
    resumeMatch: 88,
    personalityMatch: 80,
    salaryRange: '年薪22-35万',
    difficultyRating: 4,
    tags: ['新能源风口', '全额五险一金', '海外协同', '扁平直接'],
    summary: '负责蔚来智能辅助驾驶系统（NOP+）在实车、高仿真环境下的测试用例设计、实车路测与故障溯源。',
    responsibilities: [
      '在虚拟座舱及半实物仿真台架（HIL）上运行自动驾驶测试用例，捕获系统软硬件异常。',
      '主导实车在各类特殊道路（隧道、雨雪天、匝道）上的性能测试，记录行车电脑日志。'
    ],
    requirements: [
      '车辆工程、自动控制、计算机、通信等专业。',
      '熟练掌握 Python, Linux，熟悉 CANoe/CANalyzer 等汽车总线测试工具者优先。'
    ],
    softSkills: ['极度细致', '安全敬畏', '跨端协同'],
    salaryDetail: '年薪 22-35万（14-15薪），全额缴纳五险一金、高端补充医疗卡、免费班车和新能源购车员工专属折扣。',
    careerPath: ['测试工程师 (0-2年)', '高级系统测试工程师 (2-5年)', '测试技术总监 (5年以上)'],
    fitPersonality: ['常规型', '情绪稳定', '尽责性高'],
    howToPrepare: {
      timeline: ['8-9月内推正式批', '9月统一线上笔试', '10月技术开发与实车测试总监面试', '11月录取通知'],
      exam: '包括 Python 开发基础、Linux 脚本、CAN/LIN总线协议、自动驾驶感知与决策经典案例。',
      interview: '专业考评：细致深挖对自动驾驶长尾场景（Corner Cases）的测试用例设计思想。'
    },
    relatedJobs: ['后端开发工程师', 'IT/数字化工程师', '算法工程师']
  },
  {
    id: 'chinalife-26',
    title: '精算与数据分析岗',
    company: '中国人寿保险集团',
    city: '北京/上海',
    type: 'state-owned',
    overallMatch: 86,
    resumeMatch: 84,
    personalityMatch: 88,
    salaryRange: '年薪15-22万',
    difficultyRating: 4,
    tags: ['世界500强', '落户北京', '六险二金', '行业金领'],
    summary: '中国人寿总保或各寿险分公司精算部门，负责新型保险精算模型构建、准备金评估及偿付能力数据分析。',
    responsibilities: [
      '运用统计模型估算寿险、健康险大类产品的理赔发生率与现金流模拟。',
      '分析公司海量承保与理赔历史数据，向总行和监管机构提交偿付能力评估报告。'
    ],
    requirements: [
      '精算学、统计学、金融工程、应用数学相关专业。',
      '通过精算师协会考试（如中国精算师 CAA、北美精算师 ASA 等）科目者有显著绝对优势。'
    ],
    softSkills: ['严密统计逻辑', '沉稳专注', '合规汇报'],
    salaryDetail: '年薪 15-22万，提供国寿丰厚职工福利食堂、六险二金、定期境外业务交流、北京落户。',
    careerPath: ['精算助理 (0-2年)', '精算师专责 (2-5年)', '精算负责人/总精算师 (5年以上)'],
    fitPersonality: ['常规研究', '尽责性高', '情绪稳定'],
    howToPrepare: {
      timeline: ['9-10月中国人寿网申', '10月下旬国寿统一大笔试', '11月多轮结构化专业面试', '12月发放拟录'],
      exam: '包含通用能力（行测）、精算数学基础（概率、利息理论等）、保险基础理论和数据分析常识。',
      interview: '重点盘问考生精算师考证进度、对特定保险产品设计逻辑的理解以及对大量金融数据的高阶整理分析功底。'
    },
    relatedJobs: ['金融科技管培生', '数据分析师', '精算与数据分析岗']
  },
  {
    id: 'kuaishou-27',
    title: '推荐算法工程师',
    company: '快手 (Kuaishou)',
    city: '北京/深圳',
    type: 'internet',
    overallMatch: 82,
    resumeMatch: 92,
    personalityMatch: 72,
    salaryRange: '年薪32-48万',
    difficultyRating: 5,
    tags: ['短视频风口', '全包福利', '大模型落地', '高弹年终'],
    summary: '负责快手 App 短视频推荐、上下滑广告竞价和用户粘性建模的核心协同过滤与神经网络深度推荐模型研发。',
    responsibilities: [
      '优化千亿级特征量的实时短视频推荐排序（Ranking）和粗召回（Retrieval）系统。',
      '参与利用强化学习、大模型表征提升用户单次使用时长与长效互动率。'
    ],
    requirements: [
      '计算机、数据科学、机器学习相关专业，硕士或博士学位。',
      '精通 C++/Python，精通深度学习工具，深刻理解协同过滤、FM、多塔推荐模型底层架构。'
    ],
    softSkills: ['突破攻坚', '敏捷求真', '横向沟通'],
    salaryDetail: '年薪 32-48万（月薪22k-32k，16薪起），免费三餐下午茶、高端重疾医疗卡、租房补贴。',
    careerPath: ['推荐算法专员 (1-2年)', '高级算法 (2-4年)', '推荐算法专家/技术主管 (5年以上)'],
    fitPersonality: ['研究型', '抗压性强', '开放性高'],
    howToPrepare: {
      timeline: ['8月提前批投递', '9月全网统考笔试', '10月三轮单人高密度纯代码面试', '11月发放拟录'],
      exam: '快手机考：高难 LeetCode ACM 题，外加机器学习（如过拟合治理、交叉熵公式推导）的多选。',
      interview: '专业深挖：要求手写复杂的注意力机制逻辑（Attention Layers）和大规模点击率（CTR）模型演练。'
    },
    relatedJobs: ['算法工程师 (基础模型)', '深度学习算法工程师', '后端开发工程师']
  },
  {
    id: 'abc-28',
    title: '信息安全专责',
    company: '中国农业银行',
    city: '北京/西安/成都',
    type: 'state-owned',
    overallMatch: 87,
    resumeMatch: 85,
    personalityMatch: 89,
    salaryRange: '年薪17-24万',
    difficultyRating: 3,
    tags: ['四大行', '落户优先', '五险一金', '稳健舒适'],
    summary: '农行研发中心或数据中心安全技术岗位，负责金融业务防黑客渗透、国密迁移升级及银保数据防泄露应急响应。',
    responsibilities: [
      '参与农行网上银行、手机 App 的安全审计、漏洞挖掘和渗透测试工作。',
      '负责日常安全红蓝对抗演练，部署堡垒机、IDS 等金融级网络安全软硬件架构。'
    ],
    requirements: [
      '信息安全、网络安全、密码学等专业，本科及以上学历。',
      '掌握 Kali Linux 工具链、了解常用 Web 漏洞（OWASP Top 10）防护原理，了解对称与非对称密码体制。'
    ],
    softSkills: ['极高责任感', '冷静应变', '合规守信'],
    salaryDetail: '年薪 17-24万，六险二金。食堂丰盛性价比高，节假日关怀慰问金、年度体检。',
    careerPath: ['安全助理员 (0-2年)', '安全技术专责 (2-5年)', '安全科室主管 (5-10年)'],
    fitPersonality: ['尽责性高', '常规型', '注重规则'],
    howToPrepare: {
      timeline: ['9-10月农业银行官网校招', '10月底农行集团统一全球笔试', '11月中旬现场面试与实机红蓝考评', '12月意向签约'],
      exam: '包含通用能力（行测）、综合英语、和网络信息安全（常考密码学和等保要求）。',
      interview: '面试官会提问最近的安全漏洞防御案例（如Log4j2修复），看重求职者极强的合规保密及防线抗压心理。'
    },
    relatedJobs: ['软件开发岗', 'IT/数字化工程师', '金融科技管培生']
  },
  {
    id: 'mihoyo-29',
    title: 'UI/UX设计师',
    company: '米哈游 (miHoYo)',
    city: '上海',
    type: 'internet',
    overallMatch: 79,
    resumeMatch: 84,
    personalityMatch: 74,
    salaryRange: '年薪26-42万',
    difficultyRating: 5,
    tags: ['二次元龙头', '极其扁平', '福利炸裂', '技术宅拯救世界'],
    summary: '负责米哈游旗下高热度游戏（如《原神》《崩坏：星穹铁道》等）或社交工具（米游社）的 UI 视觉和交互动效设计。',
    responsibilities: [
      '设计游戏主界面（HUD）、背包道具、卡池活动前端视觉，产出美观高质的高保真渲染图与动效方案。',
      '打通玩家操作体验，优化多平台（移动端/PC/PS5）手柄及触控体验。'
    ],
    requirements: [
      '视觉传达、交互设计、多媒体、数字媒体艺术相关专业。附带高质量、成套的设计作品集。',
      '熟练使用 Figma、Photoshop、After Effects，对 Unity 引擎 UI 模块有一定理解者优先。'
    ],
    softSkills: ['审美爆棚', '敏锐同理', '拥抱创意'],
    salaryDetail: '年薪 26-42万，上海徐汇近地铁房补、美味三餐全包、年终奖极具爆发空间、顶配办公软硬件。',
    careerPath: ['游戏UI设计师 (1-2年)', '视觉主设 (2-5年)', '美术主监/UI主管 (5年以上)'],
    fitPersonality: ['开放性高', '宜人度高', '研究型'],
    howToPrepare: {
      timeline: ['8月提前批开启', '9月网申并发放限时 48-72小时 设计专业课试卷', '10月作品评审及三轮技术加HR面', '11月发放录取'],
      exam: '发放的专业加试要求极高：限时内根据指定游戏风格重构某主界面背包及交互，淘汰率高达 80%。',
      interview: '专业评审会针对你的作品集展开极其细腻的追问，重点考查对于游戏统一色彩心理学、手势流向的深层推敲。'
    },
    relatedJobs: ['UI/UX设计师', '前端开发工程师', '产品经理']
  },
  {
    id: 'ctg-30',
    title: '新能源技术岗',
    company: '中国三峡集团',
    city: '武汉/成都/宜昌',
    type: 'state-owned',
    overallMatch: 88,
    resumeMatch: 82,
    personalityMatch: 94,
    salaryRange: '年薪13-17万',
    difficultyRating: 3,
    tags: ['绿色电力', '解决编制', '异地津贴', '安居无忧'],
    summary: '负责大型风力发电厂、光伏电站、储能电站以及抽水蓄能电站的基建协调、并网调度和运行监控。',
    responsibilities: [
      '开展大型陆上/海上风电、太阳能发电项目的前期工程技术可行性论证与参数申报。',
      '编写风光储联合系统工艺流程，监控现场设备发电效率，排除日常技术故障。'
    ],
    requirements: [
      '电气工程、新能源科学与工程、热能动力工程等相关专业。',
      '掌握电力仿真软件（如 Matlab/Simulink），对逆变器、大容量电池管理系统有扎实理论。'
    ],
    softSkills: ['踏实奉献', '安全第一', '现场多方协调'],
    salaryDetail: '年薪 13-17万，补充公积金与企业年金（六险二金），异地安置安家礼包，提供免费工作服和宿舍。',
    careerPath: ['新能源运行员 (0-2年)', '新能源厂站专责 (2-5年)', '区域运行主管 (5-10年)', '高级总工 (10年以上)'],
    fitPersonality: ['现实耐劳', '常规型', '情绪稳定'],
    howToPrepare: {
      timeline: ['9-10月网申投递', '10月下旬三峡集团统一笔试', '11月中下旬半结构化面试与现场测评', '12月发放录取通知'],
      exam: '包含行测公共基础、行业基本常识（水利及风电绿能常识）、加测工程热力学或电气工程专业题。',
      interview: '主要评估考生的长期职业定位。由于大型风电光伏多处于空旷远郊或近海，会重点考查对基层艰苦环境的适应力。'
    },
    relatedJobs: ['电气工程技术岗', '机械研发工程师', 'IT/数字化工程师']
  },
  {
    id: 'bilibili-31',
    title: '商业化运营经理',
    company: '哔哩哔哩 (Bilibili)',
    city: '上海',
    type: 'internet',
    overallMatch: 78,
    resumeMatch: 82,
    personalityMatch: 74,
    salaryRange: '年薪20-32万',
    difficultyRating: 4,
    tags: ['弹幕文化', '氛围超赞', '高薪弹性', '全额五险一金'],
    summary: '负责 B 站花火广告平台、直播打赏、以及会员购商业化活动的商家入驻、策略运营和流量增长。',
    responsibilities: [
      '负责商业化广告转化漏斗数据监控，设计创新的商业化变现活动与广告主大促大盘。',
      '连接头部 UP 主与品牌，制定品牌定制化投放模型。'
    ],
    requirements: [
      '专业不限，理工科、新闻、经管大类优先。',
      '对 B 站社区文化极度热爱，熟稔头部 UP 主生态和弹幕二次元梗。'
    ],
    softSkills: ['极强沟通力', '敏锐网感', '数据赋能'],
    salaryDetail: '年薪 20-32万（月薪14k-22k + 年终绩效分成），B站专属限定周边福利、年度二次元大赏参与。',
    careerPath: ['运营助理 (0-2年)', '商业化类目专家 (2-5年)', '商业化事业部负责人 (5年以上)'],
    fitPersonality: ['外向型', '开放性高', '积极主动'],
    howToPrepare: {
      timeline: ['8-9月秋季校招网申', '9月商业分析笔试', '10月一轮业务面，二轮总监面', '11月发放拟录'],
      exam: '笔试科目：基本逻辑行测、加上 2-3 道商业运营大题（如分析某品牌在B站投放亏本的原因并改写策略）。',
      interview: '专业考评：面试官多为商业化中心主编，重点追问对B站如何既保留良好社区氛围又加速商业变现的独特高见。'
    },
    relatedJobs: ['平台运营专员', '社区运营专家', '产品经理']
  },
  {
    id: 'cnooc-32',
    title: '海洋油气勘探技术员',
    company: '中国海洋石油集团',
    city: '天津/深圳/湛江',
    type: 'state-owned',
    overallMatch: 83,
    resumeMatch: 80,
    personalityMatch: 86,
    salaryRange: '年薪13-17万',
    difficultyRating: 3,
    tags: ['蓝色国土', '高额海贴', '落户福利', '编制保障'],
    summary: '中海油地质研究院或海洋钻井平台技术岗位，负责南海/渤海海洋油气田勘探资料解释与钻井工艺参数监控。',
    responsibilities: [
      '解释和解译海洋三维地震地质剖面资料，定位海底可能富集油气的储层层位。',
      '参与海上平台现场勘探，监控泥浆物理特性、岩屑录井参数。'
    ],
    requirements: [
      '海洋地质、勘查技术与工程、地球物理学、石油工程等相关专业。',
      '熟练使用 Landmark、Petrel 等专业地质和地震解释软件。'
    ],
    softSkills: ['海上抗压', '踏实钻研', '严格执行规章'],
    salaryDetail: '年薪 13-17万（上平台期间享受按天计发的高额离岸海上工作专项补贴），高标准海陆班车，六险二金。',
    careerPath: ['勘探员/钻井技术员 (0-2年)', '资深勘探师 (2-5年)', '地质总监/平台长 (5-10年)'],
    fitPersonality: ['现实耐劳', '常规型', '注重规则'],
    howToPrepare: {
      timeline: ['9-10月网申投递', '10月下旬中海油统一大笔试', '11月中下旬面试体检', '12月公示拟录'],
      exam: '包含行测言语、图形逻辑、综合英语及加测的石油地质基础多选。',
      interview: '考查毕业学术论文及现场应变。针对上海、广州等面试点会细致考核对海上作业、半月轮班制的接受度。'
    },
    relatedJobs: ['机械研发工程师', '新能源技术岗', '电气工程技术岗']
  },
  {
    id: 'ctrip-33',
    title: '境外旅游产品规划师',
    company: '携程集团 (Ctrip)',
    city: '上海',
    type: 'internet',
    overallMatch: 80,
    resumeMatch: 83,
    personalityMatch: 77,
    salaryRange: '年薪20-30万',
    difficultyRating: 4,
    tags: ['旅游龙头', '带薪考察', '弹性工作', '全额五险一金'],
    summary: '负责携程全球机酒包套、定制境外跟团线路开发、以及针对年轻白领“机票+门票”创新自由行产品的策略制定。',
    responsibilities: [
      '调研境外目的地最新玩乐消费热点，洽谈境外地接社及境外租车、酒店等供应商资源。',
      '设计境外旅游爆款，制定拼团出行溢价，撰写生动有吸引力的出游详情 PRD。'
    ],
    requirements: [
      '专业不限，外语类（英/日/韩/法/西）、国际贸易、旅游管理相关专业优先。',
      '具备出色的外语口语沟通及跨国商务谈判力，热爱旅行，具有丰富的个人自助境外游经验。'
    ],
    softSkills: ['外向亲和', '精算核算', '极度细致'],
    salaryDetail: '年薪 20-30万，外加高额境外踩线实地考察差旅全包福利。全额五险一金、携程内部出游专享大额折扣券。',
    careerPath: ['产品助理 (0-2年)', '目的地类目规划师 (2-5年)', '旅游事业部总经理 (5年以上)'],
    fitPersonality: ['外向型', '开放性高', '宜人度高'],
    howToPrepare: {
      timeline: ['8-9月内推正式批网申', '9月携程综合大笔试', '10月一轮业务面，二轮境外商务情景模拟英文面', '11月发放录用'],
      exam: '包含通用行测题，加设大篇幅的英语专业翻译和境外突发投诉处置策略主观题。',
      interview: '极看重外语流利度与情商沟通。面试现场会加设境外地接社坐地起价的模拟商务谈判情景，重点评估博弈抗压实力。'
    },
    relatedJobs: ['产品经理 (高成长线)', '平台运营专员', '商业化运营经理']
  }
];

export const MOCK_QUESTIONS: AssessmentQuestion[] = [
  { id: 1, text: '我对抽象的理论、科学概念和深度的思想探讨很感兴趣。', dimension: 'O' },
  { id: 2, text: '我喜欢按照明确的计划、日程表和固定的规则来开展工作，而不是随性而为。', dimension: 'C' },
  { id: 3, text: '在面对突发危机或巨大的工作压力时，我很容易感到焦虑、紧张或情绪波动。', dimension: 'N' },
  { id: 4, text: '我喜欢主动结交新朋友，并在社交场合、团队讨论中扮演活跃气氛的角色。', dimension: 'E' },
  { id: 5, text: '在团队合作中，我总是尽量迎合他人的意见，避免发生冲突或争论。', dimension: 'A' },
  { id: 6, text: '我倾向于从艺术、诗歌、自然风光和新奇的事物中获得心灵层面的启发。', dimension: 'O' },
  { id: 7, text: '我是一个十分注重细节的人，甚至对微小的瑕疵都有所追求，必须做到完美无瑕。', dimension: 'C' },
  { id: 8, text: '在面对否定、批评或挫折时，我能够迅速调整好心态，保持内心平静与积极。', dimension: 'N' }, // Reversed dimension mapping is handled in scoring
  { id: 9, text: '相比于热闹的派对或多人的活动，我更享受独自一人看书、写代码或安静独处。', dimension: 'E' },
  { id: 10, text: '我相信大多数人都是善良和真诚的，我很容易对他人产生信任感并给予帮助。', dimension: 'A' },
  { id: 11, text: '我很享受探索和学习一门全新的、我从未涉足过的知识领域的快感。', dimension: 'O' },
  { id: 12, text: '在做决定之前，我一定会经过极其缜密的思考，评估各种潜在风险和计划，极少冲动。', dimension: 'C' },
  { id: 13, text: '我经常会无缘无故地感到有点沮丧、疲惫或者情绪低落，即使并没有发生什么坏事。', dimension: 'N' },
  { id: 14, text: '我发现当着许多人的面发表长篇演讲、展示汇报会让我感到极其兴奋和充满能量。', dimension: 'E' },
  { id: 15, text: '我更喜欢结构规范、规章制度完善、职能分工极其清晰透明的团队。', dimension: 'C' }
];

export const DEFAULT_PERSONALITY_RESULT: PersonalityResult = {
  typeTitle: '尽责稳定型 (C-N Core)',
  description: '你做事认真负责，计划性强，情绪平稳、行事稳重。你非常擅长在规范有序、分工清晰的环境中，通过日复一日的坚持与严谨，发挥出长期的战略价值，是团队中极其可靠的中流砥柱。',
  radarScores: [
    { dimension: '尽责性 (Conscientiousness)', score: 92, avg: 65 },
    { dimension: '情绪稳定性 (Emotional Stability)', score: 85, avg: 60 },
    { dimension: '宜人性 (Agreeableness)', score: 78, avg: 72 },
    { dimension: '开放性 (Openness to Experience)', score: 65, avg: 68 },
    { dimension: '外向性 (Extraversion)', score: 58, avg: 62 }
  ],
  industryFit: {
    stateOwned: 88,
    internet: 65
  },
  hollandCode: 'RCI',
  hollandTags: ['现实型 (Realistic)', '常规型 (Conventional)', '研究型 (Investigative)'],
  deepInterpretation: {
    summary: '你拥有非常突出的自律与责任感。在接受任务后，你会习惯性地制定详细的时间节点并百分百贯彻执行，极少出现拖延或遗漏。你情绪极具韧性，遇到挫折、领导施压时，能以极高的大局观与稳定性承受并化解压力，非常符合国资央企、国家重大技术骨干岗位以及大型合规性高要求团队的期待。',
    advantages: [
      '【执行先锋】：极强的自驱与执行力，保证复杂交付不打折扣、质量上乘。',
      '【定海神针】：面对突发、杂乱、高频的突击任务能保持从容，是优秀的风险控制者。',
      '【秩序专家】：善于优化既定工作流，整理极度清晰的知识框架、标准方案。'
    ]
  }
};

export const DEFAULT_RESUME_DATA: ResumeData = {
  name: '张同学',
  school: '清华大学 / 北京邮电大学',
  major: '计算机科学与技术 / 软件工程',
  graduationYear: '2027届 (2023级本科)',
  skills: ['Python', 'Java', 'SQL', 'Machine Learning', 'React', 'Linux', 'Spring Boot'],
  internships: [
    {
      company: '字节跳动 (ByteDance)',
      role: '后端开发实习生',
      duration: '3个月 (2025.06 - 2025.09)'
    },
    {
      company: '腾讯科技 (Tencent)',
      role: '数据分析实习生',
      duration: '2个月 (2025.12 - 2026.02)'
    }
  ],
  projects: [
    {
      name: '分布式网关高可用重构项目',
      role: '后端主力研发',
      tech: 'Go, gRPC, Redis, Docker'
    },
    {
      name: '智能招聘大模型推荐平台',
      role: '算法与全栈核心开发',
      tech: 'Python, Django, React, PyTorch'
    }
  ],
  inferredDirection: '互联网后端开发 / 大数据工程 / 央国企金融科技IT',
  targetCities: ['北京', '上海', '南京', '杭州']
};
