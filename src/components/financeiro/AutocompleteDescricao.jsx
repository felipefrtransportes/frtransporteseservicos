import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Building2 } from "lucide-react";

export default function AutocompleteDescricao({ value, onChange, clientes, prestadores }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current && !inputRef.current.contains(event.target) &&
        suggestionsRef.current && !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateFilteredSuggestions = (input) => {
    const allItems = [
      ...clientes.map(c => ({ ...c, tipo: 'cliente' })),
      ...prestadores.map(p => ({ ...p, tipo: 'prestador' }))
    ];

    if (input.length > 0) {
      return allItems.filter(item => 
        item.nome.toLowerCase().includes(input.toLowerCase())
      );
    }
    
    return allItems;
  };

  const handleInputChange = (e) => {
    const input = e.target.value;
    onChange(input, null, null);

    const filtered = updateFilteredSuggestions(input);
    setFilteredSuggestions(filtered);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    const filtered = updateFilteredSuggestions(value || "");
    setFilteredSuggestions(filtered);
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (item) => {
    onChange(item.nome, item.tipo === 'cliente' ? item.id : null, item.tipo === 'prestador' ? item.id : null);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder="Digite ou clique para selecionar..."
        className="bg-gray-700 border-green-500/30 text-white focus:border-green-500"
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-gray-700 border-2 border-green-500/30 rounded-lg shadow-xl max-h-60 overflow-y-auto"
        >
          {filteredSuggestions.map((item) => (
            <div
              key={`${item.tipo}-${item.id}`}
              className="px-4 py-3 hover:bg-gray-600 cursor-pointer transition-colors flex items-center justify-between"
              onClick={() => handleSelectSuggestion(item)}
            >
              <span className="text-white">{item.nome}</span>
              <Badge variant="outline" className={
                item.tipo === 'cliente' 
                  ? "border-blue-500/30 text-blue-400" 
                  : "border-green-500/30 text-green-400"
              }>
                {item.tipo === 'cliente' ? (
                  <><Building2 className="w-3 h-3 mr-1" /> Cliente</>
                ) : (
                  <><User className="w-3 h-3 mr-1" /> Prestador</>
                )}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}