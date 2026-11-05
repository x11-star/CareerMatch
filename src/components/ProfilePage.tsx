import DialogFrame from './ui/DialogFrame';
import React, { useState } from 'react';
import { BrainCircuit, Edit2, FileText, Heart, KeyRound, LogOut, Phone, Save, Settings, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ResumeData, PersonalityResult } from '../types';
import PageHeader from './ui/PageHeader';
import SectionPanel from './ui/SectionPanel';
import EmptyState from './ui/EmptyState';
import { formatProfileCompleteness } from '../lib/profileCompleteness';
import { clearGuestData, deleteMaterials, getFavorites, getPositions, ALL_POSITIONS_PAGE_SIZE } from '../lib/userDataStore';
import type { Position } from '../types';
import StatusBanner from './ui/StatusBanner';

interface ProfilePageProps {
  onNavigate: (view: string) => void;
  onOpenModal: (modalType: 'download' | 'share' | null) => void;
  resumeData?: ResumeData;
  personalityResult?: PersonalityResult | null;
  onSelectPosition: (id: string) => void;
  onDataChanged: () => void;
}

type ProfileTab = 'profile' | 'resume' | 'assessment' | 'favorites' | 'security';

export default function ProfilePage({ onNavigate, resumeData, personalityResult, onSelectPosition, onDataChanged }: ProfilePageProps) {
  const { user, userProfile, updateProfile, logout, requestChangePhoneCode, verifyChangePhoneCode, requestDeleteAccountCode, deleteAccount } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<ProfileTab>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [materialBusy, setMaterialBusy] = useState(false);
  const [favoritePositions, setFavoritePositions] = useState<Position[]>([]);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteError, setFavoriteError] = useState('');
  const [favoriteRevision, setFavoriteRevision] = useState(0);
  React.useEffect(() => {
    let active = true;
    setFavoritePositions([]);
    if (activeSubTab !== 'favorites' || !user) return;
    setFavoriteLoading(true);
    setFavoriteError('');
    Promise.all([getFavorites(user), getPositions(ALL_POSITIONS_PAGE_SIZE)]).then(([ids, positions]) => {
      if (active) setFavoritePositions(positions.filter(p => ids.includes(p.id)));
    }).catch((error: any) => { if (active) setFavoriteError(error?.message || '收藏读取失败，请重试。'); })
      .finally(() => { if (active) setFavoriteLoading(false); });
    return () => { active = false; };
  }, [activeSubTab, user?.id, user?.isGuest, favoriteRevision]);
  async function handleLogout() {
    setActionError('');
    try { await logout(); onNavigate('landing'); }
    catch (error: any) { setActionError(error?.message || '退出失败，请重试。'); }
  }
  async function handleDeleteMaterial(kind: 'resume' | 'assessment') {
    if (!user || materialBusy || !window.confirm(`确定删除你的全部${kind === 'resume' ? '简历' : '测评'}记录及关联诊断吗？此操作无法恢复。`)) return;
    setMaterialBusy(true);
    setActionError('');
    try { await deleteMaterials(user, kind); onDataChanged(); }
    catch (error: any) { setActionError(error?.message || '删除未完成，请重试。'); }
    finally { setMaterialBusy(false); }
  }
  async function handleClearGuest() {
    if (!user?.isGuest || !window.confirm('清除当前游客的简历、测评、求职偏好、草稿、资料和收藏吗？此操作无法恢复。')) return;
    try { clearGuestData(user.id); await logout(); onNavigate('landing'); }
    catch { setActionError('部分游客资料未能清除，请重试。'); }
  }

  const [changePhoneOpen, setChangePhoneOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneDevCode, setPhoneDevCode] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteDevCode, setDeleteDevCode] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const hasResume = Boolean(resumeData?.name || resumeData?.school || resumeData?.major);
  const displayName = userProfile?.name || resumeData?.name || '未完善';
  const displaySchool = userProfile?.school || resumeData?.school || '未完善';
  const displayMajor = userProfile?.major || resumeData?.major || '未完善';
  const displayGraduationYear = userProfile?.graduationYear || resumeData?.graduationYear || '未完善';
  const completeness = formatProfileCompleteness({
    displayName,
    displaySchool,
    displayMajor,
    hasResume,
    hasAssessment: Boolean(personalityResult),
  });

  const [editForm, setEditForm] = useState({ name: displayName, school: displaySchool, major: displayMajor, graduationYear: displayGraduationYear });

  React.useEffect(() => {
    setEditForm({ name: displayName, school: displaySchool, major: displayMajor, graduationYear: displayGraduationYear });
  }, [displayName, displaySchool, displayMajor, displayGraduationYear]);

  const sideMenu: { id: ProfileTab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: '我的资料', icon: User },
    { id: 'resume', label: '我的简历', icon: FileText },
    { id: 'assessment', label: '我的测评', icon: BrainCircuit },
    { id: 'favorites', label: '我的收藏', icon: Heart },
    { id: 'security', label: '账号安全', icon: Settings },
  ];

  const handleEditClick = () => {
    setEditForm({ name: displayName, school: displaySchool, major: displayMajor, graduationYear: displayGraduationYear });
    setIsEditing(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(editForm);
      setIsEditing(false);
    } catch (err: any) {
      setActionError(err?.message || '资料未保存，请重试。');
    }
  };

  const handleRequestPhoneCode = async () => {
    setPhoneError('');
    setPhoneSubmitting(true);
    try {
      // S1 修复:验证码发到当前手机号(后端用 user.phone),不依赖 newPhone。
      const result = await requestChangePhoneCode();
      setPhoneDevCode(result.devCode || '');
    } catch (err: any) {
      setPhoneError(err?.message || '验证码发送失败，请稍后再试');
    } finally {
      setPhoneSubmitting(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    setPhoneError('');
    setPhoneSubmitting(true);
    try {
      await verifyChangePhoneCode(phoneCode, newPhone);
      setChangePhoneOpen(false);
      setNewPhone('');
      setPhoneCode('');
      setPhoneDevCode('');
    } catch (err: any) {
      setPhoneError(err?.message || '验证失败，请检查验证码');
    } finally {
      setPhoneSubmitting(false);
    }
  };

  const handleRequestDeleteCode = async () => {
    setDeleteError('');
    setDeleteSubmitting(true);
    try {
      const result = await requestDeleteAccountCode();
      setDeleteDevCode(result.devCode || '');
    } catch (err: any) {
      setDeleteError(err?.message || '验证码发送失败，请稍后再试');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleteError('');
    setDeleteSubmitting(true);
    try {
      await deleteAccount(deleteCode);
      setDeleteOpen(false);
    } catch (err: any) {
      setDeleteError(err?.message || '注销失败，请检查验证码');
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader eyebrow="Profile file" title="我的档案" description="管理你的资料、简历、测评、收藏和隐私设置。" />
      {actionError && <div role="alert" className="mb-6"><StatusBanner tone="error" title="操作未完成" description={actionError} /></div>}

      <SectionPanel className="mb-8" title="账号摘要" actions={<button onClick={handleEditClick} disabled={!user} className="inline-flex items-center gap-1 rounded-md bg-career-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"><Edit2 className="h-3.5 w-3.5" />编辑资料</button>}>
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="divide-y divide-career-line/60">
            <SummaryItem label="登录状态" value={user?.isGuest ? '游客模式' : user ? '手机号登录' : '未登录'} />
            <SummaryItem label="手机号" value={maskPhone(user?.phone)} />
            <SummaryItem label="最近更新" value="随资料更新" />
          </div>
          <div className="md:border-l md:border-career-line md:pl-6">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-career-muted uppercase">资料完整度</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-career-ink">{completeness}</p>
          </div>
        </div>
      </SectionPanel>

      <div className="grid gap-8 lg:grid-cols-4">
        <div className="space-y-2">
          {sideMenu.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeSubTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveSubTab(item.id)} className={`flex w-full cursor-pointer items-center gap-3 rounded-md px-4 py-3 text-left text-xs font-semibold transition-colors ${isActive ? 'bg-career-primary text-white' : 'border border-career-line bg-career-surface text-career-muted hover:bg-career-surface-muted hover:text-career-ink'}`}>
                <IconComponent className="h-4 w-4 shrink-0" /> {item.label}
              </button>
            );
          })}
          <button onClick={() => onNavigate('results')} className="w-full rounded-md bg-career-primary px-4 py-3 text-left text-sm font-semibold text-white">查看我的推荐</button>
          <div className="rounded-md border border-career-line bg-career-surface-muted px-4 py-3 text-xs font-semibold text-career-muted">
            PDF 报告可在岗位诊断报告页导出
          </div>
        </div>

        <div className="lg:col-span-3">
          {activeSubTab === 'profile' && (
            <SectionPanel title="我的资料" description="未填写的信息显示为未完善，不使用默认学校或专业。">
              <InfoGrid items={[
                ['姓名', displayName],
                ['学校', displaySchool],
                ['专业', displayMajor],
                ['毕业年份', displayGraduationYear],
              ]} />
            </SectionPanel>
          )}

          {activeSubTab === 'resume' && (
            <SectionPanel title="我的简历" description="查看最近结构化结果；没有简历时先上传材料。" actions={<button onClick={() => onNavigate('upload')} className="rounded-md bg-career-primary px-4 py-2 text-xs font-semibold text-white">重新上传</button>}>
              {hasResume && resumeData ? (
                <div className="space-y-5">
                  <InfoGrid items={[
                    ['姓名', resumeData.name || '未完善'],
                    ['学校', resumeData.school || '未完善'],
                    ['专业', resumeData.major || '未完善'],
                    ['求职方向', resumeData.inferredDirection || '未完善'],
                  ]} />
                  <div><h3 className="text-sm font-semibold text-career-ink">简历摘要</h3><p className="mt-2 text-sm leading-6 text-career-muted">技能：{resumeData.skills.length > 0 ? resumeData.skills.join('、') : '未完善'}；目标城市：{resumeData.targetCities.length > 0 ? resumeData.targetCities.join('、') : '未完善'}。</p></div>
                </div>
              ) : <EmptyState title="还没有简历档案" description="上传简历后，结构化结果会在这里集中查看。" action={<button onClick={() => onNavigate('upload')} className="rounded-md bg-career-primary px-4 py-2 text-sm font-semibold text-white">上传简历</button>} />}
            </SectionPanel>
          )}

          {activeSubTab === 'assessment' && (
            <SectionPanel title="我的测评" description="测评用于岗位环境和协作方式适配判断。" actions={<button onClick={() => onNavigate('assessment')} className="rounded-md bg-career-primary px-4 py-2 text-xs font-semibold text-white">重新测评</button>}>
              {personalityResult ? (
                <div className="space-y-4">
                  <InfoGrid items={[
                    ['测评类型', personalityResult.typeTitle],
                    ['霍兰德代码', personalityResult.hollandCode],
                    ['央国企适配', `${personalityResult.industryFit.stateOwned}`],
                    ['互联网适配', `${personalityResult.industryFit.internet}`],
                  ]} />
                  <p className="text-sm leading-6 text-career-muted">{personalityResult.description}</p>
                </div>
              ) : <EmptyState title="还没有职业测评" description="完成测评后，这里会显示职业兴趣和岗位适配判断依据。" action={<button onClick={() => onNavigate('assessment')} className="rounded-md bg-career-primary px-4 py-2 text-sm font-semibold text-white">完成测评</button>} />}
            </SectionPanel>
          )}

          {activeSubTab === 'favorites' && (
            <SectionPanel title="我的收藏" description="已保存的职业类型，点击可继续查看。">
              {favoriteLoading ? <p>正在读取收藏</p> : favoriteError ? <StatusBanner tone="warning" title="收藏暂不可用" description={favoriteError} action={<button onClick={() => setFavoriteRevision(n => n + 1)}>重新读取收藏</button>} /> : favoritePositions.length ? <ul className="divide-y divide-career-line">{favoritePositions.map(p => <li key={p.id} className="py-3"><button onClick={() => onSelectPosition(p.id)} className="text-left text-sm font-semibold text-career-primary">{p.title}</button><p className="mt-1 text-xs text-career-muted">{p.industry} · {p.category}</p></li>)}</ul> : <EmptyState title="暂无收藏" description="暂无收藏。你可以在职业类型页收藏感兴趣的方向。" action={<button onClick={() => onNavigate('browser')} className="rounded-md bg-career-primary px-4 py-2 text-sm font-semibold text-white">查看职业库</button>} />}
            </SectionPanel>
          )}

          {activeSubTab === 'security' && (
            <SectionPanel title="账号安全" description="在这里退出登录、更换手机号或注销账号。">
              {!user || user.isGuest ? (
                <EmptyState title="登录后可管理手机号和账号" description="游客模式下无法更换手机号或注销账号，登录后可以在这里管理账号安全。" action={<button onClick={() => onNavigate('landing')} className="rounded-md bg-career-primary px-4 py-2 text-sm font-semibold text-white">去登录</button>} />
              ) : (
                <div className="divide-y divide-career-line/60">
                  <div className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-career-ink">退出登录</p>
                      <p className="mt-1 text-xs text-career-muted">结束当前会话，简历和测评仍保留在账号中。</p>
                    </div>
                    <button onClick={handleLogout} className="inline-flex items-center gap-1 rounded-md border border-career-line px-4 py-2 text-xs font-semibold text-career-ink hover:bg-career-surface-muted">
                      <LogOut className="h-3.5 w-3.5" /> 退出登录
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-career-ink">更换手机号</p>
                      <p className="mt-1 text-xs text-career-muted">验证当前手机号 {maskPhone(user.phone)} 后，可改为新号码。请确认新号属于你。</p>
                    </div>
                    <button onClick={() => { setChangePhoneOpen(true); setPhoneError(''); setPhoneDevCode(''); }} className="inline-flex items-center gap-1 rounded-md border border-career-line px-4 py-2 text-xs font-semibold text-career-primary hover:bg-career-primary-soft">
                      <Phone className="h-3.5 w-3.5" /> 更换
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-career-danger">注销账号</p>
                      <p className="mt-1 text-xs text-career-muted">将永久删除简历、测评、收藏和账号，无法恢复。</p>
                    </div>
                    <button onClick={() => { setDeleteOpen(true); setDeleteError(''); setDeleteDevCode(''); setDeleteCode(''); }} className="rounded-md border border-career-danger/40 px-4 py-2 text-xs font-semibold text-career-danger hover:bg-career-danger-soft">
                      注销账号
                    </button>
                  </div>
                </div>
              )}
            </SectionPanel>
          )}
        </div>
      </div>

      <section className="mt-8 border-t border-career-line pt-6">
        <h2 className="text-lg font-semibold">材料管理</h2>
        <p className="mt-2 text-sm leading-6 text-career-muted">{user?.isGuest ? '游客简历和完整测评保存在此浏览器；共享设备使用后请删除。' : '登录后的简历与测评保存到账号。'}简历文字会发送给配置的 AI 服务用于解析和诊断；职业链接不包含你的个人材料。</p>
        {user && <div className="mt-4 flex flex-wrap gap-3"><button disabled={materialBusy || !hasResume} onClick={() => handleDeleteMaterial('resume')} className="rounded-md border border-career-line px-4 py-2 text-sm disabled:opacity-50">删除全部简历记录</button><button disabled={materialBusy} onClick={() => handleDeleteMaterial('assessment')} className="rounded-md border border-career-line px-4 py-2 text-sm disabled:opacity-50">删除测评与草稿</button></div>}
        {user?.isGuest && <button onClick={handleClearGuest} className="mt-3 rounded-md border border-career-danger/40 px-4 py-2 text-sm text-career-danger">清除全部游客资料并退出</button>}
      </section>

      {isEditing && (
        <DialogFrame titleId="profile-edit-title" onClose={() => setIsEditing(false)}>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {actionError && <p role="alert" className="mb-4 text-sm text-career-danger">{actionError}</p>}
            <div className="mb-4 flex items-center justify-between">
              <h3 id="profile-edit-title" className="flex items-center gap-2 text-lg font-semibold text-career-ink"><User className="h-5 w-5 text-career-primary" /> 编辑个人资料</h3>
              <button type="button" onClick={() => setIsEditing(false)} className="text-career-muted hover:text-career-ink"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <TextInput label="姓名" value={editForm.name} onChange={(value) => setEditForm({ ...editForm, name: value })} />
              <TextInput label="毕业学校" value={editForm.school} onChange={(value) => setEditForm({ ...editForm, school: value })} />
              <TextInput label="主修专业" value={editForm.major} onChange={(value) => setEditForm({ ...editForm, major: value })} />
              <TextInput label="届数" value={editForm.graduationYear} onChange={(value) => setEditForm({ ...editForm, graduationYear: value })} />
            </div>
            <div className="mt-5 flex justify-end gap-3 border-t border-career-line pt-4">
              <button type="button" onClick={() => setIsEditing(false)} className="rounded-md bg-career-surface-muted px-4 py-2 text-xs font-semibold text-career-ink">取消</button>
              <button type="submit" className="inline-flex items-center gap-1 rounded-md bg-career-primary px-4 py-2 text-xs font-semibold text-white"><Save className="h-3.5 w-3.5" />保存更改</button>
            </div>
          </form>
        </DialogFrame>
      )}

      {changePhoneOpen && (
        <DialogFrame titleId="change-phone-title" onClose={() => setChangePhoneOpen(false)} busy={phoneSubmitting}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="change-phone-title" className="text-lg font-semibold text-career-ink">更换手机号</h3>
                <p className="mt-1 text-xs leading-5 text-career-muted">验证码会发到你当前绑定的手机号 {maskPhone(user?.phone)},验证后输入新手机号完成更换。</p>
              </div>
              <button type="button" onClick={() => setChangePhoneOpen(false)} className="rounded-xl p-1 text-career-muted hover:bg-career-surface-muted hover:text-career-ink" aria-label="关闭"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-xs font-semibold text-career-ink">
                新手机号
                <div className="mt-1.5 flex items-center gap-2 rounded-md border border-career-line bg-career-bg px-3 py-2 focus-within:border-career-primary focus-within:ring-2 focus-within:ring-career-primary-soft">
                  <Phone className="h-4 w-4 text-career-muted" />
                  <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full border-0 bg-transparent text-sm text-career-ink outline-none placeholder:text-career-muted" placeholder="请输入新手机号" />
                </div>
              </label>

              <label className="block text-xs font-semibold text-career-ink">
                验证码
                <div className="mt-1.5 flex items-center gap-2 rounded-md border border-career-line bg-career-bg px-3 py-2 focus-within:border-career-primary focus-within:ring-2 focus-within:ring-career-primary-soft">
                  <KeyRound className="h-4 w-4 text-career-muted" />
                  <input value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} className="w-full border-0 bg-transparent text-sm text-career-ink outline-none placeholder:text-career-muted" placeholder="请输入 6 位验证码" />
                </div>
              </label>

              {phoneDevCode && (
                <div className="rounded-md bg-career-primary-soft px-3 py-2 text-xs text-career-primary">本次验证码：<span className="font-semibold tracking-widest">{phoneDevCode}</span></div>
              )}
              {phoneError && (
                <div className="rounded-md bg-career-danger-soft px-3 py-2 text-xs text-career-danger">{phoneError}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={handleRequestPhoneCode} disabled={phoneSubmitting} className="rounded-md border border-career-line px-4 py-2 text-xs font-semibold text-career-primary hover:bg-career-primary-soft disabled:cursor-not-allowed disabled:opacity-60">获取验证码</button>
                <button type="button" onClick={handleVerifyPhoneCode} disabled={phoneSubmitting || !newPhone.trim() || !phoneCode.trim()} className="rounded-md bg-career-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">确认更换</button>
              </div>
            </div>
        </DialogFrame>
      )}

      {deleteOpen && (
        <DialogFrame titleId="delete-account-title" onClose={() => setDeleteOpen(false)} busy={deleteSubmitting}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="delete-account-title" className="text-lg font-semibold text-career-danger">注销账号</h3>
                <p className="mt-1 text-xs leading-5 text-career-muted">将永久删除简历、测评、收藏和账号，无法恢复。验证码会发送到当前手机号 {maskPhone(user?.phone)}。</p>
              </div>
              <button type="button" onClick={() => setDeleteOpen(false)} className="rounded-xl p-1 text-career-muted hover:bg-career-surface-muted hover:text-career-ink" aria-label="关闭"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-xs font-semibold text-career-ink">
                验证码
                <div className="mt-1.5 flex items-center gap-2 rounded-md border border-career-line bg-career-bg px-3 py-2 focus-within:border-career-primary focus-within:ring-2 focus-within:ring-career-primary-soft">
                  <KeyRound className="h-4 w-4 text-career-muted" />
                  <input value={deleteCode} onChange={(e) => setDeleteCode(e.target.value)} className="w-full border-0 bg-transparent text-sm text-career-ink outline-none placeholder:text-career-muted" placeholder="请输入 6 位验证码" />
                </div>
              </label>

              {deleteDevCode && (
                <div className="rounded-md bg-career-primary-soft px-3 py-2 text-xs text-career-primary">本次验证码：<span className="font-semibold tracking-widest">{deleteDevCode}</span></div>
              )}
              {deleteError && (
                <div className="rounded-md bg-career-danger-soft px-3 py-2 text-xs text-career-danger">{deleteError}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={handleRequestDeleteCode} disabled={deleteSubmitting} className="rounded-md border border-career-line px-4 py-2 text-xs font-semibold text-career-primary hover:bg-career-primary-soft disabled:cursor-not-allowed disabled:opacity-60">发送验证码</button>
                <button type="button" onClick={handleConfirmDelete} disabled={deleteSubmitting || !deleteCode.trim()} className="rounded-md bg-career-danger px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">确认注销</button>
              </div>
            </div>
        </DialogFrame>
      )}
    </div>
  );
}

function maskPhone(phone: string | null | undefined) {
  if (!phone) return '游客模式未绑定手机号';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

const SummaryItem: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  return <div className="flex items-baseline justify-between gap-4 py-2"><p className="text-[10px] font-semibold tracking-[0.14em] text-career-muted uppercase">{label}</p><p className="text-sm font-semibold text-career-ink">{value}</p></div>;
};

function InfoGrid({ items }: { items: [string, string][] }) {
  return <div className="grid gap-3 md:grid-cols-2">{items.map(([label, value]) => <SummaryItem key={label} label={label} value={value || '未完善'} />)}</div>;
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-xs font-semibold text-career-ink">{label}<input value={value === '未完善' ? '' : value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-md border border-career-line bg-career-bg px-4 py-2 text-sm outline-none focus:border-career-primary" /></label>;
}
