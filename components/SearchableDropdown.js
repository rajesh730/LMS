"use client";

import { useState } from "react";
import { FaChevronDown, FaSearch, FaTimes } from "react-icons/fa";

export default function SearchableDropdown({
  options = [],
  value,
  onChange,
  placeholder = "Select option",
  searchable = true,
  disabled = false,
  error = null,
  showType = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = searchable
    ? options.filter((option) =>
        option.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const selectedOption = options.find((opt) => opt.name === value);

  const handleSelect = (optionName) => {
    onChange(optionName);
    setIsOpen(false);
    setSearchTerm("");
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className="relative">
      <div
        className={`
          border rounded-lg p-3 cursor-pointer flex justify-between items-center transition-all
          ${
            disabled
              ? "bg-slate-600 cursor-not-allowed"
              : "bg-slate-700 hover:border-emerald-500"
          }
          ${error ? "border-red-400" : "border-slate-600"}
          ${isOpen ? "border-emerald-500 ring-1 ring-emerald-500" : ""}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex-1 flex items-center">
          {selectedOption ? (
            <div className="flex items-center justify-between w-full">
              <div>
                <span className="text-white">{selectedOption.name}</span>
                {showType && selectedOption.type && (
                  <span className="text-slate-400 text-sm ml-2">
                    ({selectedOption.type})
                  </span>
                )}
                {selectedOption.nepaliName && (
                  <span className="text-slate-400 text-sm ml-2">
                    - {selectedOption.nepaliName}
                  </span>
                )}
              </div>
              {!disabled && (
                <button
                  onClick={clearSelection}
                  className="text-gray-400 hover:text-gray-600 ml-2"
                  type="button"
                >
                  <FaTimes className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        <FaChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-64 overflow-hidden">
          {searchable && (
            <div className="p-3 border-b border-slate-600">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 border border-slate-600 rounded-md bg-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className="p-3 hover:bg-slate-600 cursor-pointer transition-colors border-b border-slate-600 last:border-b-0"
                  onClick={() => handleSelect(option.name)}
                >
                  <div className="font-medium text-white">{option.name}</div>
                  {showType && option.type && (
                    <div className="text-sm text-slate-400 mt-1">
                      {option.type}
                    </div>
                  )}
                  {option.nepaliName && (
                    <div className="text-sm text-slate-400 mt-1">
                      {option.nepaliName}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 text-slate-400 text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
