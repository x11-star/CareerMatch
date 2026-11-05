import type { CareerPreferences } from '../types';
import { CAREER_CATALOG } from '../catalog';
import { WORK_PRIORITIES } from '../lib/careerPreferences';
const industries = [...new Set(CAREER_CATALOG.map(p => p.industry).filter(Boolean))] as string[];
const categories = [...new Set(CAREER_CATALOG.map(p => p.category).filter(Boolean))] as string[];
export default function CareerPreferencesForm({ value, onChange, onSubmit, pending }: { value: CareerPreferences; onChange: (value: CareerPreferences) => void; onSubmit: () => void; pending: boolean }) {
  function toggle(key: 'industries' | 'categories' | 'excludedCategories' | 'priorities', item: string) {
    const next = value[key].includes(item) ? value[key].filter(i => i !== item) : [...value[key], item];
    const update = { ...value, [key]: next };
    if (key === 'categories' && next.includes(item)) update.excludedCategories = value.excludedCategories.filter(i => i !== item);
    if (key === 'excludedCategories' && next.includes(item)) update.categories = value.categories.filter(i => i !== item);
    onChange(update);
  }
  return <form onSubmit={e => { e.preventDefault(); onSubmit(); }} className="space-y-5 border-b border-career-line pb-6">
    <fieldset disabled={pending} className="space-y-5">
      <legend className="text-lg font-semibold">求职偏好</legend>
      <p className="text-xs leading-5 text-career-muted">行业和类别用于推荐排序，排除类别不会进入候选。都可留空，随时可以修改。</p>
      {([['industries', '偏好行业', industries], ['categories', '想探索的类别', categories], ['excludedCategories', '暂不考虑的类别', categories], ['priorities', '更看重的工作价值（仅记录）', WORK_PRIORITIES]] as const).map(([key, label, options]) => <fieldset key={key}><legend className="mb-2 text-sm font-semibold">{label}</legend><div className="flex flex-wrap gap-3">{options.map(item => <label key={item} className="flex items-center gap-2 rounded-md border border-career-line px-3 py-2 text-sm"><input type="checkbox" checked={value[key].includes(item)} onChange={() => toggle(key, item)} />{item}</label>)}</div></fieldset>)}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">意向城市（逗号分隔，仅记录）<input className="mt-2 w-full rounded-md border border-career-line p-3" value={value.targetCities.join('，')} maxLength={200} onChange={e => onChange({ ...value, targetCities: e.target.value.split(/[,，]/) })} /></label>
        <label className="text-sm">期望收入（注明月薪或年薪，仅记录）<input className="mt-2 w-full rounded-md border border-career-line p-3" maxLength={200} value={value.salaryExpectation} onChange={e => onChange({ ...value, salaryExpectation: e.target.value })} /></label>
      </div>
      <p className="text-xs leading-5 text-career-muted">职业类型不绑定招聘城市。收入、工作价值与工作环境尚缺逐条核验的对应依据，本轮不用于排序。</p>
      <button disabled={pending} className="rounded-md bg-career-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{pending ? '正在保存与推荐' : '保存偏好并查看推荐'}</button>
    </fieldset>
  </form>;
}
