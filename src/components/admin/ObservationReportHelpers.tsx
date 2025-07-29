import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export const ScaleRating = ({ 
  label, 
  description, 
  name, 
  value, 
  onChange, 
  error, 
  required = false 
}: {
  label: string;
  description: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
}) => (
  <div className="space-y-2">
    <Label>{label} {required && <span className="text-red-500">*</span>}</Label>
    <p className="text-sm text-muted-foreground">{description}</p>
    <Select value={value} onValueChange={onChange || (() => {})} name={name}>
      <SelectTrigger className={error ? "border-red-500" : ""}>
        <SelectValue placeholder="Select rating (1-5)" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="5">5 - Excellent</SelectItem>
        <SelectItem value="4">4 - Good</SelectItem>
        <SelectItem value="3">3 - Satisfactory</SelectItem>
        <SelectItem value="2">2 - Needs Improvement</SelectItem>
        <SelectItem value="1">1 - Poor</SelectItem>
      </SelectContent>
    </Select>
    {error && <p className="text-sm text-red-500">{error}</p>}
  </div>
);

export const YesNoDropdown = ({ 
  label, 
  description, 
  name, 
  allowComment = false,
  value,
  onChange,
  error,
  required = false,
  commentValue,
  onCommentChange
}: {
  label: string;
  description: string;
  name: string;
  allowComment?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
  commentValue?: string;
  onCommentChange?: (value: string) => void;
}) => (
  <div className="space-y-2">
    <Label>{label} {required && <span className="text-red-500">*</span>}</Label>
    <p className="text-sm text-muted-foreground">{description}</p>
    <Select value={value} onValueChange={onChange || (() => {})} name={name}>
      <SelectTrigger className={error ? "border-red-500" : ""}>
        <SelectValue placeholder="Select option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="yes">Yes</SelectItem>
        <SelectItem value="no">No</SelectItem>
      </SelectContent>
    </Select>
    {allowComment && onCommentChange && (
      <Textarea 
        placeholder="Optional comment..." 
        className="mt-2" 
        value={commentValue}
        onChange={(e) => onCommentChange(e.target.value)}
      />
    )}
    {error && <p className="text-sm text-red-500">{error}</p>}
  </div>
);

export const TagInput = ({ 
  label, 
  description, 
  placeholder, 
  value, 
  onChange, 
  error, 
  required = false 
}: {
  label: string;
  description: string;
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
}) => (
  <div className="space-y-2">
    <Label>{label} {required && <span className="text-red-500">*</span>}</Label>
    <p className="text-sm text-muted-foreground">{description}</p>
    <Input 
      placeholder={placeholder} 
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={error ? "border-red-500" : ""}
    />
    <p className="text-xs text-muted-foreground">Separate multiple items with commas</p>
    {error && <p className="text-sm text-red-500">{error}</p>}
  </div>
); 