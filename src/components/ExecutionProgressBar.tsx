import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Activity, Cpu, HardDrive, Clock } from 'lucide-react';
import { ExecutionTelemetry } from '../types';

interface ExecutionProgressBarProps {
  telemetry: ExecutionTelemetry;
}

export const ExecutionProgressBar: React.FC<ExecutionProgressBarProps> = ({ telemetry }) => {
  if (telemetry.stage === 'idle') return null;

  const getStageBadge = () => {
    switch (telemetry.stage) {
      case 'schema_alignment':
        return '1/4: Schema Alignment';
      case 'fingerprinting':
        return '2/4: Pass 1 (Fingerprinting Dataset A)';
      case 'reconciliation':
        return '3/4: Pass 2 (Reconciling Dataset B)';
      case 'diff_isolation':
        return '4/4: Vectorized Diff Isolation';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Error';
      default:
        return 'Processing';
    }
  };

  const isWorking = telemetry.stage !== 'complete' && telemetry.stage !== 'error';

  return (
    <div className="bg-[#0C2340] rounded-xl border border-[#183A66] p-4 shadow-lg space-y-3">
      {/* Top row: Stage title & Progress percentage */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isWorking ? (
            <Loader2 className="w-4 h-4 text-[#00A8CB] animate-spin" />
          ) : telemetry.stage === 'complete' ? (
            <CheckCircle2 className="w-4 h-4 text-[#00A8CB]" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span className="text-xs font-bold text-white tracking-wide uppercase font-mono">
            {getStageBadge()}
          </span>
          <span className="text-xs text-[#94A3B8] font-sans">• {telemetry.stageMessage}</span>
        </div>
        <span className="text-xs font-mono font-bold text-[#00A8CB]">
          {telemetry.progressPct}%
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-[#07172C] rounded-full h-2 overflow-hidden border border-[#183A66]">
        <div
          className={`h-full transition-all duration-300 ${
            telemetry.stage === 'error'
              ? 'bg-rose-500'
              : telemetry.stage === 'complete'
              ? 'bg-[#00A8CB]'
              : 'bg-gradient-to-r from-[#00A8CB] to-[#FAD702]'
          }`}
          style={{ width: `${Math.max(5, telemetry.progressPct)}%` }}
        />
      </div>

      {/* Real-time Telemetry Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
        <div className="flex items-center space-x-1.5 text-[#94A3B8]">
          <Activity className="w-3.5 h-3.5 text-[#00A8CB]" />
          <span>Throughput:</span>
          <span className="text-white font-bold">
            {telemetry.throughputRowsPerSec.toLocaleString()} rows/s
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-[#94A3B8]">
          <Cpu className="w-3.5 h-3.5 text-[#00A8CB]" />
          <span>Active Memory:</span>
          <span className="text-white font-bold">
            {telemetry.estimatedMemoryMB.toLocaleString()} MB{' '}
            <span className="text-[#94A3B8] font-sans text-[10px]">(&lt; 0.2% of 32GB)</span>
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-[#94A3B8]">
          <Clock className="w-3.5 h-3.5 text-[#FAD702]" />
          <span>Elapsed Time:</span>
          <span className="text-white font-bold">
            {(telemetry.elapsedMs / 1000).toFixed(2)}s
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-[#94A3B8]">
          <HardDrive className="w-3.5 h-3.5 text-[#00A8CB]" />
          <span>Spill State:</span>
          <span className="text-[#00A8CB] font-bold">
            {telemetry.spillCount === 0 ? '0 Spills (In-RAM Safe)' : `${telemetry.spillCount} partitions`}
          </span>
        </div>
      </div>
    </div>
  );
};
