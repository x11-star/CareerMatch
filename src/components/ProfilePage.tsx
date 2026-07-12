import React, { useState } from 'react';
import { User, FileText, BrainCircuit, Heart, FileDown, Settings, Edit2, ShieldAlert, CheckCircle, ExternalLink, X, Save } from 'lucide-react';
import { DEFAULT_RESUME_DATA, DEFAULT_PERSONALITY_RESULT } from '../data';
import { useAuth } from '../context/AuthContext';
import { ResumeData, PersonalityResult } from '../types';

interface ProfilePageProps {
  onNavigate: (view: string) => void;
  onOpenModal: (modalType: 'download' | 'share' | null) => void;
  resumeData?: ResumeData;
  personalityResult?: PersonalityResult | null;
}

export default function ProfilePage({ onNavigate, onOpenModal, resumeData, personalityResult }: ProfilePageProps) {
  const { user, userProfile, updateProfile } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'resume' | 'assessment' | 'settings'>('resume');
  const [isEditing, setIsEditing] = useState(false);

  const resume = resumeData || DEFAULT_RESUME_DATA;
  const personality = personalityResult || DEFAULT_PERSONALITY_RESULT;

  const displayName = userProfile?.name || resume.name;
  const displaySchool = userProfile?.school || resume.school;
  const displayMajor = userProfile?.major || resume.major;
  const displayGraduationYear = userProfile?.graduationYear || resume.graduationYear;

  const [editForm, setEditForm] = useState({
    name: displayName,
    school: displaySchool,
    major: displayMajor,
    graduationYear: displayGraduationYear
  });

  // Sync editForm state when async profile or resumeData props update
  React.useEffect(() => {
    setEditForm({
      name: displayName,
      school: displaySchool,
      major: displayMajor,
      graduationYear: displayGraduationYear
    });
  }, [displayName, displaySchool, displayMajor, displayGraduationYear]);

  const sideMenu = [
    { id: 'resume', label: '📄 我的求职简历', icon: FileText },
    { id: 'assessment', label: '🧠 我的职业测评', icon: BrainCircuit },
    { id: 'settings', label: '⚙️ 账号安全设置', icon: Settings },
  ];

  const handleEditClick = () => {
    setEditForm({
      name: displayName,
      school: displaySchool,
      major: displayMajor,
      graduationYear: displayGraduationYear
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(editForm);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save profile in Firestore", err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header Profile Summary */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-extrabold font-display text-2xl shadow-xs shrink-0">
            {displayName ? displayName[0] : '求'}
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              {displayName}
              <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 rounded-md px-1.5 py-0.5 font-bold uppercase tracking-wider">
                已认证学信网
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {displaySchool} · {displayMajor} · {displayGraduationYear}
            </p>
          </div>
        </div>
        <button 
          onClick={handleEditClick}
          className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl transition-colors font-semibold flex items-center gap-1 cursor-pointer"
        >
          <Edit2 className="w-3.5 h-3.5" /> 编辑个人资料
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar */}
        <div className="space-y-2">
          {sideMenu.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSubTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSubTab(item.id as any)}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-3 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 bg-white border border-slate-200/40'
                }`}
              >
                <IconComponent className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            );
          })}

          <button
            onClick={() => onOpenModal('download')}
            className="w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-3 text-slate-700 hover:bg-slate-50 bg-white border border-slate-200/40"
          >
            <FileDown className="w-4 h-4 text-blue-600" />
            📊 下载完整PDF报告
          </button>
        </div>

        {/* Right Panel Contents */}
        <div className="lg:col-span-3">
          {/* SubTab 1: Resume parsed info */}
          {activeSubTab === 'resume' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">简历快照摘要</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">上次AI解析：2026-07-11 · 解析置信度：92%</p>
                </div>
                <button
                  onClick={() => onNavigate('upload')}
                  className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  重新上传并覆盖
                </button>
              </div>

              {/* Parsed summary details */}
              <div className="space-y-4 text-xs text-slate-700">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                  <div>候选人姓名: <span className="font-bold text-slate-900">{displayName}</span></div>
                  <div>届数: <span className="font-bold text-slate-900">{displayGraduationYear}</span></div>
                  <div className="col-span-2">在读高校: <span className="font-bold text-slate-900">{displaySchool}</span></div>
                  <div className="col-span-2">所学专业: <span className="font-bold text-slate-900">{displayMajor}</span></div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-2">📌 掌握专业硬技能</h4>
                  <div className="flex flex-wrap gap-2">
                    {resume.skills.map((skill, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-semibold font-mono">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-2">💼 重点实习记录</h4>
                  <div className="space-y-2">
                    {resume.internships.map((intern, i) => (
                      <div key={i} className="border border-slate-100 bg-slate-50 p-3 rounded-lg flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-800">{intern.company}</span>
                          <span className="text-slate-400 mx-2">|</span>
                          <span className="text-slate-600 font-medium">{intern.role}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{intern.duration}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-2">🛠️ 项目实践经历</h4>
                  <div className="space-y-2">
                    {resume.projects.map((p, i) => (
                      <div key={i} className="border border-slate-100 bg-slate-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-800">{p.name}</span>
                          <span className="text-slate-400 text-[10px]">{p.role}</span>
                        </div>
                        <div className="text-[11px] text-blue-600 font-mono">核心技术: {p.tech}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SubTab 2: Assessment Details */}
          {activeSubTab === 'assessment' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">科学性格测评</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">类型划分：{personality.typeTitle}</p>
                </div>
                <button
                  onClick={() => onNavigate('upload')}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold cursor-pointer"
                >
                  重测性格
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 bg-linear-to-br from-blue-50/50 to-indigo-50/50 border border-blue-100 rounded-xl leading-relaxed text-slate-700">
                  <span className="font-bold text-blue-700 block mb-1">性格简述：</span>
                  {personality.description}
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="border border-slate-100 bg-slate-50 p-3.5 rounded-xl">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">霍兰德兴趣代码</span>
                    <span className="block text-xl font-black text-blue-600 mt-1 font-mono">{personality.hollandCode}</span>
                  </div>
                  <div className="border border-slate-100 bg-slate-50 p-3.5 rounded-xl">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">测评完备度</span>
                    <span className="block text-xl font-black text-emerald-600 mt-1 flex items-center justify-center gap-1">
                      100% <CheckCircle className="w-4 h-4 inline" />
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onNavigate('assessment-result')}
                    className="text-blue-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  >
                    前往查看完整科学图表及大五人格维度解读 <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SubTab 3: Settings */}
          {activeSubTab === 'settings' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
              <h3 className="text-base font-extrabold text-slate-900 pb-4 border-b border-slate-100">
                账号与安全设置
              </h3>

              <div className="space-y-5 text-xs text-slate-700">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <div>
                    <div className="font-bold text-slate-800">绑定手机</div>
                    <div className="text-slate-400 mt-0.5">138 **** 9283 (已绑定并实名认证)</div>
                  </div>
                  <button className="text-blue-600 hover:underline font-bold cursor-pointer">修改</button>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <div>
                    <div className="font-bold text-slate-800">绑定邮箱</div>
                    <div className="text-slate-400 mt-0.5">{user?.email || 'syl*****@gmail.com'}</div>
                  </div>
                  <button className="text-blue-600 hover:underline font-bold cursor-pointer">修改</button>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <div>
                    <div className="font-bold text-slate-800">微信绑定</div>
                    <div className="text-emerald-600 font-semibold mt-0.5">🟢 已微信授权登陆</div>
                  </div>
                  <button className="text-slate-400 hover:text-red-500 font-semibold cursor-pointer">解除绑定</button>
                </div>

                <div className="flex justify-between items-center py-2 bg-red-50/50 p-4 rounded-xl border border-red-100">
                  <div>
                    <div className="font-bold text-red-800 flex items-center gap-1">
                      <ShieldAlert className="w-4 h-4" /> 账号注销与数据清除
                    </div>
                    <div className="text-red-600/80 mt-0.5">此操作为毁灭性、不可逆的，注销后将彻底抹去您的解析简历与性格档案！</div>
                  </div>
                  <button className="text-red-600 hover:text-red-700 font-bold underline cursor-pointer">注销账号</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editing Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsEditing(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" /> 编辑个人资料
            </h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">姓名</label>
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">毕业学校</label>
                <input 
                  type="text" 
                  value={editForm.school} 
                  onChange={(e) => setEditForm({ ...editForm, school: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">主修专业</label>
                <input 
                  type="text" 
                  value={editForm.major} 
                  onChange={(e) => setEditForm({ ...editForm, major: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">届数（例如：2027届）</label>
                <input 
                  type="text" 
                  value={editForm.graduationYear} 
                  onChange={(e) => setEditForm({ ...editForm, graduationYear: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> 保存更改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
