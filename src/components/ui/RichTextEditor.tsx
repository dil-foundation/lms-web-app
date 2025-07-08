import { useRef, useMemo, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor = ({ value, onChange, onBlur, placeholder, className }: RichTextEditorProps) => {
  const quillRef = useRef<ReactQuill>(null);

  const fileUploadHandler = useCallback(() => {
    if (!quillRef.current) return;

    const editor = quillRef.current.getEditor();
    editor.focus(); // Explicitly focus the editor to prevent errors
    const range = editor.getSelection(true);

    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => {
            editor.insertEmbed(range.index, 'image', reader.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          // For non-image files, we insert a link.
          const fileUrl = URL.createObjectURL(file);
          editor.insertText(range.index, file.name);
          editor.setSelection(range.index, file.name.length);
          editor.format('link', fileUrl);
        }
      }
    };
    
    input.click();
  }, [quillRef]);

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
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        'image': fileUploadHandler
      }
    },
  }), [fileUploadHandler]);

  return (
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
  );
}; 