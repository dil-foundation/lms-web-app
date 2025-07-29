import { memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Layout, ChevronDown } from 'lucide-react';

const layouts = [
  { id: '/', name: 'Classic Layout', description: 'Traditional hero-first design' },
  { id: '/home-layout-2', name: 'Modern Grid', description: 'Feature-focused grid layout' },
  { id: '/home-layout-3', name: 'Story Flow', description: 'Narrative-driven experience' },
  { id: '/home-layout-4', name: 'Interactive', description: 'Dynamic animated layout' }
];

export const LayoutSwitcher = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const currentLayout = layouts.find(layout => layout.id === location.pathname) || layouts[0];
  const isOnHomePage = layouts.some(layout => layout.id === location.pathname);
  
  if (!isOnHomePage) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Layout className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLayout.name}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {layouts.map((layout) => (
          <DropdownMenuItem
            key={layout.id}
            onClick={() => navigate(layout.id)}
            className={`cursor-pointer ${
              location.pathname === layout.id ? 'bg-primary/10' : ''
            }`}
          >
            <div className="flex flex-col">
              <span className="font-medium">{layout.name}</span>
              <span className="text-xs text-muted-foreground">{layout.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

LayoutSwitcher.displayName = 'LayoutSwitcher';