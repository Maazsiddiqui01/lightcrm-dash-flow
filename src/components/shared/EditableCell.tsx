import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EditableFieldConfig } from '@/config/editableColumns';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: any;
  config: EditableFieldConfig;
  onChange: (value: any) => void;
  onCommit: () => void;
  onCancel: () => void;
  editing: boolean;
  onStartEdit: () => void;
  error?: string;
}

export function EditableCell({
  value,
  config,
  onChange,
  onCommit,
  onCancel,
  editing,
  onStartEdit,
  error,
}: EditableCellProps) {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      // Focus the input when editing starts
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        } else if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.select();
        }
      }, 0);
    }
  }, [editing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleCommit = () => {
    onChange(localValue);
    onCommit();
  };

  const handleCancel = () => {
    setLocalValue(value);
    onCancel();
  };

  const displayValue = value === null || value === undefined ? '' : String(value);

  if (!editing) {
    const cellContent = (
      <div
        className={cn(
          "cursor-pointer hover:bg-muted/50 p-2 rounded min-h-[32px] flex items-center",
          error && "border border-destructive"
        )}
        onClick={onStartEdit}
      >
        {config.type === 'boolean' ? (
          <span className={cn(
            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
            value ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
          )}>
            {value ? '✓' : '—'}
          </span>
        ) : (
          <span className={cn(
            "truncate",
            !displayValue && "text-muted-foreground italic"
          )}>
            {displayValue || 'Click to edit'}
          </span>
        )}
      </div>
    );

    if (error) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {cellContent}
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-destructive">{error}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return cellContent;
  }

  const commonProps = {
    onKeyDown: handleKeyDown,
    onBlur: handleCommit,
    className: cn(
      error && "border-destructive focus:border-destructive"
    ),
  };

  switch (config.type) {
    case 'textarea':
      return (
        <Textarea
          ref={textareaRef}
          value={localValue || ''}
          onChange={(e) => setLocalValue(e.target.value)}
          {...commonProps}
          rows={3}
        />
      );

    case 'select':
      return (
        <Select value={localValue || ''} onValueChange={setLocalValue}>
          <SelectTrigger className={cn(error && "border-destructive")}>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">
              <span className="text-muted-foreground">None</span>
            </SelectItem>
            {config.options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'boolean':
      return (
        <div className="flex items-center space-x-2 p-2">
          <Checkbox
            checked={!!localValue}
            onCheckedChange={(checked) => {
              setLocalValue(checked);
              onChange(checked);
              onCommit();
            }}
          />
          <span className="text-sm">
            {localValue ? 'Yes' : 'No'}
          </span>
        </div>
      );

    case 'number':
      return (
        <Input
          ref={inputRef}
          type="number"
          value={localValue || ''}
          onChange={(e) => setLocalValue(e.target.value)}
          {...commonProps}
          className={cn(commonProps.className, "text-right")}
        />
      );

    case 'date':
      return (
        <Input
          ref={inputRef}
          type="date"
          value={localValue || ''}
          onChange={(e) => setLocalValue(e.target.value)}
          {...commonProps}
        />
      );

    default:
      return (
        <Input
          ref={inputRef}
          type={config.type === 'email' ? 'email' : 'text'}
          value={localValue || ''}
          onChange={(e) => setLocalValue(e.target.value)}
          {...commonProps}
        />
      );
  }
}