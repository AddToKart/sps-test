export default function Reports() {
  const generateReport = async (type: string) => {
    // Generate different types of reports
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportCard 
          title="Collection Summary"
          description="Generate collection summary report"
          onClick={() => generateReport('collection')}
        />
        <ReportCard 
          title="Student Payment History"
          description="Generate detailed payment history"
          onClick={() => generateReport('history')}
        />
        <ReportCard 
          title="Outstanding Balances"
          description="Generate outstanding balances report"
          onClick={() => generateReport('outstanding')}
        />
      </div>
    </div>
  );
} 