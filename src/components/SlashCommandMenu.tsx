'use client';

import { Paperclip, Image as ImageIcon } from 'lucide-react';

interface SlashCommandMenuProps {
  onSelectCommand: (command: string) => void;
  onImageUpload: (file: File) => void;
}

export default function SlashCommandMenu({ onSelectCommand, onImageUpload }: SlashCommandMenuProps) {
  const commands = [
    {
      id: 'upload',
      label: 'Add photos & files',
      icon: Paperclip
    },
    {
      id: 'generate',
      label: 'Generate image',
      icon: ImageIcon
    }
  ];

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = false;
    input.accept = 'image/png,image/jpeg,image/jpg,image/webp,image/gif';
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        const file = files[0];
        
        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
          alert('Please upload only image files (PNG, JPG, JPEG, WebP, or GIF)');
          return;
        }
        
        // Check file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
          alert('Image must be under 50MB');
          return;
        }
        onImageUpload(file);
      }
    };
    input.click();
    onSelectCommand('upload');
  };

  const handleCommandClick = (commandId: string) => {
    if (commandId === 'upload') {
      handleFileUpload();
    } else if (commandId === 'generate') {
      onSelectCommand('generate');
    }
  };

  return (
    <div className="absolute bottom-full left-0 mb-1 bg-zinc-900 rounded-xl shadow-2xl overflow-hidden min-w-[180px]">
      {commands.map((command) => {
        const Icon = command.icon;
        return (
          <button
            key={command.id}
            onClick={() => handleCommandClick(command.id)}
            className="w-full px-3 py-2 hover:bg-zinc-800 transition-colors text-left flex items-center gap-2.5 cursor-pointer whitespace-nowrap"
          >
            <Icon className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-white text-xs font-medium">{command.label}</span>
          </button>
        );
      })}
    </div>
  );
}
