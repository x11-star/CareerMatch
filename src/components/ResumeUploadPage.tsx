import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Edit3, RotateCw, Upload } from 'lucide-react';
import { DEFAULT_RESUME_DATA } from '../data';
import { ResumeData } from '../types';
import { useAuth } from '../context/AuthContext';
import { saveResume } from '../lib/userDataStore';
import PageHeader from './ui/PageHeader';
import SectionPanel from './ui/SectionPanel';
import StatusBanner from './ui/StatusBanner';
import Toast from './ui/Toast';
import DialogFrame from './ui/DialogFrame';
import QualificationsFields from './QualificationsFields';
import { resumeParseErrorMessage, ResumeParseUserError } from '../lib/resumeParseError';

type UploadState = 'A_IDLE' | 'B_UPLOADING' | 'C_PARSING' | 'D_DONE';

interface ResumeUploadPageProps {
  onConfirm: (data: ResumeData) => void;
  onBack: () => void;
  initialResume?: ResumeData | null;
}

export default function ResumeUploadPage({ onConfirm, onBack, initialResume }: ResumeUploadPageProps) {
  const { user } = useAuth();
  const [currentState, setCurrentState] = useState<UploadState>(initialResume ? 'D_DONE' : 'A_IDLE');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsingStep, setParsingStep] = useState(0);
  const [resumeData, setResumeData] = useState<ResumeData>(initialResume || DEFAULT_RESUME_DATA);
  const [fileName, setFileName] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [apiParseError, setApiParseError] = useState('');
  const [isApiParsing, setIsApiParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const saveLock = useRef(false);
  const mounted = useRef(true);
  const [uploadTab, setUploadTab] = useState<'file' | 'text'>('file');
  const [toast, setToast] = useState<{ title: string; description?: string; tone?: 'info' | 'success' | 'warning' } | null>(null);
  const [editingSection, setEditingSection] = useState<'basic' | 'skills' | 'internships' | 'projects' | 'target' | null>(null);
  const [basicForm, setBasicForm] = useState({ name: '', graduationYear: '', school: '', major: '' });
  const [skillsForm, setSkillsForm] = useState('');
  const [internshipsForm, setInternshipsForm] = useState<{ company: string; role: string; duration: string }[]>([]);
  const [projectsForm, setProjectsForm] = useState<{ name: string; role: string; tech: string }[]>([]);
  const [targetForm, setTargetForm] = useState({ inferredDirection: '', targetCities: '' });

  const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
  const SUPPORTED_EXTENSIONS = ['txt', 'pdf', 'docx', 'png', 'jpg', 'jpeg', 'webp'];

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (currentState !== 'B_UPLOADING' || isApiParsing) return;
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
  }, [currentState, isApiParsing]);

  useEffect(() => {
    if (currentState !== 'C_PARSING') return;
    const interval = setInterval(() => {
      setParsingStep((prev) => {
        if (prev >= 4) {
          clearInterval(interval);
          setTimeout(() => setCurrentState('D_DONE'), 500);
          return 4;
        }
        return prev + 1;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [currentState]);

  async function parseApiError(response: Response): Promise<string> {
    const body = await response.json().catch(() => null);
    return resumeParseErrorMessage(body?.code, response.status);
  }

  const triggerRealAiParse = async (params: { text?: string; fileData?: string; mimeType?: string }, displayName: string) => {
    setIsApiParsing(true);
    setApiParseError('');
    setUploadProgress(10);
    setFileName(displayName);
    setCurrentState('B_UPLOADING');

    let progressInterval: ReturnType<typeof setInterval> | null = null;

    try {
      let currentProgress = 10;
      progressInterval = setInterval(() => {
        const remaining = 92 - currentProgress;
        const increment = Math.max(0.5, remaining * 0.12);
        currentProgress = Math.min(currentProgress + increment, 90);
        setUploadProgress(Math.round(currentProgress));
      }, 120);

      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, fileName: displayName }),
      });

      if (progressInterval) clearInterval(progressInterval);
      progressInterval = null;
      setUploadProgress(100);

      if (!response.ok) throw new ResumeParseUserError(await parseApiError(response));

      const parsedData: ResumeData = await response.json();
      setResumeData(parsedData);
      setTimeout(() => {
        setCurrentState('C_PARSING');
        setParsingStep(0);
        setIsApiParsing(false);
      }, 500);
    } catch (err: any) {
      if (progressInterval) clearInterval(progressInterval);
      console.error('API parse failed:', err);
      setApiParseError(err instanceof ResumeParseUserError ? err.message : '暂时没能连接到简历读取服务。请稍后重试，也可以先手动填写。');
      setCurrentState('A_IDLE');
      setIsApiParsing(false);
    }
  };

  const handleApiParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;
    await triggerRealAiParse({ text: pastedText }, '粘贴的简历文本.txt');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      setApiParseError('不支持的文件格式。请上传 PDF、DOCX、TXT、JPG、PNG 或 WebP。');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setApiParseError('文件超过 8MB。请压缩后重新上传，或粘贴简历文本。');
      return;
    }

    if (file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        if (text?.trim()) {
          await triggerRealAiParse({ text }, file.name);
        } else {
          setApiParseError('你上传的 .txt 文件内容为空，请换一个文件或粘贴简历文本。');
        }
      };
      reader.readAsText(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      if (!result) {
        setApiParseError('读取文件内容失败，请重试。');
        return;
      }
      const commaIndex = result.indexOf(',');
      const base64Data = commaIndex !== -1 ? result.substring(commaIndex + 1) : result;
      await triggerRealAiParse({ fileData: base64Data, mimeType: file.type || getMimeTypeFromFileName(file.name) }, file.name);
    };
    reader.onerror = () => setApiParseError('读取文件失败，请重试。');
    reader.readAsDataURL(file);
  };

  const handleConfirmClick = async () => {
    if (saveLock.current) return;
    saveLock.current = true;
    setIsSaving(true);
    setSaveError('');
    try { await saveResume(user, resumeData); if (mounted.current) onConfirm(resumeData); }
    catch (error: any) { setSaveError(error?.message || '简历未保存，请重试；当前内容仍保留。'); }
    finally { saveLock.current = false; setIsSaving(false); }
  };

  const handleEditBasic = () => {
    setBasicForm({ name: resumeData.name, graduationYear: resumeData.graduationYear, school: resumeData.school, major: resumeData.major });
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
    setTargetForm({ inferredDirection: resumeData.inferredDirection, targetCities: resumeData.targetCities.join(', ') });
    setEditingSection('target');
  };

  const handleSaveBasic = (e: React.FormEvent) => {
    e.preventDefault();
    setResumeData({ ...resumeData, ...basicForm });
    setEditingSection(null);
  };

  const handleSaveSkills = (e: React.FormEvent) => {
    e.preventDefault();
    setResumeData({ ...resumeData, skills: skillsForm.split(/[,，]/).map((s) => s.trim()).filter(Boolean) });
    setEditingSection(null);
  };

  const handleSaveInternships = (e: React.FormEvent) => {
    e.preventDefault();
    setResumeData({ ...resumeData, internships: internshipsForm.filter((i) => i.company.trim() || i.role.trim() || i.duration.trim()) });
    setEditingSection(null);
  };

  const handleSaveProjects = (e: React.FormEvent) => {
    e.preventDefault();
    setResumeData({ ...resumeData, projects: projectsForm.filter((p) => p.name.trim() || p.role.trim() || p.tech.trim()) });
    setEditingSection(null);
  };

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    setResumeData({
      ...resumeData,
      inferredDirection: targetForm.inferredDirection,
      targetCities: targetForm.targetCities.split(/[,，]/).map((c) => c.trim()).filter(Boolean),
    });
    setEditingSection(null);
  };

  const addInternshipField = () => setInternshipsForm([...internshipsForm, { company: '', role: '', duration: '' }]);
  const removeInternshipField = (index: number) => setInternshipsForm(internshipsForm.filter((_, i) => i !== index));
  const addProjectField = () => setProjectsForm([...projectsForm, { name: '', role: '', tech: '' }]);
  const removeProjectField = (index: number) => setProjectsForm(projectsForm.filter((_, i) => i !== index));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {toast && (
        <Toast
          tone={toast.tone || 'info'}
          title={toast.title}
          description={toast.description}
          onDismiss={() => setToast(null)}
        />
      )}
      <button id="resume-back-btn" onClick={onBack} className="mb-6 text-sm font-medium text-career-muted hover:text-career-ink">
        ← 返回上一页
      </button>

      <PageHeader
        eyebrow="第一步 · 个人材料"
        title="完善个人材料"
        description="上传简历或直接填写，让职业推荐更贴近你的经历。"
      />

      {apiParseError && (
        <div className="mb-5">
          <StatusBanner tone="error" title="简历解析没有完成" description={apiParseError} />
        </div>
      )}

      {(currentState === 'B_UPLOADING' || currentState === 'C_PARSING' || isApiParsing) && (
        <div className="mb-5">
          <StatusBanner tone="pending" title="正在处理简历" description="如果是图片或扫描 PDF，识别时间会更长。" />
        </div>
      )}

      {currentState === 'A_IDLE' && (
        <div className="space-y-4">
          <SectionPanel title="添加简历" description="上传文件、粘贴文字，或直接填写简历信息。">
            <div className="mb-5 flex rounded-md bg-career-surface-muted p-1">
              <button type="button" onClick={() => setUploadTab('file')} className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold ${uploadTab === 'file' ? 'bg-career-surface text-career-ink' : 'text-career-muted'}`}>
                上传文件
              </button>
              <button type="button" onClick={() => setUploadTab('text')} className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold ${uploadTab === 'text' ? 'bg-career-surface text-career-ink' : 'text-career-muted'}`}>
                粘贴文本
              </button>
              <button type="button" onClick={() => { setResumeData({ ...DEFAULT_RESUME_DATA }); setCurrentState('D_DONE'); setApiParseError(''); }} className="flex-1 rounded-md px-3 py-2 text-xs font-semibold text-career-muted">手动填写</button>
            </div>

            {uploadTab === 'file' ? (
              <label className="block cursor-pointer">
                <div className="rounded-lg border border-dashed border-career-line bg-career-bg p-10 text-center transition-colors hover:bg-career-primary-soft/40">
                  <Upload className="mx-auto mb-4 h-9 w-9 text-career-primary" />
                  <span className="block text-sm font-semibold text-career-ink">拖拽文件到此处，或点击选择</span>
                  <span className="mt-2 block text-xs leading-5 text-career-muted">支持 .txt / .pdf / .docx / .png / .jpg / .webp，单文件不超过 8MB。</span>
                  <span className="mt-3 block text-xs leading-5 text-career-muted">图片和扫描 PDF 需要先识别文字，处理时间会稍长。</span>
                </div>
                <input id="resume-file-input" type="file" accept=".txt,.pdf,.docx,.png,.jpg,.jpeg,.webp" className="hidden" onChange={handleFileChange} />
              </label>
            ) : (
              <form onSubmit={handleApiParse} className="space-y-4">
                <label htmlFor="resume-pasted-text" className="block text-xs font-semibold text-career-ink">
                  简历正文
                </label>
                <textarea
                  id="resume-pasted-text"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="请在这里复制并粘贴你的完整简历文本。"
                  rows={10}
                  aria-describedby="resume-pasted-text-hint"
                  className="w-full resize-none rounded-md border border-career-line bg-career-bg p-4 text-sm leading-6 text-career-ink outline-none transition-colors placeholder:text-career-muted focus:border-career-primary"
                />
                <p id="resume-pasted-text-hint" className="text-xs leading-5 text-career-muted">
                  {pastedText.trim() ? '点击下方按钮启动 AI 解析。' : '需要先粘贴简历文本才能启动解析。'}
                </p>
                <button type="submit" disabled={!pastedText.trim() || isApiParsing} className="flex w-full items-center justify-center gap-2 rounded-md bg-career-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
                  启动 AI 解析简历 <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </SectionPanel>

          <p className="text-xs leading-6 text-career-muted">{user?.isGuest ? '确认后保存在当前浏览器，登录时可选择同步到账号。' : '确认后保存在你的账号。'}自动读取会将简历文字交给 AI 服务整理；你可以检查和修改后再保存。</p>
        </div>
      )}

      {currentState === 'B_UPLOADING' && <ProcessingPanel fileName={fileName} uploadProgress={uploadProgress} activeStep={0} />}
      {currentState === 'C_PARSING' && <ProcessingPanel fileName={fileName} uploadProgress={100} activeStep={parsingStep} />}

      {currentState === 'D_DONE' && (
        <div className="space-y-8">
          <StatusBanner tone="info" title="确认个人材料" description="请检查或填写字段，补充后保存。未提供的信息会标为待确认。" />

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionPanel title="基本信息" actions={<EditButton onClick={handleEditBasic} />}>
              <InfoGrid items={[
                ['姓名', showValue(resumeData.name)],
                ['毕业年份', showValue(resumeData.graduationYear)],
                ['学校', showValue(resumeData.school)],
                ['专业', showValue(resumeData.major)],
              ]} />
            </SectionPanel>

            <SectionPanel title="技能" actions={<EditButton onClick={handleEditSkills} />}>
              {resumeData.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {resumeData.skills.map((skill) => <span key={skill} className="rounded-md bg-career-primary-soft px-2.5 py-1 text-xs font-semibold text-career-primary">{skill}</span>)}
                </div>
              ) : <MissingText />}
            </SectionPanel>

            <SectionPanel title="实习" actions={<EditButton onClick={handleEditInternships} />}>
              <ExperienceList items={resumeData.internships.map((item) => ({ title: item.company, subtitle: item.role, meta: item.duration }))} />
            </SectionPanel>

            <SectionPanel title="项目" actions={<EditButton onClick={handleEditProjects} />}>
              <ExperienceList items={resumeData.projects.map((item) => ({ title: item.name, subtitle: item.role, meta: item.tech }))} />
            </SectionPanel>

            <SectionPanel title="求职方向" actions={<EditButton onClick={handleEditTarget} />}>
              <InfoGrid items={[
                ['推断方向', showValue(resumeData.inferredDirection)],
                ['目标城市', resumeData.targetCities.length > 0 ? resumeData.targetCities.join('、') : '未识别，可补充'],
              ]} />
            </SectionPanel>
          </div>

          <QualificationsFields value={resumeData.qualifications} onChange={qualifications => setResumeData({ ...resumeData, qualifications })} />
          <div className="flex flex-col items-start justify-between gap-4 border-t border-career-line pt-5 sm:flex-row sm:items-center">
            <p className="text-xs leading-5 text-career-muted">确认后继续性格测评；已完成测评的用户可以直接查看推荐。</p>
            <div className="flex w-full gap-3 sm:w-auto">
              <button id="resume-reupload-btn" onClick={() => { setResumeData(DEFAULT_RESUME_DATA); setCurrentState('A_IDLE'); }} className="flex-1 rounded-lg border border-career-line bg-career-surface px-5 py-2.5 text-sm font-semibold text-career-ink hover:bg-career-surface-muted sm:flex-none">
                重新上传
              </button>
              <button id="resume-confirm-btn" disabled={isSaving} onClick={handleConfirmClick} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-career-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 sm:flex-none">
                {isSaving ? '正在保存简历' : '保存并继续'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            {saveError && <div role="alert" className="mt-4"><StatusBanner tone="error" title="简历保存失败" description={saveError} /></div>}
          </div>
        </div>
      )}

      {editingSection === 'basic' && (
        <EditModal title="编辑基本信息" onClose={() => setEditingSection(null)} onSubmit={handleSaveBasic}>
          <TextInput label="姓名" value={basicForm.name} onChange={(value) => setBasicForm({ ...basicForm, name: value })} />
          <TextInput label="毕业年份" value={basicForm.graduationYear} onChange={(value) => setBasicForm({ ...basicForm, graduationYear: value })} />
          <TextInput label="毕业院校" value={basicForm.school} onChange={(value) => setBasicForm({ ...basicForm, school: value })} />
          <TextInput label="就读专业" value={basicForm.major} onChange={(value) => setBasicForm({ ...basicForm, major: value })} />
        </EditModal>
      )}

      {editingSection === 'skills' && (
        <EditModal title="编辑技能" onClose={() => setEditingSection(null)} onSubmit={handleSaveSkills}>
          <label className="block text-xs font-semibold text-career-ink">
            技能标签
            <textarea rows={4} value={skillsForm} onChange={(e) => setSkillsForm(e.target.value)} className="mt-1.5 w-full resize-none rounded-md border border-career-line bg-career-bg px-4 py-3 text-sm outline-none focus:border-career-primary" placeholder="Java, Python, TypeScript, SQL" />
          </label>
        </EditModal>
      )}

      {editingSection === 'internships' && (
        <EditModal title="编辑实习经历" onClose={() => setEditingSection(null)} onSubmit={handleSaveInternships}>
          {internshipsForm.map((intern, idx) => (
            <div key={idx} className="rounded-md border border-career-line bg-career-bg p-4">
              <div className="mb-3 flex justify-between"><span className="text-xs font-semibold text-career-muted">实习 {idx + 1}</span><button type="button" onClick={() => removeInternshipField(idx)} className="text-xs text-career-danger">删除</button></div>
              <TextInput label="公司名称" value={intern.company} onChange={(value) => updateInternship(internshipsForm, setInternshipsForm, idx, 'company', value)} />
              <TextInput label="担任角色" value={intern.role} onChange={(value) => updateInternship(internshipsForm, setInternshipsForm, idx, 'role', value)} />
              <TextInput label="时间跨度" value={intern.duration} onChange={(value) => updateInternship(internshipsForm, setInternshipsForm, idx, 'duration', value)} />
            </div>
          ))}
          <button type="button" onClick={addInternshipField} className="w-full rounded-md border border-dashed border-career-line py-2 text-xs font-semibold text-career-muted">+ 添加一段实习经历</button>
        </EditModal>
      )}

      {editingSection === 'projects' && (
        <EditModal title="编辑项目经历" onClose={() => setEditingSection(null)} onSubmit={handleSaveProjects}>
          {projectsForm.map((project, idx) => (
            <div key={idx} className="rounded-md border border-career-line bg-career-bg p-4">
              <div className="mb-3 flex justify-between"><span className="text-xs font-semibold text-career-muted">项目 {idx + 1}</span><button type="button" onClick={() => removeProjectField(idx)} className="text-xs text-career-danger">删除</button></div>
              <TextInput label="项目名称" value={project.name} onChange={(value) => updateProject(projectsForm, setProjectsForm, idx, 'name', value)} />
              <TextInput label="担当角色" value={project.role} onChange={(value) => updateProject(projectsForm, setProjectsForm, idx, 'role', value)} />
              <TextInput label="技术栈" value={project.tech} onChange={(value) => updateProject(projectsForm, setProjectsForm, idx, 'tech', value)} />
            </div>
          ))}
          <button type="button" onClick={addProjectField} className="w-full rounded-md border border-dashed border-career-line py-2 text-xs font-semibold text-career-muted">+ 添加一个项目经历</button>
        </EditModal>
      )}

      {editingSection === 'target' && (
        <EditModal title="编辑求职方向与城市" onClose={() => setEditingSection(null)} onSubmit={handleSaveTarget}>
          <TextInput label="推断求职方向" value={targetForm.inferredDirection} onChange={(value) => setTargetForm({ ...targetForm, inferredDirection: value })} />
          <TextInput label="目标城市" value={targetForm.targetCities} onChange={(value) => setTargetForm({ ...targetForm, targetCities: value })} />
        </EditModal>
      )}
    </div>
  );
}

function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'txt': return 'text/plain';
    default: return 'application/octet-stream';
  }
}

function ProcessingPanel({ fileName, uploadProgress, activeStep }: { fileName: string; uploadProgress: number; activeStep: number }) {
  const steps = ['文件校验', 'OCR 识别', 'AI 解析', '结构化结果'];
  return (
    <SectionPanel title="处理进度" description={fileName || '正在处理材料'}>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-career-surface-muted">
        <div className="h-full rounded-full bg-career-primary transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className={`rounded-md border p-3.5 ${index <= activeStep ? 'border-career-primary/30 bg-career-primary-soft' : 'border-career-line bg-career-bg'}`}>
            <div className="flex items-center gap-2">
              {index < activeStep ? <CheckCircle2 className="h-4 w-4 text-career-success" /> : <RotateCw className={`h-4 w-4 ${index === activeStep ? 'animate-spin text-career-primary' : 'text-career-muted'}`} />}
              <span className="text-xs font-semibold text-career-ink">{step}</span>
            </div>
          </div>
        ))}
      </div>
    </SectionPanel>
  );
}


function EditButton({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="flex items-center gap-1 text-xs font-semibold text-career-primary"><Edit3 className="h-3.5 w-3.5" />编辑</button>;
}

function showValue(value: string) {
  return value?.trim() ? value : '未识别，可补充';
}

function MissingText() {
  return <p className="text-sm text-career-muted">未识别，可补充</p>;
}

function InfoGrid({ items }: { items: [string, string][] }) {
  return <div className="divide-y divide-career-line/60">{items.map(([label, value]) => <div key={label} className="flex items-baseline justify-between gap-4 py-2"><p className="text-[10px] font-semibold tracking-[0.14em] text-career-muted uppercase">{label}</p><p className="text-sm font-semibold text-career-ink">{value}</p></div>)}</div>;
}

function ExperienceList({ items }: { items: { title: string; subtitle: string; meta: string }[] }) {
  const filtered = items.filter((item) => item.title || item.subtitle || item.meta);
  if (filtered.length === 0) return <MissingText />;
  return <div className="divide-y divide-career-line/60">{filtered.map((item, index) => <div key={`${item.title}-${index}`} className="py-2.5"><p className="text-sm font-semibold text-career-ink">{showValue(item.title)}</p><p className="mt-0.5 text-xs text-career-muted">{showValue(item.subtitle)}</p><p className="mt-0.5 text-xs text-career-muted">{showValue(item.meta)}</p></div>)}</div>;
}

function EditModal({ title, children, onClose, onSubmit }: { title: string; children: React.ReactNode; onClose: () => void; onSubmit: (e: React.FormEvent) => void }) {
  return (
    <DialogFrame titleId="resume-edit-title" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <h3 id="resume-edit-title" className="text-lg font-semibold text-career-ink">{title}</h3>
        {children}
        <div className="flex justify-end gap-3 border-t border-career-line pt-4">
          <button type="button" onClick={onClose} className="rounded-md bg-career-surface-muted px-4 py-2 text-sm font-semibold text-career-ink">取消</button>
          <button type="submit" className="rounded-md bg-career-primary px-5 py-2 text-sm font-semibold text-white">保存更改</button>
        </div>
      </form>
    </DialogFrame>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-xs font-semibold text-career-ink">{label}<input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-md border border-career-line bg-career-bg px-4 py-2 text-sm outline-none focus:border-career-primary" /></label>;
}

function updateInternship(items: { company: string; role: string; duration: string }[], setItems: (items: { company: string; role: string; duration: string }[]) => void, index: number, key: 'company' | 'role' | 'duration', value: string) {
  const updated = [...items];
  updated[index] = { ...updated[index], [key]: value };
  setItems(updated);
}

function updateProject(items: { name: string; role: string; tech: string }[], setItems: (items: { name: string; role: string; tech: string }[]) => void, index: number, key: 'name' | 'role' | 'tech', value: string) {
  const updated = [...items];
  updated[index] = { ...updated[index], [key]: value };
  setItems(updated);
}
