import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Heart, Search } from 'lucide-react';
import { MOCK_POSITIONS } from '../data';
import type { Position } from '../types';
import { useAuth } from '../context/AuthContext';
import { getPositions, getFavorites, toggleFavorite, ALL_POSITIONS_PAGE_SIZE } from '../lib/userDataStore';
import PageHeader from './ui/PageHeader';
import StatusBanner from './ui/StatusBanner';
import EmptyState from './ui/EmptyState';

export default function PositionBrowserPage({ onSelectPosition, embedded = false }: { onSelectPosition: (id: string) => void; embedded?: boolean }) {
  const { user } = useAuth();
  const [positions, setPositions] = useState<Position[]>(MOCK_POSITIONS);
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('default');
  const [visible, setVisible] = useState(20);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [favoriteReady, setFavoriteReady] = useState(!user);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState<string[]>([]);
  const locks = useRef(new Set<string>());
  useEffect(() => {
    let active = true;
    getPositions(ALL_POSITIONS_PAGE_SIZE).then(data => { if (active) setPositions(data); });
    setFavorites([]);
    setFavoriteReady(!user);
    setError('');
    if (user) getFavorites(user).then(ids => { if (active) { setFavorites(ids); setFavoriteReady(true); } })
      .catch((e: any) => { if (active) setError(e?.message || '收藏读取失败，请重新读取。'); });
    return () => { active = false; };
  }, [user?.id, user?.isGuest, revision]);
  useEffect(() => { setVisible(20); }, [search, industry, category, sort]);
  const filtered = useMemo(() => {
    let list = positions.filter(p => (industry === 'all' || p.industry === industry) && (category === 'all' || p.category === category));
    if (search.trim()) list = list.filter(p => [p.title, p.industry, p.category, p.summary, ...p.requirements].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
    if (sort === 'difficulty') list = [...list].sort((a, b) => a.difficultyRating - b.difficultyRating);
    if (sort === 'salary') list = [...list].sort((a, b) => Number(b.salaryRange.match(/-(\d+)/)?.[1] || 0) - Number(a.salaryRange.match(/-(\d+)/)?.[1] || 0));
    return list;
  }, [positions, search, industry, category, sort]);
  async function saveFavorite(id: string) {
    if (!user) { setError('请先选择游客体验或登录，再收藏职业类型。'); return; }
    if (!favoriteReady || locks.current.has(id)) return;
    locks.current.add(id);
    setPending([...locks.current]);
    setError('');
    try {
      const saved = await toggleFavorite(user, id);
      setFavorites(ids => saved ? [...new Set([...ids, id])] : ids.filter(value => value !== id));
    } catch (e: any) { setError(e?.message || '收藏未保存，请重试。'); }
    finally { locks.current.delete(id); setPending([...locks.current]); }
  }
  return (
    <div className={embedded ? 'space-y-5' : 'mx-auto max-w-6xl space-y-6 px-4 py-8'}>
      {!embedded && <PageHeader eyebrow="Career library" title="职业类型库" description="了解不同职业的职责、技能与准备方向。这里展示职业类型，不是具体企业的在招职位。" />}
      <p className="text-sm leading-6 text-career-muted">共 {positions.length} 个职业类型。薪资和难度来自整理资料与模型归纳，仅供参考；具体要求与待遇请以招聘公告为准。</p>
      {error && <StatusBanner tone="warning" title="操作未完成" description={error} action={!favoriteReady && user ? <button onClick={() => setRevision(n => n + 1)}>重新读取收藏</button> : undefined} />}
      <div className="grid gap-4 border-y border-career-line py-5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-2 text-xs font-semibold text-career-muted"><span className="flex items-center gap-1"><Search className="h-4 w-4" /> 搜索职业或技能</span><input aria-label="搜索职业或技能" value={search} onChange={e => setSearch(e.target.value)} placeholder="如产品经理、Python" className="w-full min-w-0 rounded-md border border-career-line bg-career-surface px-3 py-2.5 text-sm text-career-ink" /></label>
        <label className="space-y-2 text-xs font-semibold text-career-muted">行业<select aria-label="行业" value={industry} onChange={e => setIndustry(e.target.value)} className="mt-2 block w-full rounded-md border border-career-line bg-career-surface px-3 py-2.5 text-sm text-career-ink"><option value="all">全部行业</option>{[...new Set(positions.map(p => p.industry).filter(Boolean))].map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="space-y-2 text-xs font-semibold text-career-muted">职业类别<select aria-label="职业类别" value={category} onChange={e => setCategory(e.target.value)} className="mt-2 block w-full rounded-md border border-career-line bg-career-surface px-3 py-2.5 text-sm text-career-ink"><option value="all">全部类别</option>{[...new Set(positions.map(p => p.category).filter(Boolean))].map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="space-y-2 text-xs font-semibold text-career-muted">排序<select aria-label="排序" value={sort} onChange={e => setSort(e.target.value)} className="mt-2 block w-full rounded-md border border-career-line bg-career-surface px-3 py-2.5 text-sm text-career-ink"><option value="default">目录顺序</option><option value="difficulty">参考难度从低到高</option><option value="salary">参考薪资上限从高到低</option></select></label>
      </div>
      <p className="text-xs text-career-muted">{filtered.length} 个结果 · 此列表按筛选条件展示，尚未按你的适配分数排序。</p>
      {filtered.length === 0 ? <EmptyState title="没有符合条件的职业类型" description="试试其他关键词，或放宽行业与类别。" /> : <div className="divide-y divide-career-line">
        {filtered.slice(0, visible).map(position => <article key={position.id} className="flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1"><p className="text-xs text-career-muted">{position.industry} · {position.category}</p><h3 className="mt-2 text-lg font-semibold"><button className="text-left hover:text-career-primary" onClick={() => onSelectPosition(position.id)}>{position.title}</button></h3><p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-career-muted">{position.summary}</p><p className="mt-3 text-xs text-career-muted">参考年薪 {position.salaryRange} · 参考难度 {position.difficultyRating}/5</p><p className="mt-2 text-xs text-career-muted">技能参考：{position.requirements.slice(0, 3).join('、') || '以具体招聘要求为准'}</p></div>
          <div className="flex shrink-0 gap-2"><button aria-label={`${favorites.includes(position.id) ? '取消收藏' : '收藏'}${position.title}`} disabled={pending.includes(position.id) || (Boolean(user) && !favoriteReady)} onClick={() => saveFavorite(position.id)} className="rounded-md border border-career-line px-3 py-2 text-sm disabled:opacity-50"><Heart className={`mr-1 inline h-4 w-4 ${favorites.includes(position.id) ? 'fill-career-danger text-career-danger' : ''}`} />{pending.includes(position.id) ? '保存中' : favorites.includes(position.id) ? '已收藏' : '收藏'}</button><button onClick={() => onSelectPosition(position.id)} className="rounded-md bg-career-primary px-3 py-2 text-sm font-semibold text-white">查看职业 <ArrowRight className="inline h-4 w-4" /></button></div>
        </article>)}
      </div>}
      {visible < filtered.length && <button onClick={() => setVisible(n => n + 20)} className="w-full rounded-md border border-career-line px-4 py-3 text-sm font-semibold">显示更多职业类型</button>}
    </div>
  );
}
