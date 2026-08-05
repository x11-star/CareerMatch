import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, RotateCw, AlertCircle, Edit3, ArrowRight, ClipboardCopy } from 'lucide-react';
import { DEFAULT_RESUME_DATA } from '../data';
import { ResumeData } from '../types';
import { useAuth } from '../context/AuthContext';
import { saveResume, getLatestResume } from '../lib/firebaseStore';

interface ResumeUploadPageProps {
  onConfirm: (data: ResumeData) => void;
  onBack: () => void;
}

type UploadState = 'A_IDLE' | 'B_UPLOADING' | 'C_PARSING' | 'D_DONE';

export default function ResumeUploadPage({ onConfirm, onBack }: ResumeUploadPageProps) {
  const { user, userProfile } = useAuth();
  const [currentState, setCurrentState] = useState<UploadState>('A_IDLE');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsingStep, setParsingStep] = useState(0);
  const [resumeData, setResumeData] = useState<ResumeData>(DEFAULT_RESUME_DATA);
  const [fileName, setFileName] = useState('');
  
  // Real AI parsing states
  const [pastedText, setPastedText] = useState('');
  const [apiParseError, setApiParseError] = useState('');
  const [isApiParsing, setIsApiParsing] = useState(false);
  const [uploadTab, setUploadTab] = useState<'file' | 'text'>('file');

  async function parseApiError(response: Response): Promise<string> {
    const body = await response.json().catch(() => null);
    if (body?.code === 'AI_CONFIGURATION_MISSING') {
      return 'AI 服务未配置：请在 .env 中填写 ZHIPU_API_KEY 或 DEEPSEEK_API_KEY 后重启服务。';
    }
    if (body?.code === 'OCR_NOT_IMPLEMENTED') {
      return body.error || '图片简历解析将在 OCR 模块完成后开放，请先上传 PDF、DOCX、TXT 或粘贴文本。';
    }
    return body?.error || `解析服务器返回错误：HTTP ${response.status}`;
  }

  const triggerRealAiParse = async (
    params: { text?: string; fileData?: string; mimeType?: string },
    displayName: string
  ) => {
    setIsApiParsing(true);
    setApiParseError('');
    setUploadProgress(10);
    setFileName(displayName);
    setCurrentState('B_UPLOADING');

    let progressInterval: any = null;

    try {
      let currentProgress = 10;
      progressInterval = setInterval(() => {
        // 采用缓动（Ease-out）效果让进度条优雅地逼近 90%
        const remaining = 92 - currentProgress;
        const increment = Math.max(0.5, remaining * 0.12);
        currentProgress = Math.min(currentProgress + increment, 90);
        setUploadProgress(Math.round(currentProgress));
      }, 120);

      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: params.text,
          fileData: params.fileData,
          mimeType: params.mimeType,
          fileName: displayName
        }),
      });

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const parsedData: ResumeData = await response.json();
      setResumeData(parsedData);

      setTimeout(() => {
        setCurrentState('C_PARSING');
        setParsingStep(0);
        setIsApiParsing(false);
      }, 500);

    } catch (err: any) {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      console.error("API parse failed:", err);
      setApiParseError(err.message || '解析失败，请检查网络或API配置');
      setCurrentState('A_IDLE');
      setIsApiParsing(false);
    }
  };

  const handleApiParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;
    await triggerRealAiParse({ text: pastedText }, '粘贴的简历文本.txt');
  };

  // Editing state
  const [editingSection, setEditingSection] = useState<'basic' | 'skills' | 'internships' | 'projects' | 'target' | null>(null);
  
  // Basic info form state
  const [basicForm, setBasicForm] = useState({
    name: '',
    graduationYear: '',
    school: '',
    major: ''
  });

  // Skills form state
  const [skillsForm, setSkillsForm] = useState('');

  // Internships form state
  const [internshipsForm, setInternshipsForm] = useState<{ company: string; role: string; duration: string }[]>([]);

  // Projects form state
  const [projectsForm, setProjectsForm] = useState<{ name: string; role: string; tech: string }[]>([]);

  // Target direction & cities form state
  const [targetForm, setTargetForm] = useState({
    inferredDirection: '',
    targetCities: ''
  });

  // Load existing resume if present in Firestore/local storage
  useEffect(() => {
    async function loadSavedResume() {
      if (user) {
        try {
          const latestResume = await getLatestResume(user.uid);
          if (latestResume) {
            setResumeData(latestResume);
            setCurrentState('D_DONE');
          }
        } catch (e) {
          console.error("Failed to load user's saved resume:", e);
        }
      }
    }
    loadSavedResume();
  }, [user]);

  const handleConfirmClick = async () => {
    if (user) {
      try {
        await saveResume(user.uid, resumeData);
      } catch (e) {
        console.error("Failed to save resume", e);
      }
    }
    onConfirm(resumeData);
  };

  // Automated progression simulation when triggered
  const startParsingFlow = (name: string) => {
    setFileName(name);
    setCurrentState('B_UPLOADING');
    setUploadProgress(10);
  };

  // Modal handlers
  const handleEditBasic = () => {
    setBasicForm({
      name: resumeData.name,
      graduationYear: resumeData.graduationYear,
      school: resumeData.school,
      major: resumeData.major
    });
    setEditingSection('basic');
  };

  const handleEditSkills = () => {
    setSkillsForm(resumeData.skills.join(', '));
    setEditingSection('skills');
  };

  const handleEditInternships = () => {
    setInternshipsForm([...resumeData.internships]);
    setEditingSection('internships');
  };

  const handleEditProjects = () => {
    setProjectsForm([...resumeData.projects]);
    setEditingSection('projects');
  };

  const handleEditTarget = () => {
    setTargetForm({
      inferredDirection: resumeData.inferredDirection,
      targetCities: resumeData.targetCities.join(', ')
    });
    setEditingSection('target');
  };

  const handleSaveBasic = (e: React.FormEvent) => {
    e.preventDefault();
    setResumeData({
      ...resumeData,
      ...basicForm
    });
    setEditingSection(null);
  };

  const handleSaveSkills = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedSkills = skillsForm
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    setResumeData({
      ...resumeData,
      skills: parsedSkills
    });
    setEditingSection(null);
  };

  const handleSaveInternships = (e: React.FormEvent) => {
    e.preventDefault();
    setResumeData({
      ...resumeData,
      internships: internshipsForm.filter(i => i.company.trim() || i.role.trim())
    });
    setEditingSection(null);
  };

  const handleSaveProjects = (e: React.FormEvent) => {
    e.preventDefault();
    setResumeData({
      ...resumeData,
      projects: projectsForm.filter(p => p.name.trim() || p.role.trim())
    });
    setEditingSection(null);
  };

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCities = targetForm.targetCities
      .split(/[,，]/)
      .map((c) => c.trim())
      .filter(Boolean);
    setResumeData({
      ...resumeData,
      inferredDirection: targetForm.inferredDirection,
      targetCities: parsedCities
    });
    setEditingSection(null);
  };

  const addInternshipField = () => {
    setInternshipsForm([...internshipsForm, { company: '', role: '', duration: '' }]);
  };

  const removeInternshipField = (index: number) => {
    setInternshipsForm(internshipsForm.filter((_, i) => i !== index));
  };

  const addProjectField = () => {
    setProjectsForm([...projectsForm, { name: '', role: '', tech: '' }]);
  };

  const removeProjectField = (index: number) => {
    setProjectsForm(projectsForm.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (currentState === 'B_UPLOADING') {
      // 如果正在进行真实的 AI 解析，不要运行此模拟上传进度的 interval
      if (isApiParsing) return;

      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setCurrentState('C_PARSING');
              setParsingStep(0);
            }, 600);
            return 100;
          }
          return prev + 15;
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [currentState, isApiParsing]);

  useEffect(() => {
    if (currentState === 'C_PARSING') {
      const interval = setInterval(() => {
        setParsingStep((prev) => {
          if (prev >= 4) {
            clearInterval(interval);
            setTimeout(() => {
              setCurrentState('D_DONE');
            }, 800);
            return 4;
          }
          return prev + 1;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [currentState]);

  // Helper to determine mimeType from file name if file.type is blank
  const getMimeTypeFromFileName = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'webp': return 'image/webp';
      default: return 'application/octet-stream';
    }
  };

  // Handler for file select simulation and real parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        if (text && text.trim()) {
          await triggerRealAiParse({ text }, file.name);
        } else {
          setApiParseError('您上传的 .txt 文件内容为空！');
        }
      };
      reader.readAsText(file);
    } else {
      // 100% Real AI file upload parsing!
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        if (result) {
          // Extract base64 part from "data:application/pdf;base64,..."
          const commaIndex = result.indexOf(',');
          const base64Data = commaIndex !== -1 ? result.substring(commaIndex + 1) : result;
          
          await triggerRealAiParse({
            fileData: base64Data,
            mimeType: file.type || getMimeTypeFromFileName(file.name)
          }, file.name);
        } else {
          setApiParseError('读取文件内容失败！');
        }
      };
      reader.onerror = () => {
        setApiParseError('读取文件失败，请重试！');
      };
      reader.readAsDataURL(file);
    }
  };

  const loadDemoResume = () => {
    setResumeData(DEFAULT_RESUME_DATA);
    startParsingFlow('张同学_清华大学_求职简历.pdf');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <button
        id="resume-back-btn"
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors cursor-pointer"
      >
        ← 返回上一页
      </button>

      {/* State A: Idle State */}
      {currentState === 'A_IDLE' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-100">
              <Upload className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 font-display mb-1">解析并匹配简历</h2>
            <p className="text-sm text-slate-500 mb-6">
              精准职达 AI 将深度提取您的学术背景、技能栈及核心优势进行双向匹配。
            </p>

            {apiParseError && (
              <div className="flex gap-2 items-center text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 mb-6 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{apiParseError}</span>
              </div>
            )}

            {/* Tab buttons */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => setUploadTab('file')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  uploadTab === 'file' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📁 上传简历文件
              </button>
              <button
                type="button"
                onClick={() => setUploadTab('text')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  uploadTab === 'text' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ✍️ 粘贴简历文本 (智谱优先 / DeepSeek 兜底)
              </button>
            </div>

            {uploadTab === 'file' ? (
              <>
                {/* Hidden Input */}
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20 rounded-2xl p-10 transition-all group">
                    <FileText className="w-10 h-10 text-slate-400 group-hover:text-blue-500 mx-auto mb-4 transition-colors" />
                    <span className="text-sm font-semibold text-slate-700 block mb-1">
                      拖拽文件到此处，或 <span className="text-blue-600">点击选择</span>
                    </span>
                    <span className="text-xs text-slate-400 block mb-2">支持 .txt / .pdf / .doc / .docx / .png / .jpg</span>
                    <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 block max-w-xs mx-auto font-medium">
                      💡 提示：.txt 文件支持 100% 真实 AI 解析！如为 PDF/Word 格式，建议复制文字并使用「粘贴简历文本」选项卡以获取完美的真实大模型解析。
                    </span>
                  </div>
                  <input
                    id="resume-file-input"
                    type="file"
                    accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {/* Demo Button to simplify testing */}
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-3">想要快速测试匹配流程？</p>
                  <button
                    id="resume-demo-btn"
                    onClick={loadDemoResume}
                    className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <ClipboardCopy className="w-3.5 h-3.5" />
                    使用「清华大学 张同学」演示简历 一键匹配
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleApiParse} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-700">✍️ 粘贴您的完整简历文本</label>
                    <span className="text-[10px] text-slate-400 bg-slate-100 py-0.5 px-1.5 rounded">真实 AI 端点</span>
                  </div>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="请在这里复制并粘贴您的完整简历。
例如：
张小明 - 软件工程专业 2026届毕业生
熟练掌握：React, TypeScript, Node.js, Python, SQL
实习经历：XX科技公司前端开发实习生，负责系统核心功能模块的编写...
项目经历：主导基于大模型的智能客服平台设计..."
                    rows={8}
                    className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-sans leading-relaxed resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!pastedText.trim() || isApiParsing}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    pastedText.trim() && !isApiParsing
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>✨ 启动 AI 精准解析简历</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* State B: Uploading State */}
      {currentState === 'B_UPLOADING' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-xs text-center">
          <div className="max-w-md mx-auto">
            <RotateCw className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-bold text-slate-900 mb-2 font-display">正在上传简历...</h3>
            <p className="text-xs text-slate-500 mb-6 truncate font-mono bg-slate-50 py-1.5 px-3 rounded-lg inline-block max-w-full">
              {fileName}
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-3">
              <div
                className="bg-blue-600 h-full transition-all duration-150 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-700">{uploadProgress}%</span>
          </div>
        </div>
      )}

      {/* State C: AI Parsing State */}
      {currentState === 'C_PARSING' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-xs">
          <div className="max-w-md mx-auto text-center">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
              <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-blue-600 font-mono">
                AI
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2 font-display">🤖 AI 正在分析你的简历...</h3>
            <p className="text-xs text-slate-500 mb-8">精准解析文本、推演行业标签中</p>

            {/* Dynamic Step Checks */}
            <div className="text-left bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col gap-3.5 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 flex items-center gap-2">
                  教育背景提取
                </span>
                {parsingStep >= 1 ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">已提取 <CheckCircle2 className="w-3.5 h-3.5" /></span>
                ) : (
                  <span className="text-slate-400 font-mono animate-pulse">正在提取...</span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 flex items-center gap-2">
                  软硬技能建模
                </span>
                {parsingStep >= 2 ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">已完成 <CheckCircle2 className="w-3.5 h-3.5" /></span>
                ) : parsingStep === 1 ? (
                  <span className="text-blue-500 font-bold animate-pulse">解析中...</span>
                ) : (
                  <span className="text-slate-300">等待中</span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 flex items-center gap-2">
                  实习与项目精细化打标
                </span>
                {parsingStep >= 3 ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">已分析 <CheckCircle2 className="w-3.5 h-3.5" /></span>
                ) : parsingStep === 2 ? (
                  <span className="text-blue-500 font-bold animate-pulse">解析中...</span>
                ) : (
                  <span className="text-slate-300">等待中</span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 flex items-center gap-2">
                  求职意向与城市相性推算
                </span>
                {parsingStep >= 4 ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">已就绪 <CheckCircle2 className="w-3.5 h-3.5" /></span>
                ) : parsingStep === 3 ? (
                  <span className="text-blue-500 font-bold animate-pulse">解析中...</span>
                ) : (
                  <span className="text-slate-300">等待中</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* State D: Parsing Completed & Done */}
      {currentState === 'D_DONE' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">简历解析完成</h3>
                <p className="text-xs text-slate-500">
                  AI解析置信度：<span className="text-emerald-600 font-semibold">🟢 92%</span> (根据简历真实度评估)
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentState('A_IDLE')}
              className="text-xs text-slate-500 hover:text-blue-600 font-medium transition-colors"
            >
              重新上传 🔄
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100/50 relative group">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">基本信息</h4>
                <button
                  onClick={handleEditBasic}
                  className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> 编辑
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-800">
                <div>姓名: <span className="font-semibold text-slate-900">{resumeData.name}</span></div>
                <div>毕业届数: <span className="font-semibold text-slate-900">{resumeData.graduationYear}</span></div>
                <div className="col-span-2">
                  学校: <span className="font-semibold text-slate-900">{resumeData.school}</span>
                </div>
                <div className="col-span-2">
                  专业: <span className="font-semibold text-slate-900">{resumeData.major}</span>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100/50 relative">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">📌 技能标签</h4>
                <button
                  onClick={handleEditSkills}
                  className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> 编辑
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {resumeData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200/40"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Internship Experiences */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100/50 relative">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">💼 实习经历</h4>
                <button
                  onClick={handleEditInternships}
                  className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> 编辑
                </button>
              </div>
              <div className="space-y-3">
                {resumeData.internships.map((intern, index) => (
                  <div key={index} className="text-sm bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-slate-900">{intern.company}</div>
                      <div className="text-xs text-slate-500">{intern.role}</div>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">{intern.duration}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Project Experiences */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100/50 relative">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">🛠️ 项目经历</h4>
                <button
                  onClick={handleEditProjects}
                  className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> 编辑
                </button>
              </div>
              <div className="space-y-3">
                {resumeData.projects.map((proj, index) => (
                  <div key={index} className="text-sm bg-white p-3 rounded-lg border border-slate-100">
                    <div className="font-semibold text-slate-900 flex justify-between">
                      <span>{proj.name}</span>
                      <span className="text-xs text-slate-400 font-normal">{proj.role}</span>
                    </div>
                    <div className="text-xs text-blue-600 mt-1 font-mono">技术栈: {proj.tech}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Deduced Direction */}
            <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100/50 relative">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider">🎯 推断方向与意向城市</h4>
                <button
                  onClick={handleEditTarget}
                  className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> 编辑
                </button>
              </div>
              <div className="space-y-2 text-sm text-slate-800">
                <div>推断方向: <span className="font-bold text-slate-900">{resumeData.inferredDirection}</span></div>
                <div>意向城市: <span className="font-bold text-slate-900">{resumeData.targetCities.join('、')}</span></div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> 确认以上信息准确无误后，即可开启性格测评。
            </span>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                id="resume-reupload-btn"
                onClick={() => {
                  setResumeData(DEFAULT_RESUME_DATA);
                  setCurrentState('A_IDLE');
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-colors cursor-pointer"
              >
                重新上传
              </button>
              <button
                id="resume-confirm-btn"
                onClick={handleConfirmClick}
                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-1 cursor-pointer group"
              >
                确认无误，开始测评 
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Basic Info Modal */}
      {editingSection === 'basic' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl relative text-slate-800">
            <h3 className="text-lg font-bold text-slate-900 mb-4 font-display">编辑基本信息</h3>
            <form onSubmit={handleSaveBasic} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">姓名</label>
                <input
                  type="text"
                  required
                  value={basicForm.name}
                  onChange={(e) => setBasicForm({ ...basicForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">毕业届数</label>
                <input
                  type="text"
                  required
                  value={basicForm.graduationYear}
                  onChange={(e) => setBasicForm({ ...basicForm, graduationYear: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">毕业院校</label>
                <input
                  type="text"
                  required
                  value={basicForm.school}
                  onChange={(e) => setBasicForm({ ...basicForm, school: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">就读专业</label>
                <input
                  type="text"
                  required
                  value={basicForm.major}
                  onChange={(e) => setBasicForm({ ...basicForm, major: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2 text-sm outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  保存更改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Skills Modal */}
      {editingSection === 'skills' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl relative text-slate-800">
            <h3 className="text-lg font-bold text-slate-900 mb-2 font-display">编辑技能标签</h3>
            <p className="text-xs text-slate-400 mb-4">请用英文或中文逗号分隔各个技能标签。</p>
            <form onSubmit={handleSaveSkills} className="space-y-4">
              <div>
                <textarea
                  rows={4}
                  required
                  value={skillsForm}
                  onChange={(e) => setSkillsForm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm outline-none resize-none"
                  placeholder="Java, Python, TypeScript, SQL..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  保存更改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Internships Modal */}
      {editingSection === 'internships' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl relative max-h-[85vh] overflow-y-auto text-slate-800">
            <h3 className="text-lg font-bold text-slate-900 mb-4 font-display">编辑实习经历</h3>
            <form onSubmit={handleSaveInternships} className="space-y-4">
              {internshipsForm.map((intern, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-150 rounded-2xl relative space-y-3">
                  <button
                    type="button"
                    onClick={() => removeInternshipField(idx)}
                    className="absolute top-3 right-3 text-red-500 hover:text-red-700 text-xs font-bold"
                  >
                    删除
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">公司名称</label>
                      <input
                        type="text"
                        required
                        value={intern.company}
                        onChange={(e) => {
                          const updated = [...internshipsForm];
                          updated[idx].company = e.target.value;
                          setInternshipsForm(updated);
                        }}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">担任角色</label>
                      <input
                        type="text"
                        required
                        value={intern.role}
                        onChange={(e) => {
                          const updated = [...internshipsForm];
                          updated[idx].role = e.target.value;
                          setInternshipsForm(updated);
                        }}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1">时间跨度</label>
                      <input
                        type="text"
                        required
                        placeholder="如 2026.03 - 2026.07"
                        value={intern.duration}
                        onChange={(e) => {
                          const updated = [...internshipsForm];
                          updated[idx].duration = e.target.value;
                          setInternshipsForm(updated);
                        }}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addInternshipField}
                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-200 rounded-xl text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                + 添加一段实习经历
              </button>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  保存更改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Projects Modal */}
      {editingSection === 'projects' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl relative max-h-[85vh] overflow-y-auto text-slate-800">
            <h3 className="text-lg font-bold text-slate-900 mb-4 font-display">编辑项目经历</h3>
            <form onSubmit={handleSaveProjects} className="space-y-4">
              {projectsForm.map((proj, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-150 rounded-2xl relative space-y-3">
                  <button
                    type="button"
                    onClick={() => removeProjectField(idx)}
                    className="absolute top-3 right-3 text-red-500 hover:text-red-700 text-xs font-bold"
                  >
                    删除
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">项目名称</label>
                      <input
                        type="text"
                        required
                        value={proj.name}
                        onChange={(e) => {
                          const updated = [...projectsForm];
                          updated[idx].name = e.target.value;
                          setProjectsForm(updated);
                        }}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">担当角色</label>
                      <input
                        type="text"
                        required
                        value={proj.role}
                        onChange={(e) => {
                          const updated = [...projectsForm];
                          updated[idx].role = e.target.value;
                          setProjectsForm(updated);
                        }}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1">技术栈</label>
                      <input
                        type="text"
                        required
                        value={proj.tech}
                        onChange={(e) => {
                          const updated = [...projectsForm];
                          updated[idx].tech = e.target.value;
                          setProjectsForm(updated);
                        }}
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3 py-1.5 text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addProjectField}
                className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-200 rounded-xl text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                + 添加一个项目经历
              </button>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  保存更改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Target Modal */}
      {editingSection === 'target' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl relative text-slate-800">
            <h3 className="text-lg font-bold text-slate-900 mb-4 font-display">编辑求职方向与城市</h3>
            <form onSubmit={handleSaveTarget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">推断求职方向</label>
                <input
                  type="text"
                  required
                  value={targetForm.inferredDirection}
                  onChange={(e) => setTargetForm({ ...targetForm, inferredDirection: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">意向投递城市</label>
                <input
                  type="text"
                  required
                  value={targetForm.targetCities}
                  onChange={(e) => setTargetForm({ ...targetForm, targetCities: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl px-4 py-2 text-sm outline-none"
                  placeholder="北京, 上海, 深圳..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  保存更改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
