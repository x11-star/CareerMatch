import React, { useState, useMemo, useEffect } from 'react';
import { Search, FolderOpen, Landmark, Laptop, Star, MapPin, ChevronRight, Briefcase } from 'lucide-react';
import { MOCK_POSITIONS } from '../data';
import { Position } from '../types';
import { getPositions } from '../lib/firebaseStore';

interface PositionBrowserPageProps {
  onSelectPosition: (id: string) => void;
}

export default function PositionBrowserPage({ onSelectPosition }: PositionBrowserPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // 'all', 'soe-tech', 'soe-finance', 'internet-tech', 'internet-product'
  const [positions, setPositions] = useState<Position[]>(MOCK_POSITIONS);

  useEffect(() => {
    async function loadPositions() {
      try {
        const data = await getPositions();
        setPositions(data);
      } catch (e) {
        console.error("Failed to fetch positions from Firestore:", e);
      }
    }
    loadPositions();
  }, []);

  const categories = useMemo(() => {
    const soeTechCount = positions.filter(p => p.type === 'state-owned' && (p.title.includes('工程') || p.title.includes('研发') || p.title.includes('技术') || p.title.includes('IT') || p.title.includes('数字化') || p.title.includes('安全') || p.title.includes('勘探') || p.title.includes('系统') || p.title.includes('开发'))).length;
    const soeFinanceCount = positions.filter(p => p.type === 'state-owned' && !(p.title.includes('工程') || p.title.includes('研发') || p.title.includes('技术') || p.title.includes('IT') || p.title.includes('数字化') || p.title.includes('安全') || p.title.includes('勘探') || p.title.includes('系统') || p.title.includes('开发'))).length;
    const internetTechCount = positions.filter(p => p.type === 'internet' && (p.title.includes('开发') || p.title.includes('算法') || p.title.includes('技术') || p.title.includes('测试') || p.title.includes('设计') || p.title.includes('UI') || p.title.includes('研发'))).length;
    const internetProductCount = positions.filter(p => p.type === 'internet' && !(p.title.includes('开发') || p.title.includes('算法') || p.title.includes('技术') || p.title.includes('测试') || p.title.includes('设计') || p.title.includes('UI') || p.title.includes('研发'))).length;

    return [
      { id: 'all', label: `📂 全部岗位 (${positions.length})`, count: positions.length },
      {
        group: '🏛️ 央企/国企/事业单位',
        items: [
          { id: 'soe-tech', label: '工程技术科室', count: soeTechCount },
          { id: 'soe-finance', label: '金融与数字化', count: soeFinanceCount },
        ]
      },
      {
        group: '💻 互联网大厂板块',
        items: [
          { id: 'internet-tech', label: '核心技术研发', count: internetTechCount },
          { id: 'internet-product', label: '产品与商业化', count: internetProductCount },
        ]
      }
    ];
  }, [positions]);

  // Filtering Logic
  const filteredPositions = useMemo(() => {
    let list = [...positions];

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.company.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Category Filter
    if (selectedCategory === 'soe-tech') {
      list = list.filter((p) => p.type === 'state-owned' && (p.title.includes('工程') || p.title.includes('研发') || p.title.includes('技术') || p.title.includes('IT') || p.title.includes('数字化') || p.title.includes('安全') || p.title.includes('勘探') || p.title.includes('系统') || p.title.includes('开发')));
    } else if (selectedCategory === 'soe-finance') {
      list = list.filter((p) => p.type === 'state-owned' && !(p.title.includes('工程') || p.title.includes('研发') || p.title.includes('技术') || p.title.includes('IT') || p.title.includes('数字化') || p.title.includes('安全') || p.title.includes('勘探') || p.title.includes('系统') || p.title.includes('开发')));
    } else if (selectedCategory === 'internet-tech') {
      list = list.filter((p) => p.type === 'internet' && (p.title.includes('开发') || p.title.includes('算法') || p.title.includes('技术') || p.title.includes('测试') || p.title.includes('设计') || p.title.includes('UI') || p.title.includes('研发')));
    } else if (selectedCategory === 'internet-product') {
      list = list.filter((p) => p.type === 'internet' && !(p.title.includes('开发') || p.title.includes('算法') || p.title.includes('技术') || p.title.includes('测试') || p.title.includes('设计') || p.title.includes('UI') || p.title.includes('研发')));
    }

    return list;
  }, [searchQuery, selectedCategory, positions]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Search bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-slate-900">
            「精准职达」岗位数据库
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">深度剖析100+家企事业单位和高科技大厂的热门科室岗位说明</p>
        </div>
        <div className="relative w-full sm:w-72">
          <input
            id="browser-search-input"
            type="text"
            placeholder="搜索岗位、公司、城市或福利标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none shadow-2xs font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Tree sidebar (Desktop) */}
        <div className="hidden lg:block space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">岗位分类导航</h3>
            <div className="space-y-4">
              {categories.map((cat, idx) => {
                if ('items' in cat) {
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wide">
                        {cat.group}
                      </div>
                      {cat.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedCategory(item.id)}
                          className={`w-full text-left px-3 py-2 text-xs rounded-lg font-semibold transition-colors cursor-pointer flex justify-between items-center ${
                            selectedCategory === item.id
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <span>{item.label}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md font-mono">
                            {item.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                } else {
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full text-left px-3 py-2.5 text-xs rounded-lg font-bold transition-colors cursor-pointer flex justify-between items-center ${
                        selectedCategory === cat.id
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        selectedCategory === cat.id ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {cat.count}
                      </span>
                    </button>
                  );
                }
              })}
            </div>
          </div>
        </div>

        {/* Mobile Category Dropdown Select */}
        <div className="block lg:hidden w-full mb-2">
          <label className="block text-xs font-bold text-slate-500 mb-1.5">筛选分类：</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">📂 全部岗位 ({positions.length})</option>
            <option value="soe-tech">🏛️ 央国企 - 工程技术科室</option>
            <option value="soe-finance">🏛️ 央国企 - 金融与数字化科室</option>
            <option value="internet-tech">💻 互联网 - 核心技术研发</option>
            <option value="internet-product">💻 互联网 - 产品与商业化</option>
          </select>
        </div>

        {/* Right Cards list */}
        <div className="lg:col-span-3 space-y-4">
          {filteredPositions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredPositions.map((pos) => (
                <div
                  key={pos.id}
                  onClick={() => onSelectPosition(pos.id)}
                  className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-400 font-display">
                        {pos.company}
                      </span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        pos.type === 'state-owned' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {pos.type === 'state-owned' ? '国企' : '大厂'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {pos.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {pos.summary}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="font-bold text-amber-600">{pos.salaryRange}</span>
                    <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      解析职位 <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-2xs">
              <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h4 className="text-sm font-bold text-slate-700">未找到匹配的岗位</h4>
              <p className="text-xs text-slate-400 mt-1">您可以试着清空搜索词，或者点击左侧其他大分类栏。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
