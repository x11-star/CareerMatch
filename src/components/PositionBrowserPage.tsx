import React, { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, ChevronRight, Briefcase, Filter, X, SlidersHorizontal, Layers, GraduationCap, Coins } from 'lucide-react';
import { MOCK_POSITIONS } from '../data';
import { Position } from '../types';
import { getPositions } from '../lib/userDataStore';

interface PositionBrowserPageProps {
  onSelectPosition: (id: string) => void;
}

// Helper to parse salary range like "年薪20-35万" or "月薪15k-25k" into an annual salary (in ten-thousands RMB)
function parseSalaryToAnnual(salaryStr: string): number {
  if (!salaryStr || salaryStr === '面议') return 0;
  
  const match = salaryStr.match(/(\d+)-(\d+)/);
  if (!match) return 0;
  
  const min = parseInt(match[1]);
  const max = parseInt(match[2]);
  const avg = (min + max) / 2;
  
  if (salaryStr.includes('k') || salaryStr.includes('月薪')) {
    // 14 months of package is standard for tech/private
    return (avg * 14) / 10;
  } else if (salaryStr.includes('万')) {
    return avg;
  }
  return 0;
}

export default function PositionBrowserPage({ onSelectPosition }: PositionBrowserPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter States
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [selectedSubIndustry, setSelectedSubIndustry] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedSalary, setSelectedSalary] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  // Pagination State
  const [visibleCount, setVisibleCount] = useState(20);

  // Position database state
  const [positions, setPositions] = useState<Position[]>(MOCK_POSITIONS);

  useEffect(() => {
    async function loadPositions() {
      try {
        const data = await getPositions();
        setPositions(data);
      } catch (e) {
        console.error('Failed to fetch positions:', e);
      }
    }
    loadPositions();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(20);
  }, [
    searchQuery,
    selectedIndustry,
    selectedSubIndustry,
    selectedCategory,
    selectedSubCategory,
    selectedCity,
    selectedSalary,
    selectedDifficulty
  ]);

  // Reset sub-industry when main industry changes
  const handleIndustryChange = (industry: string) => {
    setSelectedIndustry(industry);
    setSelectedSubIndustry('all');
  };

  // Reset sub-category when main category changes
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedSubCategory('all');
  };

  const industries = ['互联网', '央国企', 'AI/科技', '金融/咨询', '半导体/硬件', '快消/零售', '其他'];
  
  const subIndustriesMap: Record<string, string[]> = {
    '互联网': ['电商与本地生活', '社交与文娱', '游戏开发', '工具与SaaS'],
    '央国企': ['能源与电网', '通信与运营商', '基建与地产', '交通与装备制造'],
    'AI/科技': ['大模型与NLP', '计算机视觉', '深度学习与算法', '智能硬件'],
    '金融/咨询': ['商业银行', '证券公司', '咨询与审计', '投资基金'],
    '半导体/硬件': ['芯片与集成电路', '智能硬件与物联网', '整车与新能源'],
    '快消/零售': ['个护美妆', '食品饮料', '时尚零售']
  };

  const categories = ['技术类', '产品类', '职能类', '运营类', '其他'];

  const subCategoriesMap: Record<string, string[]> = {
    '技术类': ['开发 (Java/C++/Go/前端)', '算法与人工智能', '测试与安全'],
    '产品类': ['产品经理', 'AI产品经理', '产品策划/策略'],
    '职能类': ['人力资源', '财务会计', '综合管理/管培生'],
    '运营类': ['新媒体与内容运营', '平台/电商运营', '活动/用户运营']
  };

  const cities = ['北京', '上海', '深圳', '广州', '杭州', '南京', '成都', '西安', '武汉'];

  const subIndustries = selectedIndustry !== 'all' ? subIndustriesMap[selectedIndustry] || [] : [];
  const subCategories = selectedCategory !== 'all' ? subCategoriesMap[selectedCategory] || [] : [];

  // Filter Logic
  const filteredPositions = useMemo(() => {
    let list = [...positions];

    // Search Query (title, company, city, tags, summary)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.company.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(q))) ||
          p.summary.toLowerCase().includes(q)
      );
    }

    // Industry Filter
    if (selectedIndustry !== 'all') {
      list = list.filter((p) => p.industry === selectedIndustry);
      
      // Sub-industry Filter
      if (selectedSubIndustry !== 'all') {
        list = list.filter((p) => p.subIndustry === selectedSubIndustry);
      }
    }

    // Category Filter
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category === selectedCategory);
      
      // Sub-category Filter
      if (selectedSubCategory !== 'all') {
        list = list.filter((p) => p.subCategory === selectedSubCategory);
      }
    }

    // City Filter
    if (selectedCity !== 'all') {
      list = list.filter((p) => p.city === selectedCity);
    }

    // Salary Filter
    if (selectedSalary !== 'all') {
      list = list.filter((p) => {
        const annual = parseSalaryToAnnual(p.salaryRange);
        if (selectedSalary === '10-20') return annual >= 10 && annual < 20;
        if (selectedSalary === '20-30') return annual >= 20 && annual < 30;
        if (selectedSalary === '30-50') return annual >= 30 && annual < 50;
        if (selectedSalary === '50+') return annual >= 50;
        return true;
      });
    }

    // Difficulty Filter
    if (selectedDifficulty !== 'all') {
      list = list.filter((p) => {
        if (selectedDifficulty === '3-') return p.difficultyRating <= 3;
        if (selectedDifficulty === '4') return p.difficultyRating === 4;
        if (selectedDifficulty === '5') return p.difficultyRating === 5;
        return true;
      });
    }

    return list;
  }, [
    searchQuery,
    selectedIndustry,
    selectedSubIndustry,
    selectedCategory,
    selectedSubCategory,
    selectedCity,
    selectedSalary,
    selectedDifficulty,
    positions
  ]);

  // Paginated list
  const paginatedPositions = useMemo(() => {
    return filteredPositions.slice(0, visibleCount);
  }, [filteredPositions, visibleCount]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedIndustry('all');
    setSelectedSubIndustry('all');
    setSelectedCategory('all');
    setSelectedSubCategory('all');
    setSelectedCity('all');
    setSelectedSalary('all');
    setSelectedDifficulty('all');
  };

  const hasActiveFilters = 
    selectedIndustry !== 'all' ||
    selectedSubIndustry !== 'all' ||
    selectedCategory !== 'all' ||
    selectedSubCategory !== 'all' ||
    selectedCity !== 'all' ||
    selectedSalary !== 'all' ||
    selectedDifficulty !== 'all' ||
    searchQuery.trim() !== '';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Title Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-career-ink tracking-tight flex items-center gap-2">
            「精准职达」全量岗位库
            <span className="text-xs bg-career-primary-soft text-career-primary px-2 py-0.5 rounded-full font-bold">
              {positions.length} 岗位在线
            </span>
          </h2>
          <p className="text-xs text-career-muted mt-1">深度解读全国 100+ 企事业单位、大厂、科研院所热门岗位说明书</p>
        </div>
        <div className="relative w-full md:w-80">
          <input
            id="browser-search-input"
            type="text"
            placeholder="搜索岗位名称、公司、标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-career-line focus:border-career-primary rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none shadow-2xs font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </div>
      </div>

      {/* Multi-Dimensional Filters Board */}
      <div className="bg-white border border-career-line rounded-md p-5 mb-8 shadow-2xs space-y-5">
        {/* Row 1: Industry Selection */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-bold text-slate-400 w-16 shrink-0">行业门类：</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleIndustryChange('all')}
                className={`px-3 py-1 text-xs rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedIndustry === 'all'
                    ? 'bg-career-primary text-white shadow-2xs'
                    : 'text-career-muted hover:bg-career-surface-muted'
                }`}
              >
                全部
              </button>
              {industries.map((ind) => (
                <button
                  key={ind}
                  onClick={() => handleIndustryChange(ind)}
                  className={`px-3 py-1 text-xs rounded-lg font-semibold transition-colors cursor-pointer ${
                    selectedIndustry === ind
                      ? 'bg-career-primary text-white shadow-2xs'
                      : 'text-career-muted hover:bg-career-surface-muted'
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          {/* Row 1.5: Fine-grained Sub-industry Filter */}
          {subIndustries.length > 0 && (
            <div className="flex items-center gap-3 pl-16 py-1.5 bg-career-surface-muted rounded-xl mt-1.5 border border-career-line/50">
              <span className="text-[10px] font-bold text-slate-400 shrink-0">细分领域：</span>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setSelectedSubIndustry('all')}
                  className={`px-2.5 py-0.5 text-[11px] rounded-md transition-colors cursor-pointer ${
                    selectedSubIndustry === 'all'
                      ? 'bg-career-primary-soft text-career-primary font-bold'
                      : 'text-career-muted hover:text-slate-800'
                  }`}
                >
                  全部细分
                </button>
                {subIndustries.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubIndustry(sub)}
                    className={`px-2.5 py-0.5 text-[11px] rounded-md transition-colors cursor-pointer ${
                      selectedSubIndustry === sub
                        ? 'bg-career-primary-soft text-career-primary font-bold'
                        : 'text-career-muted hover:text-slate-800'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-career-line" />

        {/* Row 2: Category Selection */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-bold text-slate-400 w-16 shrink-0">职能分类：</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`px-3 py-1 text-xs rounded-lg font-semibold transition-colors cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-career-muted hover:bg-career-surface-muted'
                }`}
              >
                全部
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-3 py-1 text-xs rounded-lg font-semibold transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-career-muted hover:bg-career-surface-muted'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2.5: Fine-grained Sub-category Filter */}
          {subCategories.length > 0 && (
            <div className="flex items-center gap-3 pl-16 py-1.5 bg-career-surface-muted rounded-xl mt-1.5 border border-career-line/50">
              <span className="text-[10px] font-bold text-slate-400 shrink-0">职能细分：</span>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setSelectedSubCategory('all')}
                  className={`px-2.5 py-0.5 text-[11px] rounded-md transition-colors cursor-pointer ${
                    selectedSubCategory === 'all'
                      ? 'bg-purple-100 text-purple-700 font-bold'
                      : 'text-career-muted hover:text-slate-800'
                  }`}
                >
                  全部细分
                </button>
                {subCategories.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubCategory(sub)}
                    className={`px-2.5 py-0.5 text-[11px] rounded-md transition-colors cursor-pointer ${
                      selectedSubCategory === sub
                        ? 'bg-purple-100 text-purple-700 font-bold'
                        : 'text-career-muted hover:text-slate-800'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-career-line" />

        {/* Row 3: More Filter Dimensions (City, Salary, Difficulty) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* City */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> 工作城市
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-career-surface-muted border border-career-line rounded-xl p-2.5 text-xs font-semibold text-career-ink focus:bg-white focus:outline-none transition-all cursor-pointer"
            >
              <option value="all">📍 全部城市</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Salary */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-slate-400" /> 薪资水平
            </label>
            <select
              value={selectedSalary}
              onChange={(e) => setSelectedSalary(e.target.value)}
              className="bg-career-surface-muted border border-career-line rounded-xl p-2.5 text-xs font-semibold text-career-ink focus:bg-white focus:outline-none transition-all cursor-pointer"
            >
              <option value="all">💰 全部薪资</option>
              <option value="10-20">年薪 10-20万</option>
              <option value="20-30">年薪 20-30万</option>
              <option value="30-50">年薪 30-50万</option>
              <option value="50+">年薪 50万以上</option>
            </select>
          </div>

          {/* Difficulty */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" /> 入职门槛 / 难度
            </label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-career-surface-muted border border-career-line rounded-xl p-2.5 text-xs font-semibold text-career-ink focus:bg-white focus:outline-none transition-all cursor-pointer"
            >
              <option value="all">🎓 全部难度</option>
              <option value="3-">三星及以下 (⭐-⭐⭐⭐)</option>
              <option value="4">四星门槛 (⭐⭐⭐⭐)</option>
              <option value="5">五星极难 (⭐⭐⭐⭐⭐)</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Toolbar */}
        {hasActiveFilters && (
          <div className="pt-2 border-t border-dashed border-career-line flex justify-between items-center bg-career-surface-muted -mx-5 -mb-5 p-4 rounded-b-2xl">
            <span className="text-xs text-career-muted font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-career-primary" />
              已启用筛选条件，为您匹配到 <strong className="text-career-primary font-extrabold">{filteredPositions.length}</strong> 个岗位
            </span>
            <button
              onClick={handleClearFilters}
              className="text-xs font-bold text-career-danger hover:text-career-danger transition-colors cursor-pointer flex items-center gap-1 bg-career-danger-soft hover:bg-career-danger-soft px-3 py-1.5 rounded-xl border border-career-danger/30"
            >
              <X className="w-3.5 h-3.5" /> 重置全部筛选
            </button>
          </div>
        )}
      </div>

      {/* Matching Counter Banner */}
      <div className="mb-6 flex justify-between items-center">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          岗位展示列表 ({filteredPositions.length} 个结果)
        </h4>
        <span className="text-xs text-slate-400 font-medium">
          正在显示第 1 - {Math.min(visibleCount, filteredPositions.length)} 个
        </span>
      </div>

      {/* Main Grid List */}
      {paginatedPositions.length > 0 ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedPositions.map((pos) => (
              <div
                key={pos.id}
                onClick={() => onSelectPosition(pos.id)}
                className="bg-white border border-career-line hover:border-career-primary rounded-md p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="text-xs font-extrabold text-slate-400 tracking-tight line-clamp-1">
                      {pos.company}
                    </span>
                    <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                      pos.type === 'state-owned' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-career-primary-soft text-career-primary'
                    }`}>
                      {pos.type === 'state-owned' ? '国企' : '大厂'}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-career-ink group-hover:text-career-primary transition-colors leading-tight line-clamp-1">
                    {pos.title}
                  </h3>
                  
                  {/* Category Pill Tag Display */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    <span className="text-[10px] bg-career-surface-muted text-career-muted font-bold px-2 py-0.5 rounded-md">
                      {pos.industry} / {pos.subIndustry}
                    </span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-md">
                      {pos.subCategory || pos.category}
                    </span>
                  </div>

                  <p className="text-xs text-career-muted mt-3 line-clamp-3 leading-relaxed">
                    {pos.summary}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-career-line flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-amber-600 text-sm">{pos.salaryRange}</span>
                    <span className="text-[10px] text-slate-300 font-mono">|</span>
                    <span className="text-slate-400 font-medium flex items-center gap-0.5">
                      {pos.city}
                    </span>
                  </div>
                  <span className="text-career-primary font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    解析职位 <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Pagination Trigger */}
          {filteredPositions.length > visibleCount && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setVisibleCount((prev) => prev + 20)}
                className="px-8 py-3 bg-career-primary hover:bg-career-primary active:bg-career-primary text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-4 h-4" />
                加载更多优质岗位 (还有 {filteredPositions.length - visibleCount} 个)
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-career-line rounded-md p-16 text-center shadow-2xs">
          <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h4 className="text-sm font-bold text-career-ink">未找到匹配的岗位</h4>
          <p className="text-xs text-slate-400 mt-1 mb-6">您可以试着清空搜索词，或者重置筛选工具重新开始。</p>
          <button
            onClick={handleClearFilters}
            className="px-6 py-2 bg-career-primary-soft text-career-primary border border-career-primary-soft hover:bg-career-primary-soft text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            重置所有筛选条件
          </button>
        </div>
      )}
    </div>
  );
}
