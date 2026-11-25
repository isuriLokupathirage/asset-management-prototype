import { DownloadIcon, Trash2Icon } from 'lucide-react';
import { SearchInput } from './SearchInput';
import { Button } from './Button';

/** Search on the left; Export Excel and Delete Selected on the right, as on the current list pages. */
export function TableToolbar({
  search,
  onSearch,
  placeholder,
  onExport,
  exportDisabled,
  selectedCount,
  onDeleteSelected,
  children
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  onExport?: () => void;
  exportDisabled?: boolean;
  selectedCount: number;
  onDeleteSelected?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <SearchInput className="w-full sm:w-80" value={search} onChange={onSearch} placeholder={placeholder} />
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {onExport &&
        <Button onClick={onExport} disabled={exportDisabled}><DownloadIcon className="h-4 w-4" />Export Excel</Button>
        }
        {onDeleteSelected &&
        <Button
          onClick={onDeleteSelected}
          disabled={selectedCount === 0}
          className="text-red-600 ring-red-200 hover:bg-red-50 disabled:text-red-300 disabled:ring-red-100">
            <Trash2Icon className="h-4 w-4" />Delete Selected ({selectedCount})
          </Button>
        }
      </div>
    </div>);

}
