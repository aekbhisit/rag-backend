'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '../../../../../components/Button';
import { Input } from '../../../../../components/ui/Input';
import { Textarea } from '../../../../../components/ui/Textarea';
import { Label } from '../../../../../components/ui/Label';
import { Card, CardBody, CardHeader } from '../../../../../components/Card';
import { Badge } from '../../../../../components/ui/Badge';
import { Switch } from '../../../../../components/ui/Switch';
// Using inline SVG icons (consistent with other admin pages)
// Using alert for notifications (consistent with other admin pages)

interface NavigationPage {
  id: string;
  agent_key: string;
  page_slug: string;
  title: string;
  description?: string;
  keywords: string[];
  examples: string[];
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function NavigationPagesPage() {
  const params = useParams();
  const router = useRouter();
  const agentKey = params.agentKey as string;
  
  const [pages, setPages] = useState<NavigationPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<NavigationPage>>({
    page_slug: '',
    title: '',
    description: '',
    keywords: [],
    examples: [],
    priority: 0.5,
    is_active: true,
  });

  useEffect(() => {
    fetchPages();
  }, [agentKey]);

  const fetchPages = async () => {
    try {
      const response = await fetch(`/api/admin/navigation-pages/${agentKey}`);
      if (response.ok) {
        const data = await response.json();
        setPages(data);
      } else {
        alert('Failed to fetch navigation pages');
      }
    } catch (error) {
      alert('Error fetching navigation pages');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/admin/navigation-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          agent_key: agentKey,
        }),
      });

      if (response.ok) {
        const newPage = await response.json();
        setPages([...pages, newPage]);
        setIsCreating(false);
        resetForm();
        alert('Navigation page created successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create navigation page');
      }
    } catch (error) {
      alert('Error creating navigation page');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/navigation-pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updatedPage = await response.json();
        setPages(pages.map(p => p.id === id ? updatedPage : p));
        setEditingId(null);
        resetForm();
        alert('Navigation page updated successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update navigation page');
      }
    } catch (error) {
      alert('Error updating navigation page');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this navigation page?')) return;

    try {
      const response = await fetch(`/api/admin/navigation-pages/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPages(pages.filter(p => p.id !== id));
        toast.success('Navigation page deleted successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete navigation page');
      }
    } catch (error) {
      toast.error('Error deleting navigation page');
    }
  };

  const startEdit = (page: NavigationPage) => {
    setEditingId(page.id);
    setFormData({
      page_slug: page.page_slug,
      title: page.title,
      description: page.description || '',
      keywords: [...page.keywords],
      examples: [...page.examples],
      priority: page.priority,
      is_active: page.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      page_slug: '',
      title: '',
      description: '',
      keywords: [],
      examples: [],
      priority: 0.5,
      is_active: true,
    });
  };

  const addKeyword = () => {
    setFormData(prev => ({
      ...prev,
      keywords: [...(prev.keywords || []), '']
    }));
  };

  const updateKeyword = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords?.map((k, i) => i === index ? value : k) || []
    }));
  };

  const removeKeyword = (index: number) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords?.filter((_, i) => i !== index) || []
    }));
  };

  const addExample = () => {
    setFormData(prev => ({
      ...prev,
      examples: [...(prev.examples || []), '']
    }));
  };

  const updateExample = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      examples: prev.examples?.map((e, i) => i === index ? value : e) || []
    }));
  };

  const removeExample = (index: number) => {
    setFormData(prev => ({
      ...prev,
      examples: prev.examples?.filter((_, i) => i !== index) || []
    }));
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Navigation Pages</h1>
          <p className="text-muted-foreground">Manage navigation pages for {agentKey}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            Back to Agents
          </Button>
          <Button
            onClick={() => setIsCreating(true)}
            disabled={isCreating || editingId !== null}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Page
          </Button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingId) && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">{isCreating ? 'Create' : 'Edit'} Navigation Page</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="page_slug">Page Slug</Label>
                <Input
                  id="page_slug"
                  value={formData.page_slug || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, page_slug: e.target.value }))}
                  placeholder="e.g., taxi, tours, places"
                />
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Taxi & Transfers"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this page"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Keywords</Label>
                <div className="space-y-2">
                  {formData.keywords?.map((keyword, index) => (
                    <div key={`keyword-${index}-${keyword}`} className="flex gap-2">
                      <Input
                        value={keyword}
                        onChange={(e) => updateKeyword(index, e.target.value)}
                        placeholder="Keyword"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeKeyword(index)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addKeyword}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add Keyword
                  </Button>
                </div>
              </div>

              <div>
                <Label>Examples</Label>
                <div className="space-y-2">
                  {formData.examples?.map((example, index) => (
                    <div key={`example-${index}-${example}`} className="flex gap-2">
                      <Input
                        value={example}
                        onChange={(e) => updateExample(index, e.target.value)}
                        placeholder="Example phrase"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeExample(index)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addExample}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add Example
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority (0-1)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.priority || 0.5}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseFloat(e.target.value) }))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => isCreating ? handleCreate() : handleUpdate(editingId!)}
                disabled={!formData.page_slug || !formData.title}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {isCreating ? 'Create' : 'Update'}
              </Button>
              <Button variant="outline" onClick={cancelEdit}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Cancel
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Pages List */}
      <div className="grid gap-4">
        {pages.map((page) => (
          <Card key={page.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {page.title}
                    <Badge variant={page.is_active ? "default" : "secondary"}>
                      {page.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">Priority: {page.priority}</Badge>
                  </h3>
                  <p className="text-sm text-gray-600">
                    /travel/{page.page_slug}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(page)}
                    disabled={isCreating || editingId !== null}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5a2.5 2.5 0 10-3.536-3.536L4 16v4z" /></svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(page.id)}
                    disabled={isCreating || editingId !== null}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {page.description && (
                <p className="text-sm text-muted-foreground mb-3">{page.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-1">
                    {page.keywords.map((keyword, index) => (
                      <Badge key={`page-${page.id}-keyword-${index}-${keyword}`} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Examples</h4>
                  <div className="space-y-1">
                    {page.examples.map((example, index) => (
                      <div key={`page-${page.id}-example-${index}-${example}`} className="text-sm text-muted-foreground">
                        "{example}"
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {pages.length === 0 && !isCreating && (
        <Card>
          <CardBody className="text-center py-8">
            <p className="text-muted-foreground">No navigation pages found for this agent.</p>
            <Button
              className="mt-4"
              onClick={() => setIsCreating(true)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Create First Page
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
