'use client';

import { useState } from 'react';
import { Upload, FileJson, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function CurriculumImporter() {
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleImport = async () => {
    if (!jsonInput.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Validate JSON first
      let parsedData;
      try {
        parsedData = JSON.parse(jsonInput);
      } catch (e) {
        throw new Error('Invalid JSON format. Please check your syntax.');
      }

      // Wrap in object if array provided directly
      const payload = Array.isArray(parsedData) ? { faculties: parsedData } : parsedData;

      const response = await fetch('/api/school/curriculum/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setResult(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sampleData = [
    {
      "name": "BSc CSIT",
      "subjects": [
        { "name": "C Programming", "code": "CSC101", "creditHours": 3 },
        { "name": "Digital Logic", "code": "CSC102", "creditHours": 3 }
      ]
    },
    {
      "name": "BBA",
      "subjects": [
        { "name": "Microeconomics", "code": "ECO201", "creditHours": 3 }
      ]
    }
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 rounded-lg">
          <FileJson className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Curriculum Import</h2>
          <p className="text-sm text-gray-500">Import faculties and subjects in bulk</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste Curriculum JSON
          </label>
          <div className="relative">
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full h-64 p-4 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={`Paste your JSON here...\n\nExample:\n${JSON.stringify(sampleData, null, 2)}`}
            />
            <button
              onClick={() => setJsonInput(JSON.stringify(sampleData, null, 2))}
              className="absolute top-2 right-2 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"
            >
              Load Sample
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Import Failed</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="p-4 bg-green-50 text-green-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-5 h-5" />
              <p className="font-medium">Import Successful</p>
            </div>
            <ul className="text-sm space-y-1 ml-7 list-disc">
              <li>Faculties Created: {result.facultiesCreated}</li>
              <li>Faculties Updated: {result.facultiesUpdated}</li>
              <li>Subjects Linked: {result.subjectsLinked}</li>
              {result.errors.length > 0 && (
                <li className="text-red-600 mt-2">
                  Errors:
                  <ul className="list-disc ml-4">
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </li>
              )}
            </ul>
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={loading || !jsonInput.trim()}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Import Curriculum
            </>
          )}
        </button>
      </div>
    </div>
  );
}
