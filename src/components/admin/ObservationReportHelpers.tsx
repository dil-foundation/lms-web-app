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
  <div className="space-y-3">
    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">
      {label} {required && <span className="text-red-500">*</span>}
    </Label>
    <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
    <Select value={value} onValueChange={onChange || (() => {})} name={name}>
      <SelectTrigger className={`h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10 ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}`}>
        <SelectValue placeholder="Select rating (1-5)" />
      </SelectTrigger>
      <SelectContent className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
        <SelectItem value="5" className="text-base py-3 hover:bg-primary/5 rounded-xl">5 - Excellent</SelectItem>
        <SelectItem value="4" className="text-base py-3 hover:bg-primary/5 rounded-xl">4 - Good</SelectItem>
        <SelectItem value="3" className="text-base py-3 hover:bg-primary/5 rounded-xl">3 - Satisfactory</SelectItem>
        <SelectItem value="2" className="text-base py-3 hover:bg-primary/5 rounded-xl">2 - Needs Improvement</SelectItem>
        <SelectItem value="1" className="text-base py-3 hover:bg-primary/5 rounded-xl">1 - Poor</SelectItem>
      </SelectContent>
    </Select>
    {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
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
  <div className="space-y-3">
    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">
      {label} {required && <span className="text-red-500">*</span>}
    </Label>
    <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
    <Select value={value} onValueChange={onChange || (() => {})} name={name}>
      <SelectTrigger className={`h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10 ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}`}>
        <SelectValue placeholder="Select option" />
      </SelectTrigger>
      <SelectContent className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
        <SelectItem value="yes" className="text-base py-3 hover:bg-primary/5 rounded-xl">Yes</SelectItem>
        <SelectItem value="no" className="text-base py-3 hover:bg-primary/5 rounded-xl">No</SelectItem>
      </SelectContent>
    </Select>
    {allowComment && onCommentChange && (
      <Textarea 
        placeholder="Optional comment..." 
        className="mt-3 min-h-[100px] text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none" 
        value={commentValue}
        onChange={(e) => onCommentChange(e.target.value)}
      />
    )}
    {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
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
  <div className="space-y-3">
    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">
      {label} {required && <span className="text-red-500">*</span>}
    </Label>
    <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
    <Input 
      placeholder={placeholder} 
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className={`h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10 placeholder:text-gray-400 dark:placeholder:text-gray-500 ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}`}
    />
    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Separate multiple items with commas</p>
    {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
  </div>
); 