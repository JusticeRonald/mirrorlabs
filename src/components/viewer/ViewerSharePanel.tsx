import { useState } from 'react';
import { X, Download, Link2, Code, Check, Copy, FileDown, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { RolePermissions } from '@/types/user';

interface ViewerSharePanelProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: RolePermissions;
  projectId: string;
  scanId: string;
}

const ViewerSharePanel = ({ isOpen, onClose, permissions, projectId, scanId }: ViewerSharePanelProps) => {
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/viewer/${projectId}/${scanId}`;
  const embedCode = `<iframe src="${shareUrl}?embed=true" width="800" height="600" frameborder="0" allowfullscreen></iframe>`;

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-xl bg-card border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Share & Export</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <Tabs defaultValue="share" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="share">Share</TabsTrigger>
              <TabsTrigger value="export" disabled={!permissions.canExport}>
                Export
              </TabsTrigger>
            </TabsList>

            {/* Share Tab */}
            <TabsContent value="share" className="space-y-6">
              {/* Share Link */}
              <div className="space-y-2">
                <Label>Share Link</Label>
                <div className="flex gap-2">
                  <Input value={shareUrl} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(shareUrl, 'link')}
                  >
                    {copied === 'link' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Embed Code */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Embed Code
                </Label>
                <div className="relative">
                  <textarea
                    value={embedCode}
                    readOnly
                    className="w-full h-24 p-3 rounded-lg bg-muted font-mono text-xs resize-none"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(embedCode, 'embed')}
                  >
                    {copied === 'embed' ? (
                      <>
                        <Check className="h-3 w-3 mr-1 text-green-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Export Tab */}
            <TabsContent value="export" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Screenshot */}
                <button
                  className="flex flex-col items-center gap-3 p-6 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors"
                  onClick={() => {
                    // TODO: Implement screenshot capture using renderer.domElement.toDataURL()
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Image className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Screenshot</p>
                    <p className="text-xs text-muted-foreground">PNG image</p>
                  </div>
                </button>

                {/* Measurements CSV */}
                <button
                  className="flex flex-col items-center gap-3 p-6 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors"
                  onClick={() => {
                    // TODO: Implement measurements CSV export
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileDown className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Measurements</p>
                    <p className="text-xs text-muted-foreground">CSV format</p>
                  </div>
                </button>

                {/* Full Model */}
                <button
                  className="flex flex-col items-center gap-3 p-6 rounded-lg border border-border bg-muted/50 hover:bg-muted transition-colors col-span-2"
                  onClick={() => {
                    // TODO: Implement model download functionality
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Download className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Download Model</p>
                    <p className="text-xs text-muted-foreground">Full 3D scan with annotations</p>
                  </div>
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ViewerSharePanel;
