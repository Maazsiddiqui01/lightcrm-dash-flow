import { SingleSelectDropdown } from "./SingleSelectDropdown";

interface QuarterYearDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

export function QuarterYearDropdown({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  disabled 
}: QuarterYearDropdownProps) {
  // Generate quarter and year options
  const generateOptions = () => {
    const years = [2024, 2025, 2026, 2027, 2028];
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const options: string[] = [];

    years.forEach(year => {
      // Add year-only option for backward compatibility
      options.push(String(year));
      
      // Add quarter + year options
      quarters.forEach(quarter => {
        options.push(`${quarter} ${year}`);
      });
    });

    return options;
  };

  return (
    <SingleSelectDropdown
      label={label}
      options={generateOptions()}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
