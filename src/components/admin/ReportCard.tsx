'use client';

interface ReportCardProps {
  title: string;
  description: string;
  onClick: () => void;
}

export default function ReportCard({ title, description, onClick }: ReportCardProps) {
  return (
    <div 
      onClick={onClick}
      className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
    >
      <h3 className="text-lg font-semibold text-[#002147] mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
      <div className="mt-4 flex justify-end">
        <button
          className="inline-flex items-center text-[#4FB3E8] hover:text-[#3a8cbf]"
        >
          Generate Report
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
} 