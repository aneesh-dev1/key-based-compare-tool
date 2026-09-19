import React, { useState } from 'react';
import { Terminal, Copy, Check, Download, FileCode, Cpu, ShieldCheck, Sparkles } from 'lucide-react';
import { CompareConfig } from '../types';
import {
  generateDuckDbScript,
  generatePolarsScript,
  generatePyArrowScript,
  generateSyntheticDataScript,
} from '../utils/scriptGenerators';

interface ProductionCodeExportProps {
  config: CompareConfig;
  fileAName?: string;
  fileBName?: string;
}

export const ProductionCodeExport: React.FC<ProductionCodeExportProps> = ({
  config,
  fileAName = 'source_dataset.parquet',
  fileBName = 'target_dataset.parquet',
}) => {
  const [activeEngine, setActiveEngine] = useState<'duckdb' | 'polars' | 'pyarrow' | 'generator'>('duckdb');
  const [copied, setCopied] = useState(false);

  const getActiveScript = () => {
    switch (activeEngine) {
      case 'duckdb':
        return generateDuckDbScript(config, fileAName, fileBName);
      case 'polars':
        return generatePolarsScript(config, fileAName, fileBName);
      case 'pyarrow':
        return generatePyArrowScript(config, fileAName, fileBName);
      case 'generator':
        return generateSyntheticDataScript(100000, 2000);
    }
  };

  const currentScript = getActiveScript();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename =
      activeEngine === 'generator'
        ? 'generate_synthetic_100k_2000col.py'
        : `${activeEngine}_comparator_32gb.py`;
    const blob = new Blob([currentScript], { type: 'text/x-python;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#0C2340] rounded-xl border border-[#183A66] p-4 shadow-md space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#183A66] pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-[#00A8CB]" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Production 10M × 2,000 Col Deployment Scripts (32GB RAM Rig)
            </h3>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">
            Download or copy optimized scripts with memory limits and spill partitions for your workstation.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-[#07172C] hover:bg-[#102C52] border border-[#183A66] text-xs font-medium text-slate-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#00A8CB]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Script'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-lg bg-[#00A8CB] hover:bg-[#0091AF] text-[#002D62] text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .py</span>
          </button>
        </div>
      </div>

      {/* Engine Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#183A66] pb-2">
        <button
          onClick={() => setActiveEngine('duckdb')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeEngine === 'duckdb'
              ? 'bg-[#002D62] text-[#00A8CB] border border-[#00A8CB] font-bold'
              : 'bg-[#07172C] text-[#94A3B8] hover:text-white border border-[#183A66]'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>DuckDB Out-of-Core (Recommended)</span>
        </button>

        <button
          onClick={() => setActiveEngine('polars')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeEngine === 'polars'
              ? 'bg-[#002D62] text-[#00A8CB] border border-[#00A8CB] font-bold'
              : 'bg-[#07172C] text-[#94A3B8] hover:text-white border border-[#183A66]'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Polars Lazy Streaming</span>
        </button>

        <button
          onClick={() => setActiveEngine('pyarrow')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeEngine === 'pyarrow'
              ? 'bg-[#002D62] text-[#00A8CB] border border-[#00A8CB] font-bold'
              : 'bg-[#07172C] text-[#94A3B8] hover:text-white border border-[#183A66]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>PyArrow + XXHash64 Batching</span>
        </button>

        <button
          onClick={() => setActiveEngine('generator')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer ${
            activeEngine === 'generator'
              ? 'bg-[#002D62] text-[#FAD702] border border-[#FAD702] font-bold'
              : 'bg-[#07172C] text-[#94A3B8] hover:text-white border border-[#183A66]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>100K × 2,000 Col Parquet Generator (.py)</span>
        </button>
      </div>

      {/* Code Viewer */}
      <div className="relative rounded-lg overflow-hidden border border-[#183A66] bg-[#07172C]">
        <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-96 leading-relaxed">
          <code>{currentScript}</code>
        </pre>
      </div>

      {/* Terminal Setup Command Hint */}
      <div className="p-2.5 rounded-lg bg-[#07172C] border border-[#183A66] flex items-center justify-between text-xs font-mono">
        <span className="text-[#94A3B8]">
          Install dependencies:{' '}
          <code className="text-[#00A8CB] font-bold">pip install duckdb polars pyarrow xxhash</code>
        </span>
        <span className="text-slate-500 hidden sm:block">Tested for Python 3.10+ / Linux & macOS</span>
      </div>
    </div>
  );
};
