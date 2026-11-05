import type { ResumeQualifications } from '../types';
import { EMPTY_QUALIFICATIONS } from '../lib/careerPreferences';
export default function QualificationsFields({ value, onChange }: { value?: ResumeQualifications; onChange: (value: ResumeQualifications) => void }) {
  const data = value || EMPTY_QUALIFICATIONS;
  const field = 'mt-2 w-full rounded-md border border-career-line bg-career-bg p-3 text-sm';
  return <section className="space-y-4 border-t border-career-line pt-6">
    <h2 className="text-lg font-semibold">补充推荐依据</h2>
    <p className="text-xs leading-5 text-career-muted">只填写实际拥有的学历、语言、证书和成果。可以留空，未提供的信息会标为待确认。</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">学历<select aria-label="学历" className={field} value={data.degree} onChange={e => onChange({ ...data, degree: e.target.value })}>
        <option value="">尚未提供</option>{['大专', '本科', '硕士', '博士', '其他'].map(d => <option key={d}>{d}</option>)}
      </select></label>
      <label className="text-sm">语言能力（每行一项）<textarea className={field} rows={2} value={data.languages.join('\n')} onChange={e => onChange({ ...data, languages: e.target.value.split('\n') })} /></label>
      <label className="text-sm">证书（每行一项）<textarea className={field} rows={2} value={data.certificates.join('\n')} onChange={e => onChange({ ...data, certificates: e.target.value.split('\n') })} /></label>
      <label className="text-sm">经历与成果证据（每行一项，单项最多 200 字）<textarea className={field} rows={3} value={data.evidence.join('\n')} onChange={e => onChange({ ...data, evidence: e.target.value.split('\n') })} /></label>
    </div>
  </section>;
}
