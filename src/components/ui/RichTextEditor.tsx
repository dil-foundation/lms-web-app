import { useRef, useMemo, useCallback, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'sonner';
import { Paperclip } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ReactDOM from 'react-dom';

// Custom Icons
const icons = Quill.import('ui/icons');
icons['file'] = `<svg viewbox="0 0 18 18">
  <line class="ql-stroke" x1="14" x2="4" y1="13" y2="13"></line>
  <line class="ql-stroke" x1="14" x2="4" y1="13" y2="13"></line>
  <path class="ql-stroke" d="M12,1H6A2,2,0,0,0,4,3V15a2,2,0,0,0,2,2h6a2,2,0,0,0,2-2V3A2,2,0,0,0,12,1Z"></path>
  <polyline class="ql-stroke" points="14 13 4 13 4 12"></polyline>
</svg>`;


interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  onImageUpload?: (file: File) => Promise<string>;
  onFileUpload?: (file: File) => Promise<string>;
}

export const RichTextEditor = ({ value, onChange, onBlur, placeholder, className, onImageUpload, onFileUpload }: RichTextEditorProps) => {
  const quillRef = useRef<ReactQuill>(null);

  useEffect(() => {
    if (quillRef.current) {
      const toolbar = quillRef.current.getEditor().getModule('toolbar');
      const imageButton = toolbar.container.querySelector('.ql-image');
      const fileButton = toolbar.container.querySelector('.ql-file');

      if (imageButton) {
        imageButton.setAttribute('title', 'Max 20MB');
      }
      if (fileButton) {
        fileButton.setAttribute('title', 'Max 50MB');
      }
    }
  }, []);

  const imageHandler = useCallback(async () => {
    if (!quillRef.current || !onImageUpload) {
      console.warn("Image upload handler not provided.");
      return;
    }
    const editor = quillRef.current.getEditor();

    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        const range = editor.getSelection(true) || { index: 0, length: 0 };
        try {
          editor.insertText(range.index, `[Uploading ${file.name}...]`);
          const imageUrl = await onImageUpload(file);
          editor.deleteText(range.index, `[Uploading ${file.name}...]`.length);
          editor.insertEmbed(range.index, 'image', imageUrl);
          editor.setSelection(range.index + 1, 0);
        } catch (error) {
          console.error("Image upload failed:", error);
          editor.deleteText(range.index, `[Uploading ${file.name}...]`.length);
          toast.error("Image upload failed.");
        }
      }
    };
    
    input.click();
  }, [onImageUpload]);

  const fileHandler = useCallback(async () => {
    if (!quillRef.current || !onFileUpload) {
      console.warn("File upload handler not provided.");
      return;
    }
    const editor = quillRef.current.getEditor();
    
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', '.pdf, .doc, .docx, .xls, .xlsx, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        const range = editor.getSelection(true) || { index: 0, length: 0 };
        try {
          editor.insertText(range.index, `[Uploading ${file.name}...]`);
          const fileUrl = await onFileUpload(file);
          editor.deleteText(range.index, `[Uploading ${file.name}...]`.length);
          editor.insertText(range.index, file.name, 'link', fileUrl);
          editor.formatText(range.index, file.name.length, 'link', fileUrl);
          editor.setSelection(range.index + file.name.length, 0);
        } catch (error) {
          console.error("File upload failed:", error);
          editor.deleteText(range.index, `[Uploading ${file.name}...]`.length);
          toast.error("File upload failed.");
        }
      }
    };
    input.click();
  }, [onFileUpload]);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'font': [] }],
        [{ 'align': [] }],
        ['link', 'image', 'file'],
        ['clean']
      ],
      handlers: {
        'image': imageHandler,
        'file': fileHandler
      }
    },
  }), [imageHandler, fileHandler]);

  return (
    <TooltipProvider>
      <div className={className}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          modules={modules}
          placeholder={placeholder}
          className="bg-background"
        />
      </div>
    </TooltipProvider>
  );
}; 