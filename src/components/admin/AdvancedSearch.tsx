export const AdvancedSearch = () => {
  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input 
          type="text" 
          placeholder="Search by name, email..."
          className="border rounded p-2"
        />
        <select className="border rounded p-2">
          <option value="">Filter by Grade</option>
          {/* Add options */}
        </select>
        <select className="border rounded p-2">
          <option value="">Filter by Payment Status</option>
          {/* Add options */}
        </select>
      </div>
    </div>
  );
}; 