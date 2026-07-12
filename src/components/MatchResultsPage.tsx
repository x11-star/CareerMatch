import React, { useState, useMemo, useEffect } from 'react';
import { Award, Landmark, Laptop, Briefcase, MapPin, DollarSign, Star, FileDown, Share2, RefreshCw, Filter, ArrowRight, Heart } from 'lucide-react';
import { MOCK_POSITIONS } from '../data';
import { Position, ResumeData, PersonalityResult } from '../types';
import { useAuth } from '../context/AuthContext';
import { getPositions, getFavorites, toggleFavorite } from '../lib/firebaseStore';

interface MatchResultsPageProps {
  onSelectPosition: (id: string) => void;
  onOpenModal: (modalType: 'download' | 'share' | null) => void;
  onRetake: () => void;
  resumeData?: ResumeData;
  personalityResult?: PersonalityResult | null;
}

export default function MatchResultsPage({ onSelectPosition, onOpenModal, onRetake, resumeData, personalityResult }: MatchResultsPageProps) {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'state-owned' | 'internet'>('state-owned');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [salarySort, setSalarySort] = useState<string>('match'); // 'match' or 'salary-high'
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [positions, setPositions] = useState<Position[]>(MOCK_POSITIONS);

  useEffect(() => {
    async function loadData() {
      const dbPositions = await getPositions();
      setPositions(dbPositions);

      if (user) {
        try {
          const dbFavs = await getFavorites(user.uid);
          const favMap: Record<string, boolean> = {};
          dbFavs.forEach((id) => {
            favMap[id] = true;
          });
          setFavorites(favMap);
        } catch (e) {
          console.error("Failed to load favorites", e);
        }
      }
    }
    loadData();
  }, [user]);

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFavNow = !favorites[id];
    setFavorites({ ...favorites, [id]: isFavNow });
    if (user) {
      try {
        await toggleFavorite(user.uid, id);
      } catch (err) {
        console.error("Failed to toggle favorite in Firestore", err);
      }
    }
  };

  // Filter & Sort Positions
  const filteredPositions = useMemo(() => {
    let list = positions.filter((p) => p.type === activeTab);

    // City Filter
    if (cityFilter !== 'all') {
      list = list.filter((p) => p.city.includes(cityFilter));
    }

    // Sort
    if (salarySort === 'match') {
      list.sort((a, b) => b.overallMatch - a.overallMatch);
    } else if (salarySort === 'salary-high') {
      const getSalaryHigh = (range: string) => {
        const matches = range.match(/(\d+)-(\d+)万/);
        return matches ? parseInt(matches[2], 10) : 0;
      };
      list.sort((a, b) => getSalaryHigh(b.salaryRange) - getSalaryHigh(a.salaryRange));
    }

    return list;
  }, [positions, activeTab, cityFilter, salarySort]);

  const displayName = resumeData?.name || userProfile?.name || '求职学子';
  const displayMajor = resumeData?.major || userProfile?.major || '计算机科学与技术';
  const displayPersonality = personalityResult?.typeTitle || '尽责稳定型';
  const displayCities = resumeData?.targetCities?.join('、') || '北京、上海、杭州、南京';
  const displayDirection = resumeData?.inferredDirection || '互联网开发工程 / 央企数字化中心';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-24">
      {/* Profile Overview Card */}
      <div className="bg-linear-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-md mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-full text-blue-100 uppercase tracking-wider">
              🎓 大学生双引擎求职模型
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-display mt-2">
              {displayName} · {displayMajor} · <span className="text-yellow-300">{displayPersonality}</span>
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 mt-1.5 leading-relaxed">
              📍 意向城市：{displayCities} &nbsp;|&nbsp; 🎯 AI推荐方向：{displayDirection}
            </p>
          </div>
          <button
            onClick={onRetake}
            className="text-xs bg-white text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors font-bold cursor-pointer"
          >
            编辑意向偏好
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 bg-slate-100/50 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('state-owned')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'state-owned'
              ? 'bg-white text-purple-700 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Landmark className="w-4 h-4" />
          🏛️ 央国企岗位推荐 (已拆解16个)
        </button>
        <button
          onClick={() => setActiveTab('internet')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === 'internet'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Laptop className="w-4 h-4" />
          💻 互联网大厂推荐 (已拆解17个)
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-2.5 text-sm">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-bold text-slate-700">快速过滤：</span>
          <div className="flex items-center gap-1.5">
            {['all', '北京', '上海', '南京', '杭州'].map((city) => (
              <button
                key={city}
                onClick={() => setCityFilter(city)}
                className={`px-2.5 py-1 text-xs rounded-md transition-all font-medium cursor-pointer ${
                  cityFilter === city
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {city === 'all' ? '全部城市' : city}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs text-slate-400 font-medium">排序:</span>
          <select
            value={salarySort}
            onChange={(e) => setSalarySort(e.target.value)}
            className="border border-slate-200 bg-slate-50/50 text-slate-700 rounded-lg p-1.5 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="match">按双向匹配度</option>
            <option value="salary-high">最高薪资排序</option>
          </select>
        </div>
      </div>

      {/* Job cards List */}
      <div className="space-y-4">
        {filteredPositions.length > 0 ? (
          filteredPositions.map((pos) => {
            const isFav = !!favorites[pos.id];
            return (
              <div
                key={pos.id}
                onClick={() => onSelectPosition(pos.id)}
                className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 group relative"
              >
                {/* Header info */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      🔥 匹配度 {pos.overallMatch}%
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      pos.type === 'state-owned' 
                        ? 'bg-purple-100 text-purple-700 border border-purple-200/40' 
                        : 'bg-blue-100 text-blue-700 border border-blue-200/40'
                    }`}>
                      {pos.type === 'state-owned' ? '央国企' : '互联网大厂'}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleToggleFavorite(pos.id, e)}
                    className={`p-1.5 rounded-full border transition-colors ${
                      isFav 
                        ? 'bg-red-50 border-red-200 text-red-500' 
                        : 'border-slate-100 hover:bg-slate-50 text-slate-400'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500' : ''}`} />
                  </button>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {pos.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {pos.company} · <span className="text-slate-600">{pos.city}</span>
                </p>

                {/* Progress bars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                      <span>简历匹配度</span>
                      <span>{pos.resumeMatch}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${pos.resumeMatch}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                      <span>性格模型适配度</span>
                      <span>{pos.personalityMatch}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${pos.personalityMatch}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tag lines */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 mr-2 flex items-center text-sm text-amber-600">
                      <DollarSign className="w-3.5 h-3.5 shrink-0 -mr-0.5" />
                      {pos.salaryRange}
                    </span>
                    <div className="flex items-center gap-0.5 text-amber-400 mr-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < pos.difficultyRating ? 'fill-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                    {pos.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <span className="text-xs text-blue-600 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    查看详情 <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h4 className="text-base font-bold text-slate-700">未找到符合当前筛选条件的岗位</h4>
            <p className="text-xs text-slate-400 mt-1">您可以试着切换分类标签或重置城市过滤条件。</p>
          </div>
        )}
      </div>

      {/* Floating Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 shadow-lg flex items-center">
        <div className="max-w-5xl mx-auto w-full px-4 flex justify-between items-center">
          <div className="text-xs text-slate-500 hidden sm:block">
            已成功匹配 <span className="font-bold text-blue-600">6个</span> 专属优质方向
          </div>
          <div className="flex gap-3 w-full sm:w-auto justify-end">
            <button
              id="results-download-report-btn"
              onClick={() => onOpenModal('download')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              下载完整PDF匹配报告
            </button>
            <button
              id="results-share-btn"
              onClick={() => onOpenModal('share')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              分享
            </button>
            <button
              id="results-retake-btn"
              onClick={onRetake}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              重新匹配测评
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
