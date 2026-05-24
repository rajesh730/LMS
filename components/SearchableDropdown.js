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
  allowCustom = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = searchable
    ? options.filter((option) =>
        option.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const selectedOption = options.find((opt) => opt.name === value);
  const hasSearchValue = searchTerm.trim().length > 0;

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
          border rounded-lg p-3 cursor-pointer flex justify-between items-center transition-all bg-white text-[#17120a]
          ${
            disabled
              ? "cursor-not-allowed opacity-60"
              : "hover:border-[#2f7fdb]"
          }
          ${error ? "border-red-400" : "border-[#c7d3e4]"}
          ${isOpen ? "border-[#2f7fdb] ring-2 ring-[#2f7fdb]/20" : ""}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex-1 flex items-center">
          {selectedOption ? (
            <div className="flex items-center justify-between w-full">
              <div>
                <span className="text-[#17120a]">{selectedOption.name}</span>
                {showType && selectedOption.type && (
                  <span className="text-[#52657d] text-sm ml-2">
                    ({selectedOption.type})
                  </span>
                )}
                {selectedOption.nepaliName && (
                  <span className="text-[#52657d] text-sm ml-2">
                    - {selectedOption.nepaliName}
                  </span>
                )}
              </div>
              {!disabled && (
                <button
                  onClick={clearSelection}
                  className="text-[#52657d] hover:text-[#0a2f66] ml-2"
                  type="button"
                >
                  <FaTimes className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : value ? (
            <span className="text-[#17120a]">{value}</span>
          ) : (
            <span className="text-[#75869b]">{placeholder}</span>
          )}
        </div>
        <FaChevronDown
          className={`h-4 w-4 text-[#52657d] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 overflow-hidden rounded-lg border border-[#c7d3e4] bg-white shadow-lg shadow-slate-950/10 max-h-64">
          {searchable && (
            <div className="p-3 border-b border-[#d7e5f7]">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#52657d] h-4 w-4" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-[#c7d3e4] bg-white text-[#17120a] placeholder-[#75869b] focus:ring-2 focus:ring-[#2f7fdb]/20 focus:border-[#2f7fdb]"
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
                  className="p-3 hover:bg-[#f8fbff] cursor-pointer transition-colors border-b border-[#eef3fa] last:border-b-0"
                  onClick={() => handleSelect(option.name)}
                >
                  <div className="font-medium text-[#17120a]">{option.name}</div>
                  {showType && option.type && (
                    <div className="text-sm text-[#52657d] mt-1">
                      {option.type}
                    </div>
                  )}
                  {option.nepaliName && (
                    <div className="text-sm text-[#52657d] mt-1">
                      {option.nepaliName}
                    </div>
                  )}
                </div>
              ))
            ) : allowCustom && hasSearchValue ? (
              <button
                type="button"
                className="w-full p-3 text-left text-sm font-semibold text-[#0a2f66] hover:bg-[#f8fbff]"
                onClick={() => handleSelect(searchTerm.trim())}
              >
                Use &quot;{searchTerm.trim()}&quot;
              </button>
            ) : (
              <div className="p-4 text-[#52657d] text-center">
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
