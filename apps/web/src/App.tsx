import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, RefreshCw, Download } from 'lucide-react';

interface JobDetails {
  id: string;
  original_name?: string;
  source_size?: number;
  optimized_size?: number;
  status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  storage_url?: string;
  progress?: number;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState<'webp' | 'mp4'>('webp');
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobDetails | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFormat', targetFormat);

    try {
      const res = await fetch('/api/v1/media/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload');

      setJobId(data.data.jobId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (!jobId || job?.status === 'COMPLETED' || job?.status === 'FAILED') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/media/status/${jobId}`);
        const data = await res.json();
        if (res.ok) {
          setJob(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [jobId, job?.status]);

  const calculateSavings = () => {
    if (!job?.source_size || !job?.optimized_size) return null;
    const diff = Number(job.source_size) - Number(job.optimized_size);
    const pct = Math.round((diff / Number(job.source_size)) * 100);
    return {
      savedBytes: (diff / 1024).toFixed(1),
      percentage: pct
    };
  };

  const savings = calculateSavings();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl bg-slate-800/60 border border-slate-700 backdrop-blur rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">OptiQueue</h1>
          <p className="text-sm text-slate-400">Distributed Media Optimization Engine</p>
        </div>

        <div className="space-y-5">
          <div className="border-2 border-dashed border-slate-600 hover:border-slate-500 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition relative">
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-200">
              {file ? file.name : 'Drag & drop or click to choose a file'}
            </p>
            <p className="text-xs text-slate-400 mt-1">PNG, JPEG, WebP, or MP4 (up to 50MB)</p>
          </div>

          <div className="flex gap-4 items-center">
            <label className="text-sm text-slate-300 font-medium">Output Format:</label>
            <select
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value as 'webp' | 'mp4')}
              className="bg-slate-700 border border-slate-600 text-sm rounded-lg px-3 py-1.5 focus:outline-none"
            >
              <option value="webp">WebP (Images)</option>
              <option value="mp4">MP4 (Video)</option>
            </select>
          </div>

          <button
            onClick={uploadFile}
            disabled={!file || isUploading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
          >
            {isUploading ? 'Dispatching Job...' : 'Compress & Optimize'}
          </button>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800 rounded-lg text-red-300 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {job && (
            <div className="mt-6 border-t border-slate-700 pt-5 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Status</span>
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  {job.status === 'PROCESSING' && <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />}
                  {job.status === 'COMPLETED' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                  {job.status}
                </span>
              </div>

              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${job.progress || (job.status === 'COMPLETED' ? 100 : 10)}%` }}
                />
              </div>

              {job.status === 'COMPLETED' && job.storage_url && (
                <div className="p-4 bg-slate-900/60 border border-slate-700 rounded-lg mt-4 space-y-3">
                  {savings && (
                    <div className="text-xs text-emerald-400 font-medium">
                      Reduced by {savings.percentage}% (saved {savings.savedBytes} KB)
                    </div>
                  )}
                  <a
                    href={job.storage_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2 rounded-lg transition"
                  >
                    <Download className="w-4 h-4" /> Download Transcoded File
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}