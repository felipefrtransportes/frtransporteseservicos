import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

export function CurrencyInput({ value, onValueChange, ...props }) {
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    if (value !== undefined && value !== null && value !== "") {
      const numValue = typeof value === "string" ? parseFloat(value) : value;
      if (!isNaN(numValue)) {
        setDisplayValue(formatCurrency(numValue));
      }
    } else {
      setDisplayValue("");
    }
  }, [value]);

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const handleChange = (e) => {
    const input = e.target.value;
    const numbers = input.replace(/[^\d]/g, '');
    
    if (numbers === "") {
      setDisplayValue("");
      if (onValueChange) onValueChange("");
      return;
    }

    const numValue = parseFloat(numbers) / 100;
    setDisplayValue(formatCurrency(numValue));
    if (onValueChange) onValueChange(numValue.toString());
  };

  const handleBlur = () => {
    if (displayValue && !displayValue.startsWith("R$ ")) {
      setDisplayValue(displayValue ? `R$ ${displayValue}` : "");
    }
  };

  const handleFocus = () => {
    if (displayValue && displayValue.startsWith("R$ ")) {
      setDisplayValue(displayValue.replace("R$ ", ""));
    }
  };

  return (
    <Input
      {...props}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder="R$ 0,00"
    />
  );
}