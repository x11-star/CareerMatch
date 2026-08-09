import React, { useState } from 'react';
import { Check, Image, Link, Smartphone, X } from 'lucide-react';

interface ShareModalProps {
  onClose: () => void;
}

export default function ShareModal({ onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-career-ink/40 backdrop-blur-xs transition-opacity" />

      <div className="relative z-10 w-full max-w-sm rounded-lg border border-career-line bg-career-surface p-6 shadow-lg sm:p-8">
        <button onClick={onClose} className="absolute right-5 top-5 rounded-full p-1.5 text-career-muted transition-colors hover:bg-career-surface-muted hover:text-career-ink">
          <X className="h-5 w-5" />
        </button>

        <h3 className="mb-2 text-base font-semibold text-career-ink">分享诊断链接</h3>
        <p className="mb-6 text-xs leading-5 text-career-muted">当前阶段只有复制链接是真功能。微信、QQ 和长图分享需要后续接入真实 SDK 或生成接口。</p>

        <div className="mb-6 grid grid-cols-2 gap-3 text-xs font-semibold">
          <UnavailableShareButton icon={<Smartphone className="h-6 w-6" />} label="微信分享暂未接入" />
          <UnavailableShareButton icon={<Smartphone className="h-6 w-6" />} label="QQ 分享暂未接入" />
          <button onClick={handleCopyLink} className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-career-line bg-career-bg p-3 text-career-ink transition-colors hover:border-career-primary hover:bg-career-primary-soft">
            {copied ? <Check className="h-6 w-6 text-career-success" /> : <Link className="h-6 w-6 text-career-primary" />}
            {copied ? '链接已复制' : '复制网址链接'}
          </button>
          <UnavailableShareButton icon={<Image className="h-6 w-6" />} label="长图生成后续开放" />
        </div>

        <div className="text-center">
          <button onClick={onClose} className="text-xs font-semibold text-career-muted hover:text-career-ink">关闭</button>
        </div>
      </div>
    </div>
  );
}

function UnavailableShareButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <button disabled className="flex cursor-not-allowed flex-col items-center gap-2 rounded-md border border-career-line bg-career-surface-muted p-3 text-career-muted opacity-80">{icon}{label}</button>;
}
