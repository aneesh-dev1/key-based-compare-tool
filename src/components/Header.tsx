import React from 'react';
import { Database, Cpu, HardDrive, Layers, ExternalLink, HelpCircle } from 'lucide-react';

interface HeaderProps {
  onOpenArchitectureModal: () => void;
  datasetACount?: number;
  datasetBCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenArchitectureModal,
  datasetACount,
  datasetBCount,
}) => {
  return (
    <header className="bg-[#002D62] border-b border-[#183A66] text-white sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left branding */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#00A8CB]/15 border border-[#00A8CB]/40 flex items-center justify-center text-[#00A8CB] shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-semibold text-white tracking-tight">
                Key-Based Dataset Comparator
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#00A8CB]/20 text-[#00A8CB] border border-[#00A8CB]/40">
                10M × 2,000 Cols
              </span>
            </div>
            <p className="text-xs text-[#B5C6DE] font-mono hidden sm:block">
              Out-of-core streaming engine • 32 GB RAM Safe • CSV / Parquet / Excel
            </p>
          </div>
        </div>

        {/* Right metrics & architecture launcher */}
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#07172C]/80 border border-[#183A66] text-xs">
            <Cpu className="w-3.5 h-3.5 text-[#00A8CB]" />
            <span className="text-[#94A3B8]">RAM Budget:</span>
            <span className="font-semibold text-white font-mono">32 GB</span>
            <span className="text-[#183A66]">|</span>
            <HardDrive className="w-3.5 h-3.5 text-[#FAD702]" />
            <span className="text-[#94A3B8]">Spill:</span>
            <span className="text-[#FAD702] font-mono font-semibold">64 Shards</span>
          </div>

          <button
            onClick={onOpenArchitectureModal}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#00A8CB] hover:bg-[#0091AF] text-[#002D62] text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="View 32GB RAM capacity math and memory allocation breakdown"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>32GB RAM Architecture</span>
          </button>
        </div>
      </div>
    </header>
  );
};
