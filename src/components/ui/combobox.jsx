// src/components/ui/combobox.jsx
import * as React from "react"

export function Combobox({
  value,
  onChange,
  options,
  displayValue,
  getOptionValue,
  placeholder,
  disabled,
  required
}) {
  const [query, setQuery] = React.useState("")
  const filteredOptions =
    query === ""
      ? options
      : options.filter(option =>
          displayValue(option).toLowerCase().includes(query.toLowerCase())
        )

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full border rounded p-2"
        placeholder={placeholder}
        value={value ? displayValue(value) : query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setQuery("")}
        disabled={disabled}
        required={required}
        autoComplete="off"
      />
      {filteredOptions.length > 0 && query !== "" && (
        <ul className="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-48 overflow-y-auto">
          {filteredOptions.map(option => (
            <li
              key={getOptionValue(option)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onMouseDown={() => {
                onChange(option)
                setQuery("")
              }}
            >
              {displayValue(option)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
