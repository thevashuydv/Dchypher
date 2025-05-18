import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import RepoSuggestions from './RepoSuggestions';

const RepositoryForm = ({ onSubmit, isLoading }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [filePath, setFilePath] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic validation
    if (!repoUrl.trim()) {
      setError('Repository URL is required');
      return;
    }

    if (!filePath.trim()) {
      setError('JavaScript file path is required');
      return;
    }

    // Check if URL is a valid GitHub URL
    if (!repoUrl.includes('github.com')) {
      setError('Please enter a valid GitHub repository URL');
      return;
    }

    setError('');
    onSubmit({ repoUrl, filePath });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-gradient">Obfuscation Timeline Explorer</CardTitle>
        <CardDescription>
          Enter a GitHub repository URL and JavaScript file path to analyze the obfuscation timeline.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repoUrl">GitHub Repository URL</Label>
            <Input
              id="repoUrl"
              placeholder="https://github.com/username/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filePath">JavaScript File Path</Label>
            <Input
              id="filePath"
              placeholder="path/to/file.js"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="mt-4 flex justify-center">
            <RepoSuggestions
              onSelectRepo={(repo) => {
                setRepoUrl(repo.url);
                setFilePath(repo.filePath);
              }}
            />
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          variant="default"
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Repository'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RepositoryForm;
