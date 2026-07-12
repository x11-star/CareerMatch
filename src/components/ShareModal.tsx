import React, { useState } from 'react';
import { X, Send, Link, Image, Check, Smartphone } from 'lucide-react';

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

  const handleShareSimulate = (platform: string) => {
    alert(`已为您调起系统 ${platform} 接口进行卡片分享 (演示)`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" />

      {/* Modal box */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-sm w-full relative z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-slate-900 font-display mb-2 flex items-center gap-1.5">
          <Send className="w-4.5 h-4.5 text-blue-600 rotate-45" />
          分享给求职同学
        </h3>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          与一同备战秋招、考公或拼大厂的小伙伴，分享你的职业测评结果与优质岗位红利分析吧。
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6 text-xs font-semibold">
          <button
            onClick={() => handleShareSimulate('微信 WeChat')}
            className="p-3 bg-slate-50 border border-slate-100 hover:border-emerald-300 rounded-xl transition-all text-slate-700 hover:text-emerald-700 cursor-pointer flex flex-col items-center gap-2 group"
          >
            <Smartphone className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 transition-colors" />
            微信好友
          </button>
          <button
            onClick={() => handleShareSimulate('QQ')}
            className="p-3 bg-slate-50 border border-slate-100 hover:border-blue-300 rounded-xl transition-all text-slate-700 hover:text-blue-600 cursor-pointer flex flex-col items-center gap-2 group"
          >
            <Smartphone className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
            QQ 同学群
          </button>
          <button
            onClick={handleCopyLink}
            className="p-3 bg-slate-50 border border-slate-100 hover:border-blue-400 rounded-xl transition-all text-slate-700 hover:text-blue-600 cursor-pointer flex flex-col items-center gap-2 group"
          >
            {copied ? (
              <Check className="w-6 h-6 text-emerald-500 transition-colors" />
            ) : (
              <Link className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
            )}
            {copied ? '链接已复制！' : '复制网址链接'}
          </button>
          <button
            onClick={() => handleShareSimulate('生成长图')}
            className="p-3 bg-slate-50 border border-slate-100 hover:border-blue-400 rounded-xl transition-all text-slate-700 hover:text-blue-600 cursor-pointer flex flex-col items-center gap-2 group"
          >
            <Image className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
            生成专属长图
          </button>
        </div>

        <div className="text-center pt-2">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
          >
            取消分享
          </button>
        </div>
      </div>
    </div>
  );
}
