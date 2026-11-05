import React, { useState } from 'react';
import { Check, Image, Link, Smartphone, X } from 'lucide-react';
import DialogFrame from './ui/DialogFrame';

interface ShareModalProps {
  onClose: () => void;
  shareUrl: string;
  isPosition: boolean;
}

export default function ShareModal({ onClose, shareUrl, isPosition }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleCopyLink = async () => {
    setError('');
    setCopied(false);
    setPending(true);
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); }
    catch { setError('未能复制。请选中下方链接，手动复制。'); }
    finally { setPending(false); }
  };

  return (
    <DialogFrame titleId="share-title" onClose={onClose}>
        <button aria-label="关闭分享" onClick={onClose} className="absolute right-5 top-5 rounded-full p-1.5 text-career-muted transition-colors hover:bg-career-surface-muted hover:text-career-ink">
          <X className="h-5 w-5" />
        </button>

        <h3 id="share-title" className="mb-2 text-base font-semibold text-career-ink">{isPosition ? '分享职业链接' : '分享工具首页'}</h3>
        <p className="mb-4 text-xs leading-5 text-career-muted">{isPosition ? '对方打开后会看到这个职业类型的公开资料，不会看到你的简历、测评或个人诊断。' : '这里分享工具首页；个人诊断与测评结果不会公开。'}</p>
        <label className="mb-4 block text-xs text-career-muted">公开链接<input aria-label="公开链接" readOnly value={shareUrl} onFocus={e => e.target.select()} className="mt-2 w-full rounded-md border border-career-line p-2 text-sm" /></label>
        {error && <p role="alert" className="mb-4 text-sm text-career-danger">{error}</p>}

        <div className="mb-6 grid grid-cols-2 gap-3 text-xs font-semibold">
          <UnavailableShareButton icon={<Smartphone className="h-6 w-6" />} label="微信分享暂未接入" />
          <UnavailableShareButton icon={<Smartphone className="h-6 w-6" />} label="QQ 分享暂未接入" />
          <button aria-label={pending ? '复制中' : copied ? '链接已复制' : '复制网址链接'} disabled={pending} onClick={handleCopyLink} className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-career-line bg-career-bg p-3 text-career-ink transition-colors hover:border-career-primary hover:bg-career-primary-soft">
            {copied ? <Check className="h-6 w-6 text-career-success" /> : <Link className="h-6 w-6 text-career-primary" />}
            <span role="status">{pending ? '复制中' : copied ? '链接已复制' : '复制网址链接'}</span>
          </button>
          <UnavailableShareButton icon={<Image className="h-6 w-6" />} label="长图生成后续开放" />
        </div>

        <div className="text-center">
          <button onClick={onClose} className="text-xs font-semibold text-career-muted hover:text-career-ink">关闭</button>
        </div>
    </DialogFrame>
  );
}

function UnavailableShareButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <button disabled className="flex cursor-not-allowed flex-col items-center gap-2 rounded-md border border-career-line bg-career-surface-muted p-3 text-career-muted opacity-80">{icon}{label}</button>;
}
